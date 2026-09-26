"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpen, Clock, Gauge, HelpCircle, Play } from "lucide-react";
import { CourseIcon } from "@/components/CourseIcon";
import { EmptyState, InlineAlert } from "@/components/states";
import { Button, Card, Field, Select } from "@/components/ui";
import type { QuizOption } from "@/lib/catalog";
import { api } from "@/lib/fetcher";
import { cn, formatDuration } from "@/lib/utils";

type CourseOpt = { id: string; name: string; slug: string; icon: string | null };

export function QuizSetup({ courses, quizzes, initialQuiz, initialCourse }: { courses: CourseOpt[]; quizzes: QuizOption[]; initialQuiz?: string; initialCourse?: string }) {
  const router = useRouter();
  const preQuiz = quizzes.find((q) => q.id === initialQuiz);
  const [courseId, setCourseId] = useState(preQuiz?.course_id ?? courses.find((c) => c.slug === initialCourse)?.id ?? "");
  const [difficulty, setDifficulty] = useState<string>(preQuiz?.difficulty ?? "all");
  const [quizId, setQuizId] = useState(preQuiz?.id ?? "");
  const [count, setCount] = useState<number | "all">("all");
  const [time, setTime] = useState<number | "default">("default");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const available = useMemo(
    () => quizzes.filter((q) => q.course_id === courseId && (difficulty === "all" || q.difficulty === difficulty)),
    [quizzes, courseId, difficulty],
  );
  const quiz = quizzes.find((q) => q.id === quizId && available.includes(q));
  const course = courses.find((c) => c.id === courseId);
  const questionCount = quiz ? (count === "all" ? quiz.question_count : Math.min(count, quiz.question_count)) : 0;
  const seconds = quiz ? (time === "default" ? quiz.duration : time) : 0;

  if (!courses.length) return <EmptyState title="No courses available" description="Check back once quizzes have been added." />;

  const start = async () => {
    if (!quiz) return;
    setLoading(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/attempts", {
        method: "POST",
        json: { quiz_id: quiz.id, question_count: count === "all" ? undefined : questionCount, duration_seconds: time === "default" ? undefined : time },
      });
      router.push(`/play/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card className="space-y-6 p-5 sm:p-6">
        <div>
          <p className="mb-3 text-sm font-medium">1. Choose a course</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCourseId(c.id);
                  setQuizId("");
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm transition",
                  c.id === courseId ? "border-brand/60 bg-brand/15" : "border-line bg-white/[0.03] hover:border-white/20",
                )}
              >
                <CourseIcon icon={c.icon} seed={c.slug} className="size-8" />
                <span className="truncate font-medium">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="2. Difficulty" htmlFor="difficulty">
            <Select id="difficulty" value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setQuizId(""); }}>
              <option value="all">Any difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </Field>
          <Field label="3. Quiz" htmlFor="quiz" hint={courseId && !available.length ? "No quizzes match. Try another difficulty." : undefined}>
            <Select id="quiz" value={quizId} disabled={!courseId || !available.length} onChange={(e) => setQuizId(e.target.value)}>
              <option value="" disabled>{courseId ? "Select a quiz" : "Choose a course first"}</option>
              {available.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
            </Select>
          </Field>
          <Field label="4. Questions" htmlFor="count">
            <Select id="count" value={String(count)} disabled={!quiz} onChange={(e) => setCount(e.target.value === "all" ? "all" : Number(e.target.value))}>
              <option value="all">All {quiz ? `(${quiz.question_count})` : ""}</option>
              {[5, 10, 15, 20].filter((n) => !quiz || n < quiz.question_count).map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label="5. Time" htmlFor="time">
            <Select id="time" value={String(time)} disabled={!quiz} onChange={(e) => setTime(e.target.value === "default" ? "default" : Number(e.target.value))}>
              <option value="default">Recommended {quiz ? `(${formatDuration(quiz.duration)})` : ""}</option>
              {[120, 300, 600, 900, 1200].map((s) => <option key={s} value={s}>{s / 60} minutes</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="h-fit p-5 sm:p-6 lg:sticky lg:top-24">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">Review</p>
        {quiz && course ? (
          <>
            <h2 className="mt-2 font-display text-xl font-bold">{quiz.title}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { icon: BookOpen, k: "Course", v: course.name },
                { icon: Gauge, k: "Difficulty", v: <span className="capitalize">{quiz.difficulty}</span> },
                { icon: HelpCircle, k: "Questions", v: questionCount },
                { icon: Clock, k: "Time", v: formatDuration(seconds) },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between border-b border-line pb-3 last:border-0">
                  <dt className="flex items-center gap-2 text-muted"><r.icon className="size-4" /> {r.k}</dt>
                  <dd className="font-medium">{r.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">10 points per correct answer. The timer starts as soon as you begin and is enforced by the server.</p>
            {error && <div className="mt-4"><InlineAlert>{error}</InlineAlert></div>}
            <Button size="lg" className="mt-5 w-full" loading={loading} onClick={start}><Play className="size-4" /> Start Quiz</Button>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">Select a course and quiz to see your quiz summary.</p>
        )}
      </Card>
    </div>
  );
}
