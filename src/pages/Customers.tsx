import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: string;
  notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  company: "شركة",
  individual: "فرد",
  government: "جهة حكومية",
};

const Customers = () => {
  const { isAdmin, isStorekeeper, isSuperAdmin } = useAuth();
  const canEdit = isAdmin || isStorekeeper;
  const canDelete = isSuperAdmin || isAdmin;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<string>("company");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("name");
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setEditing(null); setName(""); setContactPerson(""); setPhone("");
    setEmail(""); setAddress(""); setType("company"); setNotes("");
  };

  const openNew = () => { reset(); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setName(c.name); setContactPerson(c.contact_person ?? "");
    setPhone(c.phone ?? ""); setEmail(c.email ?? "");
    setAddress(c.address ?? ""); setType(c.type); setNotes(c.notes ?? "");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      contact_person: contactPerson.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      type,
      notes: notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    setSaving(false);
    if (error) { toast.error("فشل الحفظ", { description: error.message }); return; }
    toast.success(editing ? "تم تحديث العميل" : "تم إضافة العميل");
    setOpen(false); reset(); load();
  };

  const remove = async (c: Customer) => {
    if (!confirm(`حذف العميل "${c.name}"؟`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) { toast.error("فشل الحذف", { description: error.message }); return; }
    toast.success("تم الحذف");
    load();
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">العملاء</h1>
            <p className="text-muted-foreground mt-1">إدارة قاعدة بيانات العملاء</p>
          </div>
          {canEdit && (
            <Button onClick={openNew}><Plus className="h-4 w-4 ml-2" />عميل جديد</Button>
          )}
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا يوجد عملاء</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">جهة الاتصال</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">البريد</TableHead>
                  {canEdit && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{TYPE_LABELS[c.type] ?? c.type}</Badge></TableCell>
                    <TableCell>{c.contact_person ?? "—"}</TableCell>
                    <TableCell dir="ltr" className="text-right">{c.phone ?? "—"}</TableCell>
                    <TableCell dir="ltr" className="text-right text-sm">{c.email ?? "—"}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button size="icon" variant="ghost" onClick={() => remove(c)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent dir="rtl" className="text-right max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل العميل" : "عميل جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2"><Label>اسم العميل *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">شركة</SelectItem>
                    <SelectItem value="individual">فرد</SelectItem>
                    <SelectItem value="government">جهة حكومية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>جهة الاتصال</Label><Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-right" /></div>
              <div className="space-y-2"><Label>البريد</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right" type="email" /></div>
            </div>
            <div className="space-y-2"><Label>العنوان</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Customers;
