import { ChallengeHub } from "@/components/ChallengeHub";
import { PageHeader } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { getQuizCatalog } from "@/lib/catalog";
import { CHALLENGE_COLUMNS, type ChallengeWithPeople } from "@/lib/challenges";
import { db } from "@/lib/supabase/admin";

export const metadata = { title: "Challenge Quiz" };

export default async function ChallengePage({ searchParams }: { searchParams: Promise<{ quiz?: string }> }) {
  const profile = await pageProfile();
  const [{ data }, { courses, quizzes }, sp] = await Promise.all([
    db().from("challenges").select(CHALLENGE_COLUMNS).or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`).order("created_at", { ascending: false }).limit(100),
    getQuizCatalog(),
    searchParams,
  ]);
  return (
    <div>
      <PageHeader title="Challenge a Friend" description="Go head-to-head on the same quiz. Most correct answers wins — fastest time breaks ties." />
      <ChallengeHub me={profile.id} challenges={(data ?? []) as unknown as ChallengeWithPeople[]} courses={courses} quizzes={quizzes} initialQuiz={sp.quiz} />
    </div>
  );
}
