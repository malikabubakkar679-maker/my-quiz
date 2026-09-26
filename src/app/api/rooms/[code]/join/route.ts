import { requireProfile } from "@/lib/auth";
import { fail, limit, ok, route } from "@/lib/api";
import { getRoomByCode } from "@/lib/rooms";
import { db } from "@/lib/supabase/admin";

export const POST = route(async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const profile = await requireProfile();
  limit(`room-join:${profile.id}`, 20);
  const { code } = await ctx.params;
  const room = await getRoomByCode(code);
  const supabase = db();
  if (room.creator_id === profile.id) return ok({ room_code: room.room_code, role: "creator" });

  const { data: existing } = await supabase
    .from("room_participants")
    .select("id, status")
    .eq("room_id", room.id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (existing && existing.status !== "left") return ok({ room_code: room.room_code, role: "participant" });

  if (room.status === "ended" || room.status === "cancelled") return fail(410, "This room has ended.");
  if (room.status === "in_progress") return fail(409, "This room has already started.");

  const { count } = await supabase
    .from("room_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .neq("status", "left");
  if ((count ?? 0) >= room.max_players) return fail(409, "This room is full.");

  const { error } = await supabase
    .from("room_participants")
    .upsert({ room_id: room.id, user_id: profile.id, status: "joined", joined_at: new Date().toISOString() }, { onConflict: "room_id,user_id" });
  if (error) throw error;
  return ok({ room_code: room.room_code, role: "participant" });
});
