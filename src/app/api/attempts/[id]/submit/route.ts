import { requireProfile } from "@/lib/auth";
import { limit, ok, route } from "@/lib/api";
import { finalizeAttempt } from "@/lib/game";
import { db } from "@/lib/supabase/admin";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const profile = await requireProfile();
  limit(`submit:${profile.id}`, 20);
  const { id } = await ctx.params;
  const resultId = await finalizeAttempt(id, profile.id);
  const { data } = await db().from("quiz_attempts").select("mode, room_id, challenge_id, rooms(room_code)").eq("id", id).single();
  const room = data?.rooms as unknown as { room_code: string } | null;
  return ok({ result_id: resultId, mode: data?.mode, room_code: room?.room_code ?? null, challenge_id: data?.challenge_id ?? null });
});
