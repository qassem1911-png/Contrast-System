import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Wrench, FilePlus2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRealtime } from "@/hooks/useRealtime";

interface CustodyItem {
  custody_item_id: string;
  product_id: string | null;
  printer_id: string | null;
  item_name: string;
  brand_name: string | null;
  model_name: string | null;
  assigned_quantity: number;
  used_quantity: number;
  remaining_quantity: number;
  unit_price: number;
  notes: string | null;
  status: string;
}

const MyCustody = () => {
  const [items, setItems] = useState<CustodyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("my_custody");
    if (error) console.error(error);
    setItems((data ?? []) as CustodyItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useRealtime("my-custody-rt", ["custody_items", "custody_sessions"], () => load());

  const totalRemaining = items.reduce((s, i) => s + i.remaining_quantity, 0);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              <Wrench className="h-7 w-7" />عهدتي
            </h1>
            <p className="text-muted-foreground mt-1">القطع والطابعات المسلّمة إليك حالياً</p>
          </div>
          <Button onClick={() => navigate("/invoices/new")} disabled={items.length === 0}>
            <FilePlus2 className="h-4 w-4 ml-2" />فاتورة صيانة جديدة
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">عدد الأصناف</div>
            <div className="text-2xl font-bold mt-1">{items.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">إجمالي الكمية المتبقية</div>
            <div className="text-2xl font-bold mt-1">{totalRemaining}</div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا توجد عهدة نشطة حالياً</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الصنف</TableHead>
                    <TableHead className="text-right">العلامة / الموديل</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المسلّم</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.custody_item_id}>
                      <TableCell className="font-medium">{it.item_name}</TableCell>
                      <TableCell className="text-sm">{it.brand_name ?? "—"} / {it.model_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{it.printer_id ? "طابعة" : "قطعة"}</Badge>
                      </TableCell>
                      <TableCell>{it.assigned_quantity}</TableCell>
                      <TableCell>{it.used_quantity}</TableCell>
                      <TableCell>
                        <Badge variant={it.remaining_quantity > 0 ? "secondary" : "destructive"}>
                          {it.remaining_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>{Number(it.unit_price).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={it.notes ?? ""}>
                        {it.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MyCustody;
