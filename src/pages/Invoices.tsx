import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, FileText, FilePlus2, Wallet, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRealtime } from "@/hooks/useRealtime";
import { downloadInvoicePdf } from "@/lib/invoicePdf";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  technician_id: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total: number;
  amount_paid: number;
  remaining_amount: number;
  payment_status: "paid" | "partial" | "unpaid";
  created_at: string;
  customers?: { name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  paid: "مدفوعة", partial: "جزئية", unpaid: "غير مدفوعة",
};
const STATUS_VAR: Record<string, "default" | "secondary" | "destructive"> = {
  paid: "default", partial: "secondary", unpaid: "destructive",
};

const Invoices = () => {
  const { isTechnician, isAdmin, isStorekeeper, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [payOpen, setPayOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("*, customers(name)")
      .order("created_at", { ascending: false });
    setInvoices((data ?? []) as Invoice[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useRealtime("invoices-rt", ["invoices", "payments"], () => load());

  const openPay = (inv: Invoice) => {
    setPayInvoice(inv); setPayAmount(String(inv.remaining_amount)); setPayMethod("cash");
    setPayOpen(true);
  };

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast.error("أدخل مبلغًا صحيحًا"); return; }
    setSaving(true);
    const { error } = await supabase.rpc("record_payment", {
      _invoice_id: payInvoice.id, _amount: amt, _method: payMethod,
    });
    setSaving(false);
    if (error) { toast.error("فشل تسجيل الدفعة", { description: error.message }); return; }
    toast.success("تم تسجيل الدفعة");
    setPayOpen(false); load();
  };

  const canCreate = isTechnician || isSuperAdmin;
  const canRecordPayment = isAdmin || isStorekeeper || isSuperAdmin;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              <FileText className="h-7 w-7" />الفواتير
            </h1>
            <p className="text-muted-foreground mt-1">{isTechnician && !isAdmin ? "فواتيرك فقط" : "كل فواتير الشركة"}</p>
          </div>
          {canCreate && (
            <Button onClick={() => navigate("/invoices/new")}>
              <FilePlus2 className="h-4 w-4 ml-2" />فاتورة جديدة
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا توجد فواتير</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right whitespace-nowrap">التاريخ</TableHead>
                    <TableHead className="text-right">الإجمالي قبل الضريبة</TableHead>
                    <TableHead className="text-right">الضريبة</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-right">المدفوع</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell dir="ltr" className="text-right font-mono text-sm whitespace-nowrap">{inv.invoice_number}</TableCell>
                      <TableCell className="font-medium">{inv.customers?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(inv.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>{Number(inv.subtotal ?? inv.total).toLocaleString()}</TableCell>
                      <TableCell>
                        {Number(inv.tax_amount ?? 0) > 0 ? (
                          <span className="text-primary font-medium">
                            {Number(inv.tax_amount).toLocaleString()}
                            <span className="text-xs text-muted-foreground mr-1">
                              ({Math.round(Number(inv.tax_rate) * 100)}%)
                            </span>
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="font-semibold">{Number(inv.total).toLocaleString()}</TableCell>
                      <TableCell>{Number(inv.amount_paid).toLocaleString()}</TableCell>
                      <TableCell>{Number(inv.remaining_amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VAR[inv.payment_status]}>{STATUS_LABEL[inv.payment_status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => downloadInvoicePdf(inv.id)} title="تنزيل PDF">
                            <FileDown className="h-4 w-4" />
                          </Button>
                          {canRecordPayment && inv.payment_status !== "paid" && (
                            <Button size="sm" variant="outline" onClick={() => openPay(inv)}>
                              <Wallet className="h-4 w-4 ml-1" />دفعة
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة — {payInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitPay} className="space-y-3">
            <div className="text-sm text-muted-foreground">
              المتبقي على الفاتورة: <b>{payInvoice?.remaining_amount.toLocaleString()}</b>
            </div>
            <div className="space-y-2">
              <Label>المبلغ *</Label>
              <Input type="number" min={0.01} max={payInvoice?.remaining_amount} step="0.01"
                value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                dir="ltr" className="text-right" required />
            </div>
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="نقدي، تحويل، شيك..." />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Invoices;
