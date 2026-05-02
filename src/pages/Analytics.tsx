import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, BarChart3, Trophy, AlertTriangle, Users as UsersIcon } from "lucide-react";

interface TopCustomer { customer_id: string; name: string; total_spent: number; invoice_count: number }
interface TechPerf { technician_id: string; arabic_name: string; invoice_count: number; items_used: number; total_revenue: number }
interface LowStock { product_id: string; name: string; quantity: number; low_stock_threshold: number }

const Analytics = () => {
  const [top, setTop] = useState<TopCustomer[]>([]);
  const [techs, setTechs] = useState<TechPerf[]>([]);
  const [low, setLow] = useState<LowStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: te }, { data: l }] = await Promise.all([
        supabase.rpc("top_customers", { _limit: 10 }),
        supabase.rpc("technician_performance"),
        supabase.rpc("low_stock_alerts"),
      ]);
      setTop((t ?? []) as TopCustomer[]);
      setTechs((te ?? []) as TechPerf[]);
      setLow((l ?? []) as LowStock[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />التحليلات
          </h1>
          <p className="text-muted-foreground mt-1">إحصائيات مباشرة من قاعدة البيانات</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">أعلى العملاء صرفًا</h3>
            </div>
            {top.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">لا توجد بيانات</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">عدد الفواتير</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top.map((c) => (
                    <TableRow key={c.customer_id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.invoice_count}</TableCell>
                      <TableCell className="font-semibold">{Number(c.total_spent).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <UsersIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">أداء الفنيين</h3>
            </div>
            {techs.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">لا توجد بيانات</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الفني</TableHead>
                    <TableHead className="text-right">فواتير</TableHead>
                    <TableHead className="text-right">قطع</TableHead>
                    <TableHead className="text-right">إيراد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techs.map((t) => (
                    <TableRow key={t.technician_id}>
                      <TableCell className="font-medium">{t.arabic_name || "—"}</TableCell>
                      <TableCell>{t.invoice_count}</TableCell>
                      <TableCell>{t.items_used}</TableCell>
                      <TableCell className="font-semibold">{Number(t.total_revenue).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold">تنبيهات المخزون المنخفض</h3>
          </div>
          {low.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">كل شيء على ما يرام ✔</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الصنف</TableHead>
                  <TableHead className="text-right">الكمية الحالية</TableHead>
                  <TableHead className="text-right">حد التنبيه</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {low.map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="destructive">{p.quantity}</Badge></TableCell>
                    <TableCell>{p.low_stock_threshold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
