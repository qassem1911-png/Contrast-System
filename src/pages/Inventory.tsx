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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Loader2, Boxes, Printer as PrinterIcon, MoreVertical,
  PackageMinus, PackagePlus, UserCheck, Pencil, Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BrandModelSelect } from "@/components/BrandModelSelect";
import { useRealtime } from "@/hooks/useRealtime";

interface Product {
  id: string; name: string; sku: string | null;
  brand_id: string; model_id: string; category: string;
  quantity: number; unit_price: number; cost_price?: number;
  low_stock_threshold: number;
}
interface Printer {
  id: string; serial_number: string;
  brand_id: string; model_id: string; status: string;
  unit_price: number; cost_price?: number; counter: number;
}
interface Lookup { id: string; name: string }
interface Tech { id: string; arabic_name: string; email: string }

const Inventory = () => {
  const { isAdmin, isStorekeeper, isTechnician, isSuperAdmin } = useAuth();
  const canEdit = isAdmin || isStorekeeper;
  const canDelete = isAdmin || isSuperAdmin;
  const canSeeCost = isAdmin;

  const [products, setProducts] = useState<Product[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [brands, setBrands] = useState<Lookup[]>([]);
  const [models, setModels] = useState<Lookup[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);

  // dialogs
  const [pOpen, setPOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [custodyOpen, setCustodyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // product form
  const [pName, setPName] = useState("");
  const [pSku, setPSku] = useState("");
  const [pCat, setPCat] = useState<"spare_part" | "ink">("spare_part");
  const [pBrand, setPBrand] = useState(""); const [pModel, setPModel] = useState("");
  const [pQty, setPQty] = useState("0");
  const [pPrice, setPPrice] = useState("0");
  const [pCost, setPCost] = useState("0");

  // printer form
  const [prSerial, setPrSerial] = useState("");
  const [prBrand, setPrBrand] = useState(""); const [prModel, setPrModel] = useState("");
  const [prPrice, setPrPrice] = useState("0");
  const [prCost, setPrCost] = useState("0");
  const [prCounter, setPrCounter] = useState("0");

  // adjust form
  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adjType, setAdjType] = useState<"add" | "deduct">("add");
  const [adjQty, setAdjQty] = useState("1");
  const [adjReason, setAdjReason] = useState("");

  // edit & delete state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editPrinter, setEditPrinter] = useState<Printer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "product" | "printer"; id: string; label: string } | null>(null);

  // custody form
  const [cusProduct, setCusProduct] = useState<Product | null>(null);
  const [cusPrinter, setCusPrinter] = useState<Printer | null>(null);
  const [cusTech, setCusTech] = useState("");
  const [cusQty, setCusQty] = useState("1");
  const [cusReason, setCusReason] = useState("");

  const load = async () => {
    setLoading(true);
    // Use the view (no cost) for non-admins; admins can read base table
    const productsTable = canSeeCost ? "products" : "products_safe";
    const printersTable = canSeeCost ? "printers" : "printers_safe";
    const [{ data: prods }, { data: prs }, { data: bs }, { data: ms }] = await Promise.all([
      supabase.from(productsTable as "products").select("*").order("created_at", { ascending: false }),
      supabase.from(printersTable as "printers").select("*").order("created_at", { ascending: false }),
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("models").select("id,name").order("name"),
    ]);
    setProducts((prods ?? []) as unknown as Product[]);
    setPrinters((prs ?? []) as unknown as Printer[]);
    setBrands((bs ?? []) as Lookup[]);
    setModels((ms ?? []) as Lookup[]);
    setLoading(false);
  };

  const loadTechs = async () => {
    const { data: roleRows } = await supabase
      .from("user_roles").select("user_id").eq("role", "technician");
    const ids = (roleRows ?? []).map((r) => r.user_id);
    if (ids.length === 0) { setTechs([]); return; }
    const { data: profs } = await supabase
      .from("profiles").select("id,arabic_name,email").in("id", ids);
    setTechs((profs ?? []) as Tech[]);
  };

  useEffect(() => { load(); loadTechs(); }, []);
  useRealtime("inventory-rt", ["products", "printers"], () => load());

  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "—";
  const modelName = (id: string) => models.find((m) => m.id === id)?.name ?? "—";

  const resetProductForm = () => {
    setEditProduct(null);
    setPName(""); setPSku(""); setPBrand(""); setPModel("");
    setPQty("0"); setPPrice("0"); setPCost("0");
  };
  const resetPrinterForm = () => {
    setEditPrinter(null);
    setPrSerial(""); setPrBrand(""); setPrModel("");
    setPrPrice("0"); setPrCost("0"); setPrCounter("0");
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pBrand || !pModel) { toast.error("اختر العلامة والموديل"); return; }
    setSaving(true);
    const payload = {
      name: pName.trim(), sku: pSku.trim() || null,
      brand_id: pBrand, model_id: pModel, category: pCat,
      quantity: parseInt(pQty) || 0,
      unit_price: parseFloat(pPrice) || 0,
      cost_price: parseFloat(pCost) || 0,
    };
    const { error } = editProduct
      ? await supabase.from("products").update(payload).eq("id", editProduct.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) { toast.error("فشل الحفظ", { description: error.message }); return; }
    toast.success(editProduct ? "تم تحديث المنتج" : "تم إضافة المنتج");
    setPOpen(false); resetProductForm(); load();
  };

  const addPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prBrand || !prModel) { toast.error("اختر العلامة والموديل"); return; }
    setSaving(true);
    const payload = {
      serial_number: prSerial.trim(),
      brand_id: prBrand, model_id: prModel,
      unit_price: parseFloat(prPrice) || 0,
      cost_price: parseFloat(prCost) || 0,
      counter: parseInt(prCounter) || 0,
    };
    const { error } = editPrinter
      ? await supabase.from("printers").update(payload).eq("id", editPrinter.id)
      : await supabase.from("printers").insert(payload);
    setSaving(false);
    if (error) { toast.error("فشل الحفظ", { description: error.message }); return; }
    toast.success(editPrinter ? "تم تحديث الطابعة" : "تمت إضافة الطابعة");
    setPrOpen(false); resetPrinterForm(); load();
  };

  const openAdjust = (p: Product) => {
    setAdjProduct(p); setAdjType("add"); setAdjQty("1"); setAdjReason("");
    setAdjustOpen(true);
  };
  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProduct) return;
    setSaving(true);
    const qty = parseInt(adjQty) || 0;
    const delta = adjType === "add" ? qty : -qty;
    const { error } = await supabase.rpc("adjust_product_stock", {
      _product_id: adjProduct.id, _delta: delta, _reason: adjReason, _type: adjType,
    });
    setSaving(false);
    if (error) { toast.error("فشل التعديل", { description: error.message }); return; }
    toast.success("تم تعديل المخزون");
    setAdjustOpen(false); load();
  };

  const openCustodyForProduct = (p: Product) => {
    setCusProduct(p); setCusPrinter(null); setCusTech(""); setCusQty("1"); setCusReason("");
    setCustodyOpen(true);
  };
  const openCustodyForPrinter = (p: Printer) => {
    setCusPrinter(p); setCusProduct(null); setCusTech(""); setCusQty("1"); setCusReason("");
    setCustodyOpen(true);
  };
  const submitCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cusTech || !cusReason.trim()) { toast.error("اختر الفني واكتب السبب"); return; }
    setSaving(true);
    let error;
    if (cusProduct) {
      ({ error } = await supabase.rpc("assign_custody_product", {
        _technician_id: cusTech, _product_id: cusProduct.id,
        _quantity: parseInt(cusQty) || 1, _reason: cusReason,
      }));
    } else if (cusPrinter) {
      ({ error } = await supabase.rpc("assign_custody_printer", {
        _technician_id: cusTech, _printer_id: cusPrinter.id, _reason: cusReason,
      }));
    }
    setSaving(false);
    if (error) { toast.error("فشل التسليم", { description: error.message }); return; }
    toast.success("تم تسليم العهدة");
    setCustodyOpen(false); load();
  };

  // Edit handlers
  const openEditProduct = (p: Product) => {
    setEditProduct(p);
    setPName(p.name); setPSku(p.sku ?? ""); setPCat((p.category as "spare_part" | "ink") || "spare_part");
    setPBrand(p.brand_id); setPModel(p.model_id);
    setPQty(String(p.quantity)); setPPrice(String(p.unit_price)); setPCost(String(p.cost_price ?? 0));
    setPOpen(true);
  };
  const openEditPrinter = (p: Printer) => {
    setEditPrinter(p);
    setPrSerial(p.serial_number); setPrBrand(p.brand_id); setPrModel(p.model_id);
    setPrPrice(String(p.unit_price)); setPrCost(String(p.cost_price ?? 0)); setPrCounter(String(p.counter ?? 0));
    setPrOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const { error } = await supabase.from(deleteTarget.kind === "product" ? "products" : "printers")
      .delete().eq("id", deleteTarget.id);
    setSaving(false);
    if (error) { toast.error("فشل الحذف", { description: error.message }); return; }
    toast.success("تم الحذف");
    setDeleteTarget(null); load();
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold">المخزون</h1>
          <p className="text-muted-foreground mt-1">
            {isTechnician && !canEdit ? "عرض فقط" : "إدارة قطع الغيار، الأحبار، والطابعات"}
          </p>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products"><Boxes className="h-4 w-4 ml-2" />قطع الغيار / الأحبار</TabsTrigger>
            <TabsTrigger value="printers"><PrinterIcon className="h-4 w-4 ml-2" />الطابعات</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={() => setPOpen(true)}><Plus className="h-4 w-4 ml-2" />منتج جديد</Button>
              </div>
            )}
            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : products.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">لا توجد منتجات</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">العلامة / الموديل</TableHead>
                        <TableHead className="text-right">الفئة</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">سعر البيع</TableHead>
                        {canSeeCost && <TableHead className="text-right">سعر التكلفة</TableHead>}
                        {canEdit && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.name}
                            {p.sku && <div dir="ltr" className="text-xs text-muted-foreground text-right">{p.sku}</div>}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {brandName(p.brand_id)} / {modelName(p.model_id)}
                          </TableCell>
                          <TableCell><Badge variant="outline">{p.category === "ink" ? "حبر" : "قطعة غيار"}</Badge></TableCell>
                          <TableCell>
                            {p.quantity}
                            {p.quantity <= p.low_stock_threshold && (
                              <Badge variant="destructive" className="mr-2 text-[10px]">منخفض</Badge>
                            )}
                          </TableCell>
                          <TableCell>{Number(p.unit_price).toLocaleString()}</TableCell>
                          {canSeeCost && <TableCell>{Number(p.cost_price ?? 0).toLocaleString()}</TableCell>}
                          {canEdit && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditProduct(p)}>
                                    <Pencil className="h-4 w-4 ml-2" />تعديل البيانات
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAdjust(p)}>
                                    <PackagePlus className="h-4 w-4 ml-2" />تعديل المخزون
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openCustodyForProduct(p)}>
                                    <UserCheck className="h-4 w-4 ml-2" />تسليم عهدة
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setDeleteTarget({ kind: "product", id: p.id, label: p.name })}
                                    >
                                      <Trash2 className="h-4 w-4 ml-2" />حذف
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="printers" className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={() => setPrOpen(true)}><Plus className="h-4 w-4 ml-2" />طابعة جديدة</Button>
              </div>
            )}
            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : printers.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">لا توجد طابعات</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الرقم التسلسلي</TableHead>
                        <TableHead className="text-right">العلامة / الموديل</TableHead>
                        <TableHead className="text-right">العدّاد</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">سعر البيع</TableHead>
                        {canSeeCost && <TableHead className="text-right">سعر التكلفة</TableHead>}
                        {canEdit && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {printers.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell dir="ltr" className="text-right font-mono text-sm whitespace-nowrap">{p.serial_number}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{brandName(p.brand_id)} / {modelName(p.model_id)}</TableCell>
                          <TableCell dir="ltr" className="text-right">{Number(p.counter ?? 0).toLocaleString()}</TableCell>
                          <TableCell><Badge variant="secondary">{p.status === "in_stock" ? "في المخزن" : p.status === "assigned" ? "بعهدة فني" : p.status}</Badge></TableCell>
                          <TableCell>{Number(p.unit_price).toLocaleString()}</TableCell>
                          {canSeeCost && <TableCell>{Number(p.cost_price ?? 0).toLocaleString()}</TableCell>}
                          {canEdit && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditPrinter(p)}>
                                    <Pencil className="h-4 w-4 ml-2" />تعديل البيانات
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={p.status !== "in_stock"}
                                    onClick={() => openCustodyForPrinter(p)}
                                  >
                                    <UserCheck className="h-4 w-4 ml-2" />تسليم عهدة
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setDeleteTarget({ kind: "printer", id: p.id, label: p.serial_number })}
                                    >
                                      <Trash2 className="h-4 w-4 ml-2" />حذف
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add product */}
      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent dir="rtl" className="text-right max-w-lg">
          <DialogHeader><DialogTitle>منتج جديد</DialogTitle></DialogHeader>
          <form onSubmit={addProduct} className="space-y-3">
            <div className="space-y-2"><Label>الاسم *</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>SKU</Label><Input value={pSku} onChange={(e) => setPSku(e.target.value)} dir="ltr" className="text-right" /></div>
              <div className="space-y-2">
                <Label>الفئة *</Label>
                <Select value={pCat} onValueChange={(v) => { setPCat(v as typeof pCat); setPBrand(""); setPModel(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spare_part">قطعة غيار</SelectItem>
                    <SelectItem value="ink">حبر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <BrandModelSelect
              type={pCat}
              brandId={pBrand} modelId={pModel}
              onBrandChange={setPBrand} onModelChange={setPModel}
              required
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>الكمية</Label><Input type="number" value={pQty} onChange={(e) => setPQty(e.target.value)} dir="ltr" className="text-right" /></div>
              <div className="space-y-2"><Label>سعر البيع</Label><Input type="number" step="0.01" value={pPrice} onChange={(e) => setPPrice(e.target.value)} dir="ltr" className="text-right" /></div>
              {canSeeCost && (
                <div className="space-y-2"><Label>سعر التكلفة</Label><Input type="number" step="0.01" value={pCost} onChange={(e) => setPCost(e.target.value)} dir="ltr" className="text-right" /></div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add printer */}
      <Dialog open={prOpen} onOpenChange={setPrOpen}>
        <DialogContent dir="rtl" className="text-right max-w-lg">
          <DialogHeader><DialogTitle>طابعة جديدة</DialogTitle></DialogHeader>
          <form onSubmit={addPrinter} className="space-y-3">
            <div className="space-y-2"><Label>الرقم التسلسلي *</Label><Input value={prSerial} onChange={(e) => setPrSerial(e.target.value)} required dir="ltr" className="text-right" /></div>
            <BrandModelSelect
              type="printer"
              brandId={prBrand} modelId={prModel}
              onBrandChange={setPrBrand} onModelChange={setPrModel}
              required
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>العدّاد *</Label><Input type="number" min="0" value={prCounter} onChange={(e) => setPrCounter(e.target.value)} dir="ltr" className="text-right" required /></div>
              <div className="space-y-2"><Label>سعر البيع</Label><Input type="number" step="0.01" value={prPrice} onChange={(e) => setPrPrice(e.target.value)} dir="ltr" className="text-right" /></div>
              {canSeeCost && (
                <div className="space-y-2"><Label>سعر التكلفة</Label><Input type="number" step="0.01" value={prCost} onChange={(e) => setPrCost(e.target.value)} dir="ltr" className="text-right" /></div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPrOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock adjustment */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>تعديل المخزون — {adjProduct?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitAdjust} className="space-y-3">
            <div className="text-sm text-muted-foreground">المخزون الحالي: {adjProduct?.quantity}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>العملية *</Label>
                <Select value={adjType} onValueChange={(v) => setAdjType(v as typeof adjType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">إضافة <PackagePlus className="h-3 w-3 inline mr-1" /></SelectItem>
                    <SelectItem value="deduct">خصم <PackageMinus className="h-3 w-3 inline mr-1" /></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الكمية *</Label>
                <Input type="number" min="1" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} dir="ltr" className="text-right" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>السبب *</Label>
              <Textarea value={adjReason} onChange={(e) => setAdjReason(e.target.value)} required placeholder="سبب التعديل (مثال: جرد، تالف، استلام شحنة...)" />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign custody */}
      <Dialog open={custodyOpen} onOpenChange={setCustodyOpen}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>
              تسليم عهدة — {cusProduct?.name ?? cusPrinter?.serial_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCustody} className="space-y-3">
            <div className="space-y-2">
              <Label>الفني *</Label>
              <Select value={cusTech} onValueChange={setCusTech}>
                <SelectTrigger><SelectValue placeholder="اختر الفني" /></SelectTrigger>
                <SelectContent>
                  {techs.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">لا يوجد فنيون</div>
                  )}
                  {techs.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.arabic_name || t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cusProduct && (
              <div className="space-y-2">
                <Label>الكمية *</Label>
                <Input type="number" min="1" max={cusProduct.quantity} value={cusQty} onChange={(e) => setCusQty(e.target.value)} dir="ltr" className="text-right" required />
                <p className="text-xs text-muted-foreground">المتاح: {cusProduct.quantity}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>السبب / ملاحظات *</Label>
              <Textarea value={cusReason} onChange={(e) => setCusReason(e.target.value)} required placeholder="سبب التسليم أو رقم البلاغ..." />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCustodyOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسليم"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Inventory;
