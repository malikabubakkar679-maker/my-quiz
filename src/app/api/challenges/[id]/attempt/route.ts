import { requireProfile } from "@/lib/auth";
import { fail, ok, route } from "@/lib/api";
import { createAttempt } from "@/lib/game";
import { db } from "@/lib/supabase/admin";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const profile = await requireProfile();
  const { id } = await ctx.params;
  const supabase = db();
  const { data: ch } = await supabase
    .from("challenges")
    .select("id, sender_id, receiver_id, quiz_id, status, question_ids, duration_seconds")
    .eq("id", id)
    .maybeSingle();
  if (!ch || (ch.sender_id !== profile.id && ch.receiver_id !== profile.id)) return fail(404, "Challenge not found.");
  const { data: existing } = await supabase.from("quiz_attempts").select("id").eq("challenge_id", id).eq("user_id", profile.id).maybeSingle();
  if (existing) return ok({ id: existing.id });
  if (ch.status !== "accepted") return fail(409, "This challenge is not active.");
  try {
    const attempt = await createAttempt({
      userId: profile.id,
      quizId: ch.quiz_id,
      mode: "challenge",
      questionIds: ch.question_ids,
      durationSeconds: ch.duration_seconds,
      challengeId: ch.id,
    });
    return ok({ id: attempt.id }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      const { data } = await supabase.from("quiz_attempts").select("id").eq("challenge_id", id).eq("user_id", profile.id).single();
      return ok({ id: data!.id });
    }
    throw err;
  }
});
