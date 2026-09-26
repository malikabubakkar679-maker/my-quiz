import { db } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/auth";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/constants";
import type { Challenge, PublicProfile } from "@/lib/types";

export const CHALLENGE_COLUMNS = `id, sender_id, receiver_id, quiz_id, status, duration_seconds, sender_score, receiver_score, sender_correct,
  receiver_correct, sender_time, receiver_time, winner_id, created_at, accepted_at, completed_at,
  sender:profiles!challenges_sender_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
  receiver:profiles!challenges_receiver_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
  quiz:quizzes(id, title, difficulty, courses(name, slug))`;

export type ChallengeWithPeople = Challenge & {
  sender: PublicProfile;
  receiver: PublicProfile;
  quiz: { id: string; title: string; difficulty: string; courses: { name: string; slug: string } | null };
  question_count?: number;
};

export async function getChallenge(id: string, viewerId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Challenge not found.");
  const supabase = db();
  const { data, error } = await supabase.from("challenges").select(`${CHALLENGE_COLUMNS}, question_ids`).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data || (data.sender_id !== viewerId && data.receiver_id !== viewerId)) throw new HttpError(404, "Challenge not found.");
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("id, submitted_at")
    .eq("challenge_id", id)
    .eq("user_id", viewerId)
    .maybeSingle();
  const { question_ids, ...challenge } = data as unknown as ChallengeWithPeople & { question_ids: string[] };
  return {
    challenge: { ...challenge, question_count: question_ids.length } as ChallengeWithPeople,
    viewer: { id: viewerId, attempt_id: (attempt?.id as string) ?? null, submitted: !!attempt?.submitted_at },
  };
}
