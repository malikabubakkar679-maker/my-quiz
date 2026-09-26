import { Activity, DoorOpen, Gamepad2, ListChecks, Swords, Users } from "lucide-react";
import { LazyActivityChart } from "@/components/admin/LazyActivityChart";
import { Card, Stat } from "@/components/ui";
import { db } from "@/lib/supabase/admin";

export default async function AdminHome() {
  const supabase = db();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const [users, active, quizzes, attempts, rooms, challenges, activity] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true })),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", since)),
    count(supabase.from("quizzes").select("id", { count: "exact", head: true })),
    count(supabase.from("quiz_results").select("id", { count: "exact", head: true })),
    count(supabase.from("rooms").select("id", { count: "exact", head: true })),
    count(supabase.from("challenges").select("id", { count: "exact", head: true })),
    supabase.rpc("admin_daily_activity", { p_days: 14 }),
  ]);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total users" icon={<Users className="size-3.5" />} value={users} />
        <Stat label="Active (7d)" icon={<Activity className="size-3.5" />} value={active} />
        <Stat label="Total quizzes" icon={<ListChecks className="size-3.5" />} value={quizzes} />
        <Stat label="Quiz attempts" icon={<Gamepad2 className="size-3.5" />} value={attempts} />
        <Stat label="Rooms" icon={<DoorOpen className="size-3.5" />} value={rooms} />
        <Stat label="Challenges" icon={<Swords className="size-3.5" />} value={challenges} />
      </div>
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Activity — last 14 days</h2>
        <LazyActivityChart data={(activity.data ?? []).map((d: { day: string; attempts: number; new_users: number }) => ({ ...d, attempts: Number(d.attempts), new_users: Number(d.new_users) }))} />
      </Card>
    </div>
  );
}
