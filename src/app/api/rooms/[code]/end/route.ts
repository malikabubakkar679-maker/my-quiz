import { requireProfile } from "@/lib/auth";
import { fail, ok, route } from "@/lib/api";
import { getRoomByCode } from "@/lib/rooms";
import { db } from "@/lib/supabase/admin";

export const POST = route(async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const profile = await requireProfile();
  const { code } = await ctx.params;
  const room = await getRoomByCode(code);
  if (room.creator_id !== profile.id && profile.role !== "admin") return fail(403, "Only the room creator can end the room.");
  const supabase = db();
  if (room.status === "waiting") {
    await supabase.from("rooms").update({ status: "cancelled", ended_at: new Date().toISOString() }).eq("id", room.id);
  } else if (room.status === "in_progress") {
    const { error } = await supabase.rpc("finish_room_if_done", { p_room_id: room.id, p_force: true });
    if (error) throw error;
  }
  return ok({ ok: true });
});
