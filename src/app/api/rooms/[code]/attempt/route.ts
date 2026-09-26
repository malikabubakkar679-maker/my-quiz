import { requireProfile } from "@/lib/auth";
import { fail, ok, route } from "@/lib/api";
import { createAttempt } from "@/lib/game";
import { getRoomByCode } from "@/lib/rooms";
import { db } from "@/lib/supabase/admin";

export const POST = route(async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const profile = await requireProfile();
  const { code } = await ctx.params;
  const room = await getRoomByCode(code);
  const supabase = db();
  const { data: existing } = await supabase.from("quiz_attempts").select("id").eq("room_id", room.id).eq("user_id", profile.id).maybeSingle();
  if (existing) return ok({ id: existing.id });
  if (room.status !== "in_progress" || !room.started_at) return fail(409, "This room is not in progress.");

  const { data: participant } = await supabase
    .from("room_participants")
    .select("status")
    .eq("room_id", room.id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!participant || participant.status !== "playing") return fail(403, "You are not playing in this room.");

  const startedAt = new Date(room.started_at);
  const expiresAt = new Date(startedAt.getTime() + room.duration_seconds * 1000);
  if (Date.now() > expiresAt.getTime()) return fail(409, "Time is up for this room.");
  try {
    const attempt = await createAttempt({
      userId: profile.id,
      quizId: room.quiz_id,
      mode: "room",
      questionIds: room.question_ids,
      durationSeconds: room.duration_seconds,
      startedAt,
      expiresAt,
      roomId: room.id,
    });
    return ok({ id: attempt.id }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      const { data } = await supabase.from("quiz_attempts").select("id").eq("room_id", room.id).eq("user_id", profile.id).single();
      return ok({ id: data!.id });
    }
    throw err;
  }
});
