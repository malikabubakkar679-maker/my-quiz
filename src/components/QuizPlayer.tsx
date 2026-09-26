"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Radio, Send, X } from "lucide-react";
import { LiveScoreboard } from "@/components/LiveScoreboard";
import { LogoMark } from "@/components/Logo";
import { Modal } from "@/components/Modal";
import { KEYS, QuizQuestion } from "@/components/QuizQuestion";
import { ErrorState, InlineAlert } from "@/components/states";
import { Timer } from "@/components/Timer";
import { Button, Skeleton } from "@/components/ui";
import { useRoomState } from "@/hooks/useRoomState";
import { useProfile } from "@/components/ProfileProvider";
import { ApiError, api } from "@/lib/fetcher";
import type { AnswerKey, PlayQuestion, QuizAttempt } from "@/lib/types";
import { cn } from "@/lib/utils";

type Loaded = {
  attempt: QuizAttempt;
  questions: PlayQuestion[];
  quiz: { title: string } | null;
  resultId: string | null;
  roomCode: string | null;
  server_now: string;
};

export function QuizPlayer({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const profile = useProfile();
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({});
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [board, setBoard] = useState(false);
  const offset = useRef(0);
  const saving = useRef<Set<string>>(new Set());
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef(false);

  const load = useCallback(async () => {
    try {
      const t0 = Date.now();
      const d = await api<Loaded>(`/api/attempts/${attemptId}`);
      if (d.attempt.submitted_at) {
        router.replace(d.resultId ? `/results/${d.resultId}` : "/");
        return;
      }
      offset.current = new Date(d.server_now).getTime() - (t0 + Date.now()) / 2;
      setAnswers(d.attempt.answers ?? {});
      setData(d);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [attemptId, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const serverNow = now + offset.current;
  const startMs = data ? new Date(data.attempt.started_at).getTime() : 0;
  const endMs = data ? new Date(data.attempt.expires_at).getTime() : 0;
  const countdown = data ? (startMs - serverNow) / 1000 : 0;
  const remaining = data ? Math.max(0, (endMs - serverNow) / 1000) : 0;
  const started = !!data && countdown <= 0;

  const submit = useCallback(
    async (auto = false) => {
      if (submitted.current) return;
      submitted.current = true;
      setSubmitting(true);
      try {
        const r = await api<{ result_id: string }>(`/api/attempts/${attemptId}/submit`, { method: "POST" });
        router.replace(`/results/${r.result_id}${auto ? "?timeout=1" : ""}`);
      } catch (e) {
        submitted.current = false;
        setSubmitting(false);
        setToast((e as Error).message);
      }
    },
    [attemptId, router],
  );

  useEffect(() => {
    if (data && started && remaining <= 0) submit(true);
  }, [data, started, remaining, submit]);

  const questions = data?.questions ?? [];
  const current = questions[index];

  const select = useCallback(
    async (k: AnswerKey) => {
      if (!current || !started || submitting || saving.current.has(current.id)) return;
      const qid = current.id;
      const prev = answers[qid];
      if (prev === k) return;
      saving.current.add(qid);
      setAnswers((a) => ({ ...a, [qid]: k }));
      if (advance.current) clearTimeout(advance.current);
      try {
        await api(`/api/attempts/${attemptId}/answer`, { method: "POST", json: { question_id: qid, answer: k } });
        if (index < questions.length - 1) advance.current = setTimeout(() => setIndex((i) => (i === index ? i + 1 : i)), 380);
      } catch (e) {
        setAnswers((a) => {
          const next = { ...a };
          if (prev) next[qid] = prev;
          else delete next[qid];
          return next;
        });
        setToast((e as Error).message);
        if (e instanceof ApiError && e.status === 409) submit(true);
      } finally {
        saving.current.delete(qid);
      }
    },
    [current, started, submitting, answers, attemptId, index, questions.length, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirm || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toUpperCase();
      const idx = ["1", "2", "3", "4"].indexOf(k);
      if (idx >= 0) select(KEYS[idx]);
      else if ((KEYS as string[]).includes(k)) select(k as AnswerKey);
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(questions.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select, confirm, questions.length]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (loadError)
    return (
      <div className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <ErrorState message={loadError} onRetry={() => { setLoadError(null); load(); }} />
          <Link href="/" className="text-sm text-muted hover:text-white">Back to Home</Link>
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 pt-20">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      </div>
    );

  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const unanswered = questions.length - answeredCount;
  const isLast = index === questions.length - 1;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <LogoMark className="size-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{data.quiz?.title}</p>
            <p className="text-xs text-muted">{answeredCount}/{questions.length} answered</p>
          </div>
          {data.roomCode && (
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setBoard((b) => !b)} aria-label="Toggle live scoreboard">
              <Radio className="size-4 text-rose-400" />
            </Button>
          )}
          <Timer seconds={started ? remaining : data.attempt.duration_seconds} total={data.attempt.duration_seconds} />
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} aria-label="Finish quiz">
            <X className="size-5" />
          </Button>
        </div>
        <div className="h-1 bg-white/[0.05]">
          <div className="bg-brand-gradient h-full transition-[width] duration-300" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6 sm:py-10">
        <main className="min-w-0 flex-1">
          {current && <QuizQuestion question={current} index={index} total={questions.length} selected={answers[current.id]} disabled={!started || submitting} onSelect={select} />}
          <div className="scrollbar-none mt-8 flex gap-1.5 overflow-x-auto pb-1" aria-label="Question navigator">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setIndex(i)}
                aria-label={`Go to question ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-semibold transition",
                  i === index ? "border-brand bg-brand/25 text-white" : answers[q.id] ? "border-brand/30 bg-brand/10 text-violet-200" : "border-line text-muted hover:text-white",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </main>
        {data.roomCode && (
          <aside className={cn("w-72 shrink-0", board ? "fixed inset-x-4 top-20 z-30 w-auto lg:static lg:w-72" : "hidden lg:block")}>
            <RoomBoard code={data.roomCode} me={profile.id} />
          </aside>
        )}
      </div>

      <footer className="sticky bottom-0 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl gap-3 px-4 py-3">
          <Button variant="secondary" size="lg" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className="flex-1 sm:flex-none">
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <div className="hidden flex-1 sm:block" />
          {isLast ? (
            <Button size="lg" onClick={() => setConfirm(true)} disabled={!started} className="flex-1 sm:flex-none"><Send className="size-4" /> Submit Quiz</Button>
          ) : (
            <Button size="lg" onClick={() => setIndex((i) => i + 1)} className="flex-1 sm:flex-none">Next <ChevronRight className="size-4" /></Button>
          )}
        </div>
      </footer>

      {!started && <Countdown seconds={countdown} />}

      <Modal open={confirm} onClose={() => !submitting && setConfirm(false)} title="Submit quiz?">
        <p className="text-sm text-muted">
          You answered <b className="text-white">{answeredCount}</b> of {questions.length} questions.
          {unanswered > 0 && <> <b className="text-amber-300">{unanswered}</b> unanswered question{unanswered > 1 ? "s" : ""} will be marked as unanswered.</>}
        </p>
        <p className="mt-2 text-xs text-muted">You can’t change your answers after submitting.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setConfirm(false)} disabled={submitting}>Keep going</Button>
          <Button onClick={() => submit(false)} loading={submitting}><Flag className="size-4" /> Submit</Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm">
          <InlineAlert>{toast}</InlineAlert>
        </div>
      )}
    </div>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const n = Math.ceil(seconds);
  const label = n > 3 ? "Get ready" : n > 0 ? String(n) : "GO";
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/90 backdrop-blur-md" role="status" aria-live="assertive">
      <div className="text-center">
        <p className="mb-2 text-sm tracking-widest text-muted uppercase">Quiz starts in</p>
        <p key={label} className="animate-pop text-gradient font-display text-8xl font-bold sm:text-9xl">{label}</p>
      </div>
    </div>
  );
}

function RoomBoard({ code, me }: { code: string; me: string }) {
  const { state } = useRoomState(code);
  return (
    <div className="glass rounded-2xl bg-surface/90">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="size-2 animate-pulse rounded-full bg-rose-500" />
        <p className="text-sm font-semibold">Live scoreboard</p>
      </div>
      {state ? <LiveScoreboard participants={state.participants} highlight={me} compact /> : <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8" />)}</div>}
    </div>
  );
}
