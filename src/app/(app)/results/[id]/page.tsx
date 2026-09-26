import { notFound } from "next/navigation";
import { Clock, Gauge, Home, RotateCcw, Sparkles, Swords, Target, TrendingUp, Users } from "lucide-react";
import { AnswerReview } from "@/components/AnswerReview";
import { AnalysisBar, ResultRing } from "@/components/ResultChart";
import { InlineAlert } from "@/components/states";
import { ButtonLink, Card, Stat } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import type { AnswerKey, Question, QuizResult } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export const metadata = { title: "Quiz result" };

function levelFor(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

function summary(accuracy: number) {
  if (accuracy >= 90) return "Outstanding! You’ve mastered this topic.";
  if (accuracy >= 70) return "Great work — you have a strong grasp of this material.";
  if (accuracy >= 50) return "Solid effort. Review the explanations to lock in what you missed.";
  return "Keep practicing — every attempt makes you sharper.";
}

export default async function ResultPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ timeout?: string }> }) {
  const profile = await pageProfile();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = db();
  const { data: result } = await supabase.from("quiz_results").select("*, quizzes(title, courses(name))").eq("id", id).eq("user_id", profile.id).maybeSingle();
  if (!result) notFound();
  const r = result as QuizResult & { quizzes: { title: string; courses: { name: string } | null } | null };
  const [{ data: attempt }, { data: latest }, room] = await Promise.all([
    supabase.from("quiz_attempts").select("question_ids, answers").eq("id", r.attempt_id).single(),
    supabase.from("quiz_results").select("id").eq("user_id", profile.id).order("completed_at", { ascending: false }).limit(1).single(),
    r.room_id ? supabase.from("rooms").select("room_code").eq("id", r.room_id).single() : Promise.resolve({ data: null }),
  ]);
  const ids = (attempt?.question_ids ?? []) as string[];
  const { data: qs } = await supabase.from("questions").select("*").in("id", ids);
  const byId = new Map((qs ?? []).map((q) => [q.id, q as Question]));
  const questions = ids.map((i) => byId.get(i)).filter((q): q is Question => !!q);
  const accuracy = r.total_questions ? Math.round((r.correct_answers / r.total_questions) * 100) : 0;
  const leveledUp = latest?.id === r.id && levelFor(profile.xp - r.xp_earned) < profile.level;
  const retryHref = r.mode === "single" ? `/quiz?quiz=${r.quiz_id}` : r.mode === "room" ? "/rooms/create" : "/challenge";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {sp.timeout && <InlineAlert tone="info">Time’s up! Your quiz was submitted automatically.</InlineAlert>}
      <Card className="animate-fade-up relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 size-72 rounded-full bg-brand/25 blur-[90px]" />
        <div className="relative flex flex-col items-center gap-8 md:flex-row">
          <ResultRing value={accuracy} label={`${accuracy}%`} sublabel="accuracy" />
          <div className="flex-1 text-center md:text-left">
            <p className="text-gradient text-sm font-semibold tracking-wider uppercase">Quiz Completed</p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{r.quizzes?.title}</h1>
            <p className="text-sm text-muted">{r.quizzes?.courses?.name} · <span className="capitalize">{r.mode}</span></p>
            <p className="mt-4 font-display text-5xl font-bold">{r.score}<span className="text-2xl text-muted">/{r.max_score}</span></p>
            <p className="mt-2 text-sm text-white/80">{summary(accuracy)}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/20 px-3 py-1 text-sm text-violet-200"><Sparkles className="size-4" /> +{r.xp_earned} XP</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-sm"><TrendingUp className="size-4" /> Level {profile.level}</span>
              {leveledUp && <span className="animate-pop inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-sm text-amber-200">Level up!</span>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Correct" value={<span className="text-emerald-300">{r.correct_answers}</span>} />
        <Stat label="Wrong" value={<span className="text-rose-300">{r.wrong_answers}</span>} />
        <Stat label="Unanswered" value={r.unanswered} />
        <Stat label="Total time" icon={<Clock className="size-3.5" />} value={formatDuration(r.total_time)} />
        <Stat label="Avg / question" icon={<Gauge className="size-3.5" />} value={`${Number(r.average_time).toFixed(1)}s`} />
        <Stat label="Accuracy" icon={<Target className="size-3.5" />} value={`${accuracy}%`} />
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Question Analysis</h2>
        <AnalysisBar correct={r.correct_answers} wrong={r.wrong_answers} unanswered={r.unanswered} />
        <div className="mt-6"><AnswerReview questions={questions} answers={(attempt?.answers ?? {}) as Record<string, AnswerKey>} /></div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        {room.data && <ButtonLink href={`/rooms/${room.data.room_code}`} size="lg"><Users className="size-4" /> Room standings</ButtonLink>}
        {r.challenge_id && <ButtonLink href={`/challenge/${r.challenge_id}`} size="lg"><Swords className="size-4" /> Challenge result</ButtonLink>}
        <ButtonLink href={retryHref} size="lg" variant={room.data || r.challenge_id ? "secondary" : "primary"}><RotateCcw className="size-4" /> Try Again</ButtonLink>
        <ButtonLink href="/" size="lg" variant="secondary"><Home className="size-4" /> Back to Home</ButtonLink>
      </div>
    </div>
  );
}
