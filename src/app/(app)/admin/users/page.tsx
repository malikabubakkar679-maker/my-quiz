import { AdminTable, PAGE_SIZE, pageOf } from "@/components/admin/AdminTable";
import { UserActions } from "@/components/admin/UserActions";
import { Badge } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { requireAdmin } from "@/lib/auth";
import { ilikePattern, searchTerm } from "@/lib/search";
import { db } from "@/lib/supabase/admin";
import { timeAgo } from "@/lib/utils";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const term = searchTerm(sp.q);
  let query = db().from("profiles").select("id, username, display_name, avatar_url, role, is_banned, level, total_quizzes, created_at, onboarding_completed").order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  if (term) query = query.or(`username.ilike.${ilikePattern(term)},display_name.ilike.${ilikePattern(term)}`);
  const { data } = await query;
  const rows = (data ?? []).slice(0, PAGE_SIZE);
  return (
    <div className="space-y-4">
      <form className="max-w-sm"><input name="q" defaultValue={sp.q} placeholder="Search users…" aria-label="Search users" className="h-11 w-full rounded-xl border border-line bg-white/[0.04] px-4 text-sm outline-none focus:border-brand/60" /></form>
      <AdminTable
        head={["User", "Role", "Level", "Quizzes", "Joined", "Actions"]}
        empty="No users found."
        page={page}
        hasMore={(data ?? []).length > PAGE_SIZE}
        base={`/admin/users${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`}
        rows={rows.map((u) => [
          <div key="u" className="flex items-center gap-2"><UserAvatar src={u.avatar_url} name={u.username} size="sm" /><div><p className="font-medium">{u.display_name ?? "—"}</p><p className="text-xs text-muted">{u.username ? `@${u.username}` : "Onboarding pending"}</p></div></div>,
          <div key="r" className="flex gap-1">{u.role === "admin" && <Badge tone="brand">Admin</Badge>}{u.is_banned && <Badge tone="danger">Banned</Badge>}{u.role !== "admin" && !u.is_banned && <Badge>User</Badge>}</div>,
          u.level,
          u.total_quizzes,
          timeAgo(u.created_at),
          <UserActions key="a" id={u.id} role={u.role} banned={u.is_banned} self={u.id === me.id} />,
        ])}
      />
    </div>
  );
}
