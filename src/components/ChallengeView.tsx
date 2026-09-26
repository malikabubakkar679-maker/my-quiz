"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crown, Loader2, Play, Swords } from "lucide-react";
import { InlineAlert } from "@/components/states";
import { Badge, Button, ButtonLink, Card } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import type { ChallengeWithPeople } from "@/lib/challenges";
import { api } from "@/lib/fetcher";
import type { PublicProfile } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

export function ChallengeView({ challenge: c, viewer }: { challenge: ChallengeWithPeople; viewer: { id: string; attempt_id: string | null; submitted: boolean } }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isReceiver = c.receiver_id === viewer.id;

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const respond = (action: "accept" | "decline" | "cancel") => run(action, async () => { await api(`/api/challenges/${c.id}/respond`, { method: "POST", json: { action } }); router.refresh(); });
  const play = () => run("play", async () => { const { id } = await api<{ id: string }>(`/api/challenges/${c.id}/attempt`, { method: "POST" }); router.push(`/play/${id}`); });

  const done = c.status === "completed";
  const statusTone = { pending: "warn", accepted: "blue", completed: "success", declined: "danger", cancelled: "neutral" } as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="relative overflow-hidden p-6 text-center sm:p-8">
        <div className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand/25 blur-[90px]" />
        <div className="relative">
          <Badge tone={statusTone[c.status]} className="capitalize">{c.status === "accepted" ? "In progress" : c.status}</Badge>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{done ? "Challenge Completed" : "Challenge"}</h1>
          <p className="text-sm text-muted">{c.quiz.title} · {c.quiz.courses?.name} · {c.question_count} questions · {formatDuration(c.duration_seconds)}</p>
          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <Player p={c.sender} score={c.sender_score} correct={c.sender_correct} time={c.sender_time} winner={done && c.winner_id === c.sender_id} total={c.question_count ?? 0} />
            <span className="bg-brand-gradient grid size-12 place-items-center rounded-full shadow-lg"><Swords className="size-5" /></span>
            <Player p={c.receiver} score={c.receiver_score} correct={c.receiver_correct} time={c.receiver_time} winner={done && c.winner_id === c.receiver_id} total={c.question_count ?? 0} />
          </div>
          {done && (
            <p className="mt-6 text-lg font-semibold">
              {c.winner_id ? (c.winner_id === viewer.id ? "You won!" : `@${(c.winner_id === c.sender_id ? c.sender : c.receiver).username} won`) : "It’s a draw!"}
            </p>
          )}
        </div>
      </Card>

      {error && <InlineAlert>{error}</InlineAlert>}

      <Card className="p-5 text-center">
        {c.status === "pending" && isReceiver && (
          <>
            <p className="mb-4 text-sm text-muted">@{c.sender.username} challenged you. Accept to play the same quiz under the same conditions.</p>
            <div className="flex justify-center gap-3">
              <Button size="lg" loading={busy === "accept"} onClick={() => respond("accept")}>Accept</Button>
              <Button size="lg" variant="secondary" loading={busy === "decline"} onClick={() => respond("decline")}>Decline</Button>
            </div>
          </>
        )}
        {c.status === "pending" && !isReceiver && (
          <>
            <p className="flex items-center justify-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Waiting for @{c.receiver.username} to respond…</p>
            <Button variant="ghost" className="mt-3" loading={busy === "cancel"} onClick={() => respond("cancel")}>Cancel challenge</Button>
          </>
        )}
        {c.status === "accepted" && !viewer.submitted && (
          <>
            <p className="mb-4 text-sm text-muted">{viewer.attempt_id ? "Your attempt is in progress — the timer is still running." : "The timer starts when you press Play. Good luck!"}</p>
            <Button size="lg" loading={busy === "play"} onClick={play}><Play className="size-4" /> {viewer.attempt_id ? "Resume" : "Play now"}</Button>
          </>
        )}
        {c.status === "accepted" && viewer.submitted && (
          <p className="flex items-center justify-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> You’ve finished. Waiting for your opponent to complete the challenge…</p>
        )}
        {(done || c.status === "declined" || c.status === "cancelled") && (
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/challenge">Back to challenges</ButtonLink>
            <ButtonLink href="/" variant="secondary">Back to Home</ButtonLink>
          </div>
        )}
      </Card>
    </div>
  );
}

function Player({ p, score, correct, time, winner, total }: { p: PublicProfile; score: number | null; correct: number | null; time: number | null; winner: boolean; total: number }) {
  return (
    <div className={cn("rounded-2xl border p-4 transition", winner ? "border-amber-300/50 bg-amber-300/10" : "border-line bg-white/[0.03]")}>
      <div className="relative mx-auto w-fit">
        <UserAvatar src={p.avatar_url} name={p.username} size="lg" />
        {winner && <Crown className="absolute -top-4 left-1/2 size-6 -translate-x-1/2 text-amber-300" />}
      </div>
      <p className="mt-2 truncate font-semibold">@{p.username}</p>
      {score != null ? (
        <dl className="mt-3 grid grid-cols-3 gap-1 text-xs">
          <div><dt className="text-muted">Score</dt><dd className="font-display text-base font-bold">{score}</dd></div>
          <div><dt className="text-muted">Correct</dt><dd className="font-display text-base font-bold">{correct}/{total}</dd></div>
          <div><dt className="text-muted">Time</dt><dd className="font-display text-base font-bold">{formatDuration(time ?? 0)}</dd></div>
        </dl>
      ) : (
        <p className="mt-3 text-xs text-muted">Not finished</p>
      )}
    </div>
  );
}
