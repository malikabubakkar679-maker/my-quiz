import Link from "next/link";
import { AdminTable, PAGE_SIZE, pageOf } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui";
import { db } from "@/lib/supabase/admin";
import { timeAgo } from "@/lib/utils";

export default async function AdminRooms({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageOf((await searchParams).page);
  const { data } = await db()
    .from("rooms")
    .select("id, room_code, room_name, status, max_players, created_at, courses(name), creator:profiles!rooms_creator_id_fkey(username), room_participants(count)")
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rows = (data ?? []).slice(0, PAGE_SIZE) as unknown as { id: string; room_code: string; room_name: string; status: string; max_players: number; created_at: string; courses: { name: string } | null; creator: { username: string } | null; room_participants: { count: number }[] }[];
  return (
    <AdminTable
      head={["Room", "Course", "Host", "Players", "Status", "Created"]}
      empty="No rooms yet."
      page={page}
      hasMore={(data ?? []).length > PAGE_SIZE}
      base="/admin/rooms"
      rows={rows.map((r) => [
        <Link key="n" href={`/rooms/${r.room_code}`} className="hover:underline"><p className="font-medium">{r.room_name}</p><p className="font-mono text-xs text-muted">{r.room_code}</p></Link>,
        r.courses?.name,
        `@${r.creator?.username ?? "—"}`,
        `${r.room_participants[0]?.count ?? 0}/${r.max_players}`,
        <Badge key="s" className="capitalize">{r.status.replace("_", " ")}</Badge>,
        timeAgo(r.created_at),
      ])}
    />
  );
}
