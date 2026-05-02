import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ROLE_LABELS_AR, ROLE_BADGE_VARIANTS } from "@/lib/roles";
import { toast } from "sonner";
import { UserPlus, Loader2, Info } from "lucide-react";
import { AppRole, useAuth } from "@/contexts/AuthContext";

interface UserRow {
  id: string;
  email: string;
  arabic_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  roles: AppRole[];
}

const ROLE_OPTIONS: AppRole[] = ["super_admin", "admin", "storekeeper", "technician"];

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adminInfoOpen, setAdminInfoOpen] = useState(false);

  // Create form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [arabicName, setArabicName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppRole>("technician");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: rolesData, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (pErr || rErr) {
      toast.error("فشل تحميل المستخدمين", { description: pErr?.message ?? rErr?.message });
      setLoading(false);
      return;
    }

    const rolesMap = new Map<string, AppRole[]>();
    (rolesData ?? []).forEach((r: { user_id: string; role: AppRole }) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    });

    setUsers(
      (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        arabic_name: p.arabic_name,
        phone: p.phone,
        avatar_url: p.avatar_url,
        is_active: p.is_active,
        created_at: p.created_at,
        roles: rolesMap.get(p.id) ?? [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setArabicName("");
    setPhone("");
    setRole("technician");
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    // 1) Create the auth user via standard signup (no Edge Function).
    //    This sends an email confirmation depending on Auth settings.
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          arabic_name: arabicName.trim(),
          phone: phone.trim() || null,
        },
      },
    });

    if (signUpErr || !signUpData.user) {
      setCreating(false);
      toast.error("فشل إنشاء الحساب", { description: signUpErr?.message });
      return;
    }

    // 2) Use the database function to set profile + role atomically.
    const { error: rpcErr } = await supabase.rpc("admin_create_user", {
      _user_id: signUpData.user.id,
      _email: email.trim(),
      _arabic_name: arabicName.trim(),
      _role: role,
      _phone: phone.trim() || null,
    });

    setCreating(false);

    if (rpcErr) {
      toast.error("تم إنشاء الحساب لكن فشل تعيين الدور", { description: rpcErr.message });
      return;
    }

    toast.success("تم إنشاء المستخدم بنجاح", {
      description: "إذا كان تأكيد البريد مفعلاً، سيتلقى المستخدم رسالة تأكيد.",
    });
    setOpen(false);
    resetForm();
    load();
  };

  const updateRole = async (userId: string, currentRoles: AppRole[], newRole: AppRole) => {
    if (currentRoles.includes(newRole)) return;
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) {
      toast.error("فشل تحديث الدور", { description: delErr.message });
      return;
    }
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });
    if (insErr) {
      toast.error("فشل إضافة الدور", { description: insErr.message });
      return;
    }
    toast.success("تم تحديث الدور");
    load();
  };

  const toggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !current })
      .eq("id", userId);
    if (error) {
      toast.error("فشل التحديث", { description: error.message });
      return;
    }
    toast.success(current ? "تم تعطيل المستخدم" : "تم تفعيل المستخدم");
    load();
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">إدارة المستخدمين</h1>
            <p className="text-muted-foreground mt-1">
              إنشاء المستخدمين وتعيين الأدوار وتفعيل/تعطيل الحسابات
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAdminInfoOpen(true)}>
              <Info className="h-4 w-4 ml-2" />
              عمليات الأدمن
            </Button>
            <Button onClick={() => setOpen(true)} size="lg">
              <UserPlus className="h-4 w-4 ml-2" />
              مستخدم جديد
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا يوجد مستخدمون بعد</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">البريد</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">تغيير الدور</TableHead>
                    <TableHead className="text-right">مفعّل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const primary = u.roles[0];
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {(u.arabic_name || u.email).charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.arabic_name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell dir="ltr" className="text-right text-sm">
                          {u.email}
                        </TableCell>
                        <TableCell dir="ltr" className="text-right text-sm">
                          {u.phone || "—"}
                        </TableCell>
                        <TableCell>
                          {primary ? (
                            <Badge variant={ROLE_BADGE_VARIANTS[primary]}>
                              {ROLE_LABELS_AR[primary]}
                            </Badge>
                          ) : (
                            <Badge variant="outline">بدون دور</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={primary}
                            onValueChange={(v) => updateRole(u.id, u.roles, v as AppRole)}
                            disabled={isSelf}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS_AR[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.is_active}
                            disabled={isSelf}
                            onCheckedChange={() => toggleActive(u.id, u.is_active)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Admin operations info dialog */}
      <Dialog open={adminInfoOpen} onOpenChange={setAdminInfoOpen}>
        <DialogContent dir="rtl" className="text-right max-w-lg">
          <DialogHeader>
            <DialogTitle>عمليات الأدمن المتقدمة</DialogTitle>
            <DialogDescription>
              بعض العمليات الحساسة تتم من لوحة تحكم Supabase وليس من هنا
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Alert>
              <AlertTitle>إعادة تعيين كلمة المرور</AlertTitle>
              <AlertDescription>
                يمكن للمستخدم استخدام رابط "نسيت كلمة المرور" في صفحة تسجيل الدخول. أو يقوم
                المسؤول بإرسال رابط استرجاع من لوحة Authentication → Users في Supabase.
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertTitle>حذف مستخدم</AlertTitle>
              <AlertDescription>
                يفضّل تعطيل الحساب من زر التفعيل بدلاً من الحذف. للحذف النهائي، استخدم لوحة
                Authentication → Users في Supabase.
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertTitle>تغيير البريد الإلكتروني</AlertTitle>
              <AlertDescription>
                يستطيع المستخدم تحديث بريده من إعدادات الحساب. أو يتم التغيير من لوحة Supabase.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setAdminInfoOpen(false)}>حسناً</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
            <DialogDescription>
              يتم إنشاء الحساب وتعيين الدور مباشرة. قد يحتاج المستخدم لتأكيد بريده حسب الإعدادات.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">الاسم بالعربية</Label>
              <Input
                id="c-name"
                value={arabicName}
                onChange={(e) => setArabicName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="c-email">البريد</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-phone">الهاتف</Label>
                <Input
                  id="c-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="c-pass">كلمة المرور</Label>
                <Input
                  id="c-pass"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  dir="ltr"
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">
                  يفضّل 8 أحرف على الأقل وأن تكون قوية
                </p>
              </div>
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS_AR[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Users;
