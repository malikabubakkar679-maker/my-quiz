import { AdminTable, PAGE_SIZE, pageOf } from "@/components/admin/AdminTable";
import { ReportActions } from "@/components/admin/UserActions";
import { Badge, TabLinks } from "@/components/ui";
import { db } from "@/lib/supabase/admin";
import { timeAgo } from "@/lib/utils";

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const status = ["open", "resolved", "dismissed"].includes(sp.status ?? "") ? sp.status! : "open";
  const { data } = await db()
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(username)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rows = (data ?? []).slice(0, PAGE_SIZE) as unknown as { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string; reporter: { username: string } | null }[];
  return (
    <div className="space-y-4">
      <TabLinks value={status} options={["open", "resolved", "dismissed"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), href: `/admin/reports?status=${s}` }))} />
      <AdminTable
        head={["Target", "Reason", "Reporter", "Reported", "Actions"]}
        empty="No reports."
        page={page}
        hasMore={(data ?? []).length > PAGE_SIZE}
        base={`/admin/reports?status=${status}`}
        rows={rows.map((r) => [
          <div key="t"><Badge className="capitalize">{r.target_type}</Badge><p className="mt-1 font-mono text-[11px] text-muted">{r.target_id.slice(0, 8)}</p></div>,
          <p key="r" className="max-w-xs">{r.reason}</p>,
          `@${r.reporter?.username ?? "—"}`,
          timeAgo(r.created_at),
          <ReportActions key="a" id={r.id} status={r.status} />,
        ])}
      />
    </div>
  );
}
