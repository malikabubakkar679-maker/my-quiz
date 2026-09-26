import { db } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/auth";
import { shuffle } from "@/lib/utils";
import type { AttemptMode, PlayQuestion, QuizAttempt } from "@/lib/types";

export async function getQuizOrThrow(quizId: string) {
  const { data, error } = await db()
    .from("quizzes")
    .select("id, title, duration, question_count, course_id, is_published, difficulty")
    .eq("id", quizId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.is_published) throw new HttpError(404, "Quiz not found.");
  if (data.question_count < 1) throw new HttpError(400, "This quiz has no questions yet.");
  return data;
}

export async function pickQuestionIds(quizId: string, count?: number, randomize = true): Promise<string[]> {
  const { data, error } = await db().from("questions").select("id").eq("quiz_id", quizId).order("created_at");
  if (error) throw error;
  const ids = (data ?? []).map((q) => q.id as string);
  if (ids.length === 0) throw new HttpError(400, "This quiz has no questions yet.");
  const ordered = randomize ? shuffle(ids) : ids;
  return count ? ordered.slice(0, Math.min(count, ordered.length)) : ordered;
}

export async function createAttempt(input: {
  userId: string;
  quizId: string;
  mode: AttemptMode;
  questionIds: string[];
  durationSeconds: number;
  startedAt?: Date;
  expiresAt?: Date;
  roomId?: string;
  challengeId?: string;
}): Promise<QuizAttempt> {
  const startedAt = input.startedAt ?? new Date();
  const expiresAt = input.expiresAt ?? new Date(startedAt.getTime() + input.durationSeconds * 1000);
  const { data, error } = await db()
    .from("quiz_attempts")
    .insert({
      user_id: input.userId,
      quiz_id: input.quizId,
      mode: input.mode,
      question_ids: input.questionIds,
      duration_seconds: input.durationSeconds,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      room_id: input.roomId ?? null,
      challenge_id: input.challengeId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as QuizAttempt;
}

/** Loads an attempt owned by the user along with its questions (without correct answers). */
export async function loadPlayableAttempt(attemptId: string, userId: string) {
  const supabase = db();
  const { data: attempt, error } = await supabase.from("quiz_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (error) throw error;
  if (!attempt || attempt.user_id !== userId) throw new HttpError(404, "Quiz attempt not found.");
  const a = attempt as QuizAttempt;
  const [{ data: questions, error: qErr }, { data: quiz }] = await Promise.all([
    supabase.from("questions").select("id, question_text, option_a, option_b, option_c, option_d").in("id", a.question_ids),
    supabase.from("quizzes").select("id, title, difficulty, courses(name, slug)").eq("id", a.quiz_id).single(),
  ]);
  if (qErr) throw qErr;
  const byId = new Map((questions ?? []).map((q) => [q.id as string, q as PlayQuestion]));
  const ordered = a.question_ids.map((id) => byId.get(id)).filter((q): q is PlayQuestion => !!q);
  let roomCode: string | null = null;
  if (a.room_id) {
    const { data: room } = await supabase.from("rooms").select("room_code").eq("id", a.room_id).single();
    roomCode = (room?.room_code as string) ?? null;
  }
  let resultId: string | null = null;
  if (a.submitted_at) {
    const { data: r } = await supabase.from("quiz_results").select("id").eq("attempt_id", a.id).maybeSingle();
    resultId = (r?.id as string) ?? null;
  }
  return { attempt: a, questions: ordered, quiz, resultId, roomCode };
}

export async function finalizeAttempt(attemptId: string, userId: string): Promise<string> {
  const { data, error } = await db().rpc("finalize_attempt", { p_attempt_id: attemptId, p_internal: false, p_user: userId });
  if (error) throw error;
  return data as string;
}
