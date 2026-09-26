"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { InlineAlert, EmptyState } from "@/components/states";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import type { QuizOption } from "@/lib/catalog";
import { api } from "@/lib/fetcher";
import { formatDuration } from "@/lib/utils";

type CourseOpt = { id: string; name: string; slug: string };

export function CreateRoomForm({ courses, quizzes, initialQuiz }: { courses: CourseOpt[]; quizzes: QuizOption[]; initialQuiz?: string }) {
  const router = useRouter();
  const pre = quizzes.find((q) => q.id === initialQuiz);
  const [courseId, setCourseId] = useState(pre?.course_id ?? "");
  const [quizId, setQuizId] = useState(pre?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [time, setTime] = useState<number | "default">("default");
  const [shuffle, setShuffle] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const list = useMemo(() => quizzes.filter((q) => q.course_id === courseId), [quizzes, courseId]);
  const quiz = list.find((q) => q.id === quizId);

  if (!courses.length) return <EmptyState title="No quizzes available" description="An admin needs to add quizzes before rooms can be created." />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return setError("Choose a course and quiz.");
    if (!name.trim()) return setError("Room name is required.");
    setError(null);
    setLoading(true);
    try {
      const { room_code } = await api<{ room_code: string }>("/api/rooms", {
        method: "POST",
        json: { quiz_id: quiz.id, room_name: name, description, max_players: maxPlayers, duration_seconds: time === "default" ? undefined : time, shuffle_questions: shuffle },
      });
      router.push(`/rooms/${room_code}?created=1`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl p-5 sm:p-7">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Course" required htmlFor="course">
            <Select id="course" value={courseId} onChange={(e) => { setCourseId(e.target.value); setQuizId(""); }}>
              <option value="" disabled>Select a course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Quiz" required htmlFor="quiz">
            <Select id="quiz" value={quizId} disabled={!courseId} onChange={(e) => setQuizId(e.target.value)}>
              <option value="" disabled>{courseId ? (list.length ? "Select a quiz" : "No quizzes") : "Choose a course first"}</option>
              {list.map((q) => <option key={q.id} value={q.id}>{q.title} · {q.question_count} Q</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Room name" required htmlFor="room_name">
          <Input id="room_name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="JavaScript Champions" />
        </Field>
        <Field label="Description" htmlFor="description" hint={`${description.length}/300`}>
          <Textarea id="description" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} placeholder="Optional — tell players what to expect" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Maximum players" htmlFor="max">
            <Select id="max" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
              {[2, 4, 6, 10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n} players</option>)}
            </Select>
          </Field>
          <Field label="Time limit" htmlFor="time">
            <Select id="time" value={String(time)} onChange={(e) => setTime(e.target.value === "default" ? "default" : Number(e.target.value))}>
              <option value="default">Recommended {quiz ? `(${formatDuration(quiz.duration)})` : ""}</option>
              {[120, 300, 600, 900].map((s) => <option key={s} value={s}>{s / 60} minutes</option>)}
            </Select>
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white/[0.03] p-3.5 text-sm">
          <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="size-4 accent-[#7c5cff]" />
          <span><b>Shuffle question order</b><span className="block text-xs text-muted">Everyone still gets the same questions in the same order.</span></span>
        </label>
        {error && <InlineAlert>{error}</InlineAlert>}
        <Button type="submit" size="lg" loading={loading} className="w-full"><Users className="size-4" /> Create Room</Button>
      </form>
    </Card>
  );
}
