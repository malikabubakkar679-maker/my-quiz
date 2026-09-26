import { requireProfile } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { finalizeAttempt } from "@/lib/game";
import { getRoomByCode } from "@/lib/rooms";
import { db } from "@/lib/supabase/admin";

export const POST = route(async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const profile = await requireProfile();
  const { code } = await ctx.params;
  const room = await getRoomByCode(code);
  const supabase = db();
  if (room.status === "waiting") {
    await supabase.from("room_participants").delete().eq("room_id", room.id).eq("user_id", profile.id);
  } else if (room.status === "in_progress") {
    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("room_id", room.id)
      .eq("user_id", profile.id)
      .is("submitted_at", null)
      .maybeSingle();
    if (attempt) await finalizeAttempt(attempt.id, profile.id);
    else {
      await supabase.from("room_participants").update({ status: "left" }).eq("room_id", room.id).eq("user_id", profile.id).neq("status", "finished");
      await supabase.rpc("finish_room_if_done", { p_room_id: room.id, p_force: false });
    }
  }
  return ok({ ok: true });
});
