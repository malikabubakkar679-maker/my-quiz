import { requireProfile } from "@/lib/auth";
import { fail, ok, route } from "@/lib/api";
import { getRoomByCode } from "@/lib/rooms";
import { db } from "@/lib/supabase/admin";

const COUNTDOWN_MS = 4000;

export const POST = route(async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const profile = await requireProfile();
  const { code } = await ctx.params;
  const room = await getRoomByCode(code);
  if (room.creator_id !== profile.id) return fail(403, "Only the room creator can start the quiz.");
  if (room.status !== "waiting") return fail(409, "This room has already started.");
  const supabase = db();
  const { count } = await supabase
    .from("room_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("status", "joined");
  if (!count) return fail(409, "At least one player must join before starting.");

  const startsAt = new Date(Date.now() + COUNTDOWN_MS).toISOString();
  const { data, error } = await supabase
    .from("rooms")
    .update({ status: "in_progress", started_at: startsAt })
    .eq("id", room.id)
    .eq("status", "waiting")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return fail(409, "This room has already started.");
  await supabase.from("room_participants").update({ status: "playing" }).eq("room_id", room.id).eq("status", "joined");
  return ok({ started_at: startsAt });
});
