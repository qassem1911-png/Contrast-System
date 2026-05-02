import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, ScrollText } from "lucide-react";
import { useRealtime } from "@/hooks/useRealtime";

interface AuditRow {
  id: string;
  action_type: string;
  table_name: string | null;
  record_id: string | null;
  user_id: string | null;
  before_value: unknown;
  after_value: unknown;
  created_at: string;
}

const AuditLogs = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useRealtime("audit-rt", ["audit_logs"], () => load());

  const scopeLabel = isAdmin || isSuperAdmin ? "كل السجلات" : "سجلاتك فقط";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <ScrollText className="h-6 w-6 sm:h-7 sm:w-7" />سجل التدقيق
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{scopeLabel}</p>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا توجد سجلات</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right whitespace-nowrap">التاريخ</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                    <TableHead className="text-right">الجدول</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">السجل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("ar-EG")}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.action_type}</Badge></TableCell>
                      <TableCell className="text-sm">{r.table_name ?? "—"}</TableCell>
                      <TableCell dir="ltr" className="text-right text-xs font-mono">
                        {r.user_id?.slice(0, 8) ?? "—"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right text-xs font-mono">
                        {r.record_id?.slice(0, 8) ?? "—"}
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

export default AuditLogs;
