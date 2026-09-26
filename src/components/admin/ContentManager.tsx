"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { COURSE_ICON_NAMES, CourseIcon } from "@/components/CourseIcon";
import { Modal } from "@/components/Modal";
import { EmptyState, InlineAlert } from "@/components/states";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/fetcher";
import type { Course, Question, Quiz } from "@/lib/types";
import { cn } from "@/lib/utils";

type Editing =
  | { kind: "course"; value: Partial<Course> }
  | { kind: "quiz"; value: Partial<Quiz> }
  | { kind: "question"; value: Partial<Question> }
  | null;

export function ContentManager({ courses, quizzes, questions, courseId, quizId }: { courses: Course[]; quizzes: Quiz[]; questions: Question[]; courseId?: string; quizId?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const nav = (c?: string, q?: string) => router.push(`/admin/content?${new URLSearchParams({ ...(c ? { course: c } : {}), ...(q ? { quiz: q } : {}) })}`, { scroll: false });

  const remove = async (kind: string, id: string) => {
    if (!confirm(`Delete this ${kind}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api(`/api/admin/${kind === "course" ? "courses" : kind === "quiz" ? "quizzes" : "questions"}/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const row = (active: boolean) => cn("flex items-center gap-3 rounded-xl p-2.5 text-sm transition cursor-pointer", active ? "bg-brand/15" : "hover:bg-white/[0.04]");
  const actions = (kind: "course" | "quiz" | "question", v: Course | Quiz | Question) => (
    <span className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
      <button aria-label={`Edit ${kind}`} onClick={() => setEditing({ kind, value: v } as Editing)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-white"><Pencil className="size-4" /></button>
      <button aria-label={`Delete ${kind}`} onClick={() => remove(kind, v.id)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger/20 hover:text-rose-300"><Trash2 className="size-4" /></button>
    </span>
  );

  return (
    <div className="space-y-4">
      {error && <InlineAlert>{error}</InlineAlert>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <Header title="Courses" onAdd={() => setEditing({ kind: "course", value: { difficulty: "medium" } })} />
          {courses.length ? courses.map((c) => (
            <div key={c.id} className={row(c.id === courseId)} onClick={() => nav(c.id)}>
              <CourseIcon icon={c.icon} seed={c.slug} className="size-8" />
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.name}</span><span className="text-xs text-muted">{c.quiz_count} quizzes · {c.question_count} Q</span></span>
              {actions("course", c)}
            </div>
          )) : <EmptyState title="No courses" />}
        </Card>
        <Card className="p-4">
          <Header title="Quizzes" onAdd={courseId ? () => setEditing({ kind: "quiz", value: { course_id: courseId, difficulty: "medium", duration: 300, is_published: true } }) : undefined} />
          {!courseId ? <EmptyState title="Select a course" /> : quizzes.length ? quizzes.map((q) => (
            <div key={q.id} className={row(q.id === quizId)} onClick={() => nav(courseId, q.id)}>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{q.title}</span><span className="text-xs text-muted">{q.question_count} Q · {Math.round(q.duration / 60)} min</span></span>
              {!q.is_published && <Badge tone="warn">Draft</Badge>}
              {actions("quiz", q)}
            </div>
          )) : <EmptyState title="No quizzes found." />}
        </Card>
        <Card className="p-4">
          <Header title="Questions" onAdd={quizId ? () => setEditing({ kind: "question", value: { quiz_id: quizId, correct_answer: "A", difficulty: "medium" } }) : undefined} />
          {!quizId ? <EmptyState title="Select a quiz" /> : questions.length ? questions.map((q, i) => (
            <div key={q.id} className={row(false)}>
              <span className="text-xs text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1"><span className="line-clamp-2 font-medium">{q.question_text}</span><span className="text-xs text-muted">Answer: {q.correct_answer}</span></span>
              {actions("question", q)}
            </div>
          )) : <EmptyState title="No questions yet" />}
        </Card>
      </div>
      {editing && <Editor editing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
    </div>
  );
}

function Header({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-semibold">{title}</h2>
      {onAdd && <Button size="sm" variant="secondary" onClick={onAdd}><Plus className="size-4" /> Add</Button>}
    </div>
  );
}

function Editor({ editing, onClose, onSaved }: { editing: NonNullable<Editing>; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Record<string, unknown>>({ ...editing.value });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: unknown) => setV((x) => ({ ...x, [k]: val }));
  const str = (k: string) => (v[k] as string | null | undefined) ?? "";
  const path = editing.kind === "course" ? "courses" : editing.kind === "quiz" ? "quizzes" : "questions";
  const fields: Record<string, string[]> = {
    course: ["name", "slug", "description", "icon", "image", "category", "difficulty"],
    quiz: ["course_id", "title", "description", "difficulty", "duration", "is_published"],
    question: ["quiz_id", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation", "difficulty"],
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = Object.fromEntries(fields[editing.kind].map((k) => [k, v[k] === "" ? null : v[k]]));
    try {
      await api(`/api/admin/${path}${v.id ? `/${v.id}` : ""}`, { method: v.id ? "PATCH" : "POST", json: body });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };
  const difficulty = (
    <Field label="Difficulty"><Select value={str("difficulty")} onChange={(e) => set("difficulty", e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></Select></Field>
  );
  return (
    <Modal open onClose={onClose} title={`${v.id ? "Edit" : "New"} ${editing.kind}`} className="max-h-[90dvh] max-w-lg overflow-y-auto">
      <form onSubmit={save} className="space-y-4">
        {editing.kind === "course" && (
          <>
            <Field label="Name" required><Input value={str("name")} onChange={(e) => { set("name", e.target.value); if (!editing.value.id) set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} /></Field>
            <Field label="Slug" required><Input value={str("slug")} onChange={(e) => set("slug", e.target.value)} /></Field>
            <Field label="Description"><Textarea value={str("description")} onChange={(e) => set("description", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Icon"><Select value={str("icon")} onChange={(e) => set("icon", e.target.value)}><option value="">Default</option>{COURSE_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
              <Field label="Category"><Input value={str("category")} onChange={(e) => set("category", e.target.value)} /></Field>
            </div>
            <Field label="Image URL"><Input value={str("image")} onChange={(e) => set("image", e.target.value)} placeholder="https://…" /></Field>
            {difficulty}
          </>
        )}
        {editing.kind === "quiz" && (
          <>
            <Field label="Title" required><Input value={str("title")} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="Description"><Textarea value={str("description")} onChange={(e) => set("description", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              {difficulty}
              <Field label="Duration (seconds)"><Input type="number" min={30} max={7200} value={Number(v.duration ?? 300)} onChange={(e) => set("duration", Number(e.target.value))} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v.is_published} onChange={(e) => set("is_published", e.target.checked)} className="accent-[#7c5cff]" /> Published</label>
          </>
        )}
        {editing.kind === "question" && (
          <>
            <Field label="Question" required><Textarea value={str("question_text")} onChange={(e) => set("question_text", e.target.value)} /></Field>
            {(["a", "b", "c", "d"] as const).map((k) => (
              <Field key={k} label={`Option ${k.toUpperCase()}`} required><Input value={str(`option_${k}`)} onChange={(e) => set(`option_${k}`, e.target.value)} /></Field>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Correct answer"><Select value={str("correct_answer")} onChange={(e) => set("correct_answer", e.target.value)}>{["A", "B", "C", "D"].map((k) => <option key={k}>{k}</option>)}</Select></Field>
              {difficulty}
            </div>
            <Field label="Explanation"><Textarea value={str("explanation")} onChange={(e) => set("explanation", e.target.value)} /></Field>
          </>
        )}
        {error && <InlineAlert>{error}</InlineAlert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

