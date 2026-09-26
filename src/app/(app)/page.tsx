import Link from "next/link";
import { ArrowRight, Swords, Trophy, Users, Zap } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { HeroVisual } from "@/components/HeroVisual";
import { JoinRoomForm } from "@/components/JoinRoomForm";
import { EmptyState } from "@/components/states";
import { ButtonLink, Card } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { getCourses } from "@/lib/catalog";
import { db } from "@/lib/supabase/admin";
import { timeAgo } from "@/lib/utils";

export default async function HomePage() {
  const profile = await pageProfile();
  const [courses, { data: recent }] = await Promise.all([
    getCourses(profile.id),
    db()
      .from("quiz_results")
      .select("id, score, max_score, correct_answers, total_questions, completed_at, mode, quizzes(title)")
      .eq("user_id", profile.id)
      .order("completed_at", { ascending: false })
      .limit(5),
  ]);
  const actions = [
    { href: "/quiz", title: "Single Quiz", text: "Practice and test your knowledge.", icon: Zap, tint: "from-violet-500/25" },
    { href: "/rooms/create", title: "Create Room", text: "Create a multiplayer quiz room.", icon: Users, tint: "from-sky-500/25" },
    { href: "/challenge", title: "Challenge Friend", text: "Challenge another My Quiz user.", icon: Swords, tint: "from-fuchsia-500/25" },
  ];

  return (
    <div className="space-y-8">
      <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#1a1450] via-[#111338] to-[#0b1a3f] p-6 sm:p-10">
        <div className="absolute -top-24 -left-24 size-80 rounded-full bg-brand/30 blur-[100px]" />
        <div className="absolute -right-10 -bottom-32 size-96 rounded-full bg-brand-2/25 blur-[110px]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-violet-200">
              <Trophy className="size-3.5" /> Welcome back, {profile.display_name}
            </p>
            <h1 className="font-display text-3xl leading-[1.1] font-bold sm:text-5xl">
              Test Your Knowledge.
              <br />
              <span className="text-gradient">Compete. Win.</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm text-white/70 sm:text-base">
              My Quiz is where learners go head-to-head. Take timed quizzes, host live rooms with friends, send challenges and climb the global leaderboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/quiz" size="lg"><Zap className="size-4" /> Start a Quiz</ButtonLink>
              <ButtonLink href="/rooms/create" size="lg" variant="secondary"><Users className="size-4" /> Create Room</ButtonLink>
            </div>
            <div className="mt-6 flex gap-6 text-sm">
              <div><p className="font-display text-xl font-bold">Lv {profile.level}</p><p className="text-xs text-muted">Level</p></div>
              <div><p className="font-display text-xl font-bold">{profile.xp.toLocaleString()}</p><p className="text-xs text-muted">XP</p></div>
              <div><p className="font-display text-xl font-bold">{profile.total_wins}</p><p className="text-xs text-muted">Wins</p></div>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <Card className="animate-fade-up p-5 [animation-delay:60ms] sm:p-6">
        <div className="grid items-center gap-4 lg:grid-cols-[auto_1fr]">
          <div className="lg:pr-6">
            <h2 className="font-display text-xl font-semibold">Join a Quiz Room</h2>
            <p className="text-sm text-muted">Got a code from a friend? Jump straight in.</p>
          </div>
          <JoinRoomForm large />
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        {actions.map((a, i) => (
          <Link key={a.href} href={a.href} style={{ animationDelay: `${100 + i * 50}ms` }} className={`animate-fade-up group glass relative overflow-hidden rounded-2xl bg-gradient-to-br ${a.tint} to-transparent p-5 transition hover:-translate-y-0.5 hover:border-brand/40`}>
            <span className="bg-brand-gradient grid size-12 place-items-center rounded-xl shadow-lg"><a.icon className="size-6" /></span>
            <h3 className="mt-4 font-display text-lg font-semibold">{a.title}</h3>
            <p className="text-sm text-muted">{a.text}</p>
            <ArrowRight className="absolute top-5 right-5 size-5 text-muted transition group-hover:translate-x-1 group-hover:text-white" />
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Popular courses</h2>
            <Link href="/courses" className="text-sm text-violet-300 hover:text-white">View all</Link>
          </div>
          {courses.length ? (
            <div className="grid gap-4 sm:grid-cols-2">{courses.slice(0, 4).map((c) => <CourseCard key={c.id} course={c} />)}</div>
          ) : (
            <EmptyState title="No courses yet" description="Courses will appear here once an admin adds them." />
          )}
        </section>
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Recent activity</h2>
          <Card className="divide-y divide-line">
            {recent?.length ? (
              recent.map((r) => (
                <Link key={r.id} href={`/results/${r.id}`} className="flex items-center gap-3 p-4 hover:bg-white/[0.03]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{(r.quizzes as unknown as { title: string } | null)?.title}</p>
                    <p className="text-xs text-muted capitalize">{r.mode} · {timeAgo(r.completed_at)}</p>
                  </div>
                  <span className="font-display font-bold">{r.correct_answers}/{r.total_questions}</span>
                </Link>
              ))
            ) : (
              <EmptyState className="m-4 border-0" title="No quizzes yet" description="Your completed quizzes will show up here." action={<ButtonLink href="/quiz" size="sm">Take your first quiz</ButtonLink>} />
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
