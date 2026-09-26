import { requireProfile } from "@/lib/auth";
import { fail, limit, ok, parseBody, route } from "@/lib/api";
import { getQuizOrThrow, pickQuestionIds } from "@/lib/game";
import { db } from "@/lib/supabase/admin";
import { createChallengeSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const profile = await requireProfile();
  limit(`challenge:${profile.id}`, 10);
  const input = await parseBody(req, createChallengeSchema);
  if (input.receiver_id === profile.id) return fail(400, "You can't challenge yourself.");
  const supabase = db();
  const { data: receiver } = await supabase
    .from("profiles")
    .select("id, onboarding_completed, is_banned")
    .eq("id", input.receiver_id)
    .maybeSingle();
  if (!receiver || !receiver.onboarding_completed || receiver.is_banned) return fail(404, "User not found.");

  const { count } = await supabase
    .from("challenges")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", profile.id)
    .eq("receiver_id", receiver.id)
    .eq("status", "pending");
  if ((count ?? 0) >= 3) return fail(429, "You already have pending challenges with this user.");

  const quiz = await getQuizOrThrow(input.quiz_id);
  const questionIds = await pickQuestionIds(quiz.id, input.question_count);
  const { data, error } = await supabase
    .from("challenges")
    .insert({
      sender_id: profile.id,
      receiver_id: receiver.id,
      quiz_id: quiz.id,
      question_ids: questionIds,
      duration_seconds: quiz.duration,
    })
    .select("id")
    .single();
  if (error) throw error;
  await supabase.rpc("notify", {
    p_user: receiver.id,
    p_type: "challenge_request",
    p_title: `@${profile.username} challenged you`,
    p_body: `${quiz.title} · ${questionIds.length} questions`,
    p_link: `/challenge/${data.id}`,
    p_data: { challenge_id: data.id },
  });
  return ok({ id: data.id }, { status: 201 });
});
