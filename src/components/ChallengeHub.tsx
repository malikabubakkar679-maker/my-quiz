"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search, Swords } from "lucide-react";
import { Modal } from "@/components/Modal";
import { EmptyState, ErrorState, InlineAlert } from "@/components/states";
import { Badge, Button, Card, Field, Select, Skeleton, Tabs } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { UserCard } from "@/components/UserCard";
import type { QuizOption } from "@/lib/catalog";
import type { ChallengeWithPeople } from "@/lib/challenges";
import { api } from "@/lib/fetcher";
import { timeAgo } from "@/lib/utils";

type SearchUser = { id: string; username: string; display_name: string; avatar_url: string | null; level: number; last_seen_at: string | null };
type CourseOpt = { id: string; name: string };

export function ChallengeHub({ me, challenges, courses, quizzes, initialQuiz }: { me: string; challenges: ChallengeWithPeople[]; courses: CourseOpt[]; quizzes: QuizOption[]; initialQuiz?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<SearchUser[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [target, setTarget] = useState<SearchUser | null>(null);
  const [tab, setTab] = useState<"incoming" | "active" | "sent" | "history">("incoming");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const d = await api<{ users: SearchUser[] }>(`/api/users/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        setUsers(d.users);
        setSearchError(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSearchError(true);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const groups = useMemo(
    () => ({
      incoming: challenges.filter((c) => c.status === "pending" && c.receiver_id === me),
      active: challenges.filter((c) => c.status === "accepted"),
      sent: challenges.filter((c) => c.status === "pending" && c.sender_id === me),
      history: challenges.filter((c) => ["completed", "declined", "cancelled"].includes(c.status)),
    }),
    [challenges, me],
  );

  const respond = async (id: string, action: "accept" | "decline" | "cancel") => {
    setBusy(id + action);
    setErr(null);
    try {
      await api(`/api/challenges/${id}/respond`, { method: "POST", json: { action } });
      if (action === "accept") router.push(`/challenge/${id}`);
      else router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const list = groups[tab];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Find an opponent</h2>
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username" aria-label="Search username" className="h-11 w-full rounded-xl border border-line bg-white/[0.04] pr-4 pl-10 text-sm outline-none focus:border-brand/60 focus:ring-4 focus:ring-brand/15" />
        </div>
        <div className="max-h-[480px] space-y-2 overflow-y-auto">
          {searchError && <ErrorState message="Couldn’t search users." />}
          {!users && !searchError && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
          {users?.length === 0 && <EmptyState title="No users found" description={q ? "Try a different username." : "Invite friends to join My Quiz!"} />}
          {users?.map((u) => (
            <UserCard key={u.id} user={u} action={<Button size="sm" onClick={() => setTarget(u)}><Swords className="size-4" /> Challenge</Button>} />
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-lg font-semibold">Your challenges</h2>
          <Tabs
            value={tab}
            onChange={setTab}
            className="scrollbar-none max-w-full overflow-x-auto"
            options={[
              { value: "incoming", label: `Incoming${groups.incoming.length ? ` (${groups.incoming.length})` : ""}` },
              { value: "active", label: `Active${groups.active.length ? ` (${groups.active.length})` : ""}` },
              { value: "sent", label: "Sent" },
              { value: "history", label: "History" },
            ]}
          />
        </div>
        {err && <div className="mb-3"><InlineAlert>{err}</InlineAlert></div>}
        {list.length === 0 ? (
          <EmptyState title={tab === "incoming" ? "No challenge requests" : tab === "active" ? "No active challenges" : tab === "sent" ? "No pending sent challenges" : "No completed challenges yet"} />
        ) : (
          <ul className="space-y-2">
            {list.map((c) => {
              const opp = c.sender_id === me ? c.receiver : c.sender;
              const won = c.status === "completed" && c.winner_id === me;
              const lost = c.status === "completed" && c.winner_id && c.winner_id !== me;
              return (
                <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white/[0.02] p-3 sm:flex-row sm:items-center">
                  <Link href={`/challenge/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar src={opp.avatar_url} name={opp.username} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.sender_id === me ? "You vs" : ""} @{opp.username}{c.sender_id !== me ? " challenged you" : ""}</p>
                      <p className="truncate text-xs text-muted">{c.quiz.title} · {timeAgo(c.created_at)}</p>
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    {tab === "incoming" && (
                      <>
                        <Button size="sm" loading={busy === c.id + "accept"} onClick={() => respond(c.id, "accept")}>Accept</Button>
                        <Button size="sm" variant="secondary" loading={busy === c.id + "decline"} onClick={() => respond(c.id, "decline")}>Decline</Button>
                      </>
                    )}
                    {tab === "sent" && <Button size="sm" variant="ghost" loading={busy === c.id + "cancel"} onClick={() => respond(c.id, "cancel")}>Cancel</Button>}
                    {tab === "active" && <Button size="sm" onClick={() => router.push(`/challenge/${c.id}`)}>Open</Button>}
                    {tab === "history" && (
                      <Badge tone={won ? "success" : lost ? "danger" : "neutral"} className="capitalize">{c.status === "completed" ? (won ? "Won" : lost ? "Lost" : "Draw") : c.status}</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {target && <SendChallenge user={target} courses={courses} quizzes={quizzes} initialQuiz={initialQuiz} onClose={() => setTarget(null)} />}
    </div>
  );
}

function SendChallenge({ user, courses, quizzes, initialQuiz, onClose }: { user: SearchUser; courses: CourseOpt[]; quizzes: QuizOption[]; initialQuiz?: string; onClose: () => void }) {
  const router = useRouter();
  const pre = quizzes.find((z) => z.id === initialQuiz);
  const [courseId, setCourseId] = useState(pre?.course_id ?? courses[0]?.id ?? "");
  const [quizId, setQuizId] = useState(pre?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = quizzes.filter((z) => z.course_id === courseId);
  const send = async () => {
    if (!quizId) return setError("Choose a quiz.");
    setLoading(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/challenges", { method: "POST", json: { receiver_id: user.id, quiz_id: quizId } });
      router.push(`/challenge/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Send a challenge">
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
        <UserAvatar src={user.avatar_url} name={user.username} />
        <div><p className="font-medium">{user.display_name}</p><p className="text-xs text-muted">@{user.username}</p></div>
      </div>
      <div className="space-y-4">
        <Field label="Course" htmlFor="c-course">
          <Select id="c-course" value={courseId} onChange={(e) => { setCourseId(e.target.value); setQuizId(""); }}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Quiz" htmlFor="c-quiz">
          <Select id="c-quiz" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
            <option value="" disabled>{list.length ? "Select a quiz" : "No quizzes"}</option>
            {list.map((z) => <option key={z.id} value={z.id}>{z.title} · {z.question_count} Q</option>)}
          </Select>
        </Field>
        <p className="text-xs text-muted">Both players get identical questions and time. Most correct answers wins; ties are broken by faster completion time.</p>
        {error && <InlineAlert>{error}</InlineAlert>}
        <Button className="w-full" size="lg" loading={loading} onClick={send}><Swords className="size-4" /> Send Challenge</Button>
      </div>
    </Modal>
  );
}
