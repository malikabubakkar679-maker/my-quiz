import { requireProfile } from "@/lib/auth";
import { limit, ok, parseBody, route } from "@/lib/api";
import { createAttempt, getQuizOrThrow, pickQuestionIds } from "@/lib/game";
import { startSingleSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const profile = await requireProfile();
  limit(`attempt:${profile.id}`, 10);
  const input = await parseBody(req, startSingleSchema);
  const quiz = await getQuizOrThrow(input.quiz_id);
  const questionIds = await pickQuestionIds(quiz.id, input.question_count);
  const attempt = await createAttempt({
    userId: profile.id,
    quizId: quiz.id,
    mode: "single",
    questionIds,
    durationSeconds: input.duration_seconds ?? quiz.duration,
  });
  return ok({ id: attempt.id }, { status: 201 });
});
