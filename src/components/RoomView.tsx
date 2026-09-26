"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Crown, DoorOpen, Loader2, Play, Radio, Share2, Square, Trophy, Users } from "lucide-react";
import { LiveScoreboard } from "@/components/LiveScoreboard";
import { Modal } from "@/components/Modal";
import { EmptyState, ErrorState, InlineAlert } from "@/components/states";
import { Badge, Button, ButtonLink, Card, Skeleton } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { useRoomState } from "@/hooks/useRoomState";
import { isOnline } from "@/lib/constants";
import { api } from "@/lib/fetcher";
import type { RoomState } from "@/lib/rooms";
import { cn } from "@/lib/utils";

const statusBadge = {
  waiting: <Badge tone="blue">Waiting for players</Badge>,
  in_progress: <Badge tone="danger"><span className="size-1.5 animate-pulse rounded-full bg-rose-400" /> Live</Badge>,
  ended: <Badge tone="neutral">Ended</Badge>,
  cancelled: <Badge tone="neutral">Cancelled</Badge>,
};

export function RoomView({ code, justCreated }: { code: string; justCreated: boolean }) {
  const router = useRouter();
  const { state, error, reload, serverOffset } = useRoomState(code);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [created, setCreated] = useState(justCreated);
  const [now, setNow] = useState(() => Date.now());
  const entering = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const viewer = state?.viewer;
  const room = state?.room;
  const shouldEnter = !!room && room.status === "in_progress" && !!viewer && !viewer.is_creator && viewer.participant?.status === "playing" && !viewer.result_id;

  useEffect(() => {
    if (!shouldEnter || entering.current) return;
    entering.current = true;
    api<{ id: string }>(`/api/rooms/${code}/attempt`, { method: "POST" })
      .then(({ id }) => router.push(`/play/${id}`))
      .catch((e) => {
        entering.current = false;
        setActionError((e as Error).message);
      });
  }, [shouldEnter, code, router]);

  if (error) return <div className="mx-auto max-w-md pt-10"><ErrorState message={error.message} onRetry={error.status >= 500 ? reload : undefined} /><div className="mt-4 text-center"><ButtonLink href="/rooms/join" variant="secondary">Join another room</ButtonLink></div></div>;
  if (!state || !room || !viewer) return <RoomSkeleton />;

  const act = async (name: string, path: string) => {
    setBusy(name);
    setActionError(null);
    try {
      await api(`/api/rooms/${code}/${path}`, { method: "POST" });
      await reload();
      if (path === "leave") router.push("/");
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const serverNow = now + serverOffset.current;
  const countdown = room.started_at ? (new Date(room.started_at).getTime() - serverNow) / 1000 : 0;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/rooms/join?code=${room.room_code}` : "";
  const active = state.participants.filter((p) => p.status !== "left");
  const isPlayer = !!viewer.participant;
  const canJoin = !viewer.is_creator && !isPlayer && room.status === "waiting";
  const winner = room.status === "ended" ? active.find((p) => p.status === "finished") : null;

  return (
    <div className="space-y-6">
      {room.status === "in_progress" && countdown > 0 && <CountdownOverlay seconds={countdown} />}
      {created && viewer.is_creator && room.status === "waiting" && (
        <RoomCreatedCard state={state} joinUrl={joinUrl} onClose={() => { setCreated(false); router.replace(`/rooms/${code}`); }} />
      )}

      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-brand/20 blur-[90px]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">{statusBadge[room.status]}<Badge>{state.course?.name}</Badge></div>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{room.room_name}</h1>
            {room.description && <p className="mt-1 text-sm text-muted">{room.description}</p>}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="text-muted">Quiz: <b className="text-white">{state.quiz?.title}</b></span>
              <span className="text-muted">Questions: <b className="text-white">{state.question_count}</b></span>
              <span className="flex items-center gap-1.5 text-muted">Host: <UserAvatar src={state.creator?.avatar_url} name={state.creator?.username} size="xs" /> <b className="text-white">@{state.creator?.username}</b></span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white p-2"><QRCodeSVG value={joinUrl || room.room_code} size={96} /></div>
            <div>
              <p className="text-xs text-muted">Room code</p>
              <p className="font-mono text-2xl font-bold tracking-[0.2em]">{room.room_code}</p>
              <CopyButton value={room.room_code} />
            </div>
          </div>
        </div>
      </Card>

      {actionError && <InlineAlert>{actionError}</InlineAlert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              {room.status === "waiting" ? <><Users className="size-4" /> Players</> : <><Radio className="size-4 text-rose-400" /> {room.status === "ended" ? "Final standings" : "Live competition"}</>}
            </h2>
            <span className="text-sm text-muted">{active.length}/{room.max_players}</span>
          </div>
          {room.status === "waiting" ? (
            active.length ? (
              <ul className="divide-y divide-line">
                {active.map((p) => (
                  <li key={p.id} className="animate-fade-in flex items-center gap-3 px-5 py-3">
                    <UserAvatar src={p.profile.avatar_url} name={p.profile.username} online={isOnline(p.profile.last_seen_at)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.profile.display_name}</p>
                      <p className="truncate text-xs text-muted">@{p.profile.username}</p>
                    </div>
                    <Badge tone="success">Ready</Badge>
                    <span className="w-10 text-right text-sm tabular-nums text-muted">{p.score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState className="m-5" icon={<Users className="size-6" />} title="Waiting for players…" description="Share the room code or QR code so friends can join." />
            )
          ) : (
            <LiveScoreboard participants={active} highlight={viewer.id} />
          )}
        </Card>

        <Card className="h-fit p-5">
          {viewer.is_creator ? (
            room.status === "waiting" ? (
              <>
                <h3 className="font-semibold">Host controls</h3>
                <p className="mt-1 text-sm text-muted">{active.length ? `${active.length} player${active.length > 1 ? "s" : ""} ready. Start when everyone is in.` : "At least one player must join before you can start."}</p>
                <Button size="lg" className="mt-4 w-full" disabled={!active.length} loading={busy === "start"} onClick={() => act("start", "start")}><Play className="size-4" /> Start Quiz</Button>
                <Button variant="ghost" className="mt-2 w-full" loading={busy === "end"} onClick={() => act("end", "end")}>Cancel room</Button>
              </>
            ) : room.status === "in_progress" ? (
              <>
                <h3 className="font-semibold">Quiz in progress</h3>
                <p className="mt-1 text-sm text-muted">{active.filter((p) => p.status === "finished").length} of {active.length} players finished. Scores update live.</p>
                <Button variant="danger" className="mt-4 w-full" loading={busy === "end"} onClick={() => act("end", "end")}><Square className="size-4" /> End quiz now</Button>
              </>
            ) : (
              <Finished winner={winner} />
            )
          ) : canJoin ? (
            <>
              <h3 className="font-semibold">Join this room</h3>
              <p className="mt-1 text-sm text-muted">You’ll be moved into the quiz automatically when the host starts.</p>
              <Button size="lg" className="mt-4 w-full" loading={busy === "join"} onClick={() => act("join", "join")}>Join Room</Button>
            </>
          ) : isPlayer && room.status === "waiting" ? (
            <>
              <div className="flex items-center gap-3"><Loader2 className="size-5 animate-spin text-violet-300" /><h3 className="font-semibold">Waiting for the host to start…</h3></div>
              <p className="mt-2 text-sm text-muted">Stay on this page — the quiz will begin automatically for everyone.</p>
              <Button variant="ghost" className="mt-4 w-full" loading={busy === "leave"} onClick={() => act("leave", "leave")}><DoorOpen className="size-4" /> Leave room</Button>
            </>
          ) : room.status === "in_progress" ? (
            viewer.result_id ? (
              <>
                <h3 className="font-semibold">You’ve finished!</h3>
                <p className="mt-1 text-sm text-muted">Watch the live standings until everyone is done.</p>
                <ButtonLink href={`/results/${viewer.result_id}`} variant="secondary" className="mt-4 w-full">View my result</ButtonLink>
              </>
            ) : isPlayer ? (
              <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Entering quiz…</p>
            ) : (
              <><h3 className="font-semibold">This room has already started.</h3><p className="mt-1 text-sm text-muted">You can watch the live standings.</p></>
            )
          ) : (
            <>
              <Finished winner={winner} />
              {viewer.result_id && <ButtonLink href={`/results/${viewer.result_id}`} variant="secondary" className="mt-3 w-full">View my result</ButtonLink>}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Finished({ winner }: { winner?: RoomState["participants"][number] | null }) {
  return (
    <div className="text-center">
      <Trophy className="mx-auto size-10 text-amber-300" />
      <h3 className="mt-2 font-display text-lg font-semibold">Room finished</h3>
      {winner ? (
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-muted"><Crown className="size-4 text-amber-300" /> Winner: <b className="text-white">@{winner.profile.username}</b></p>
      ) : (
        <p className="mt-1 text-sm text-muted">No players completed this room.</p>
      )}
      <ButtonLink href="/rooms/create" className="mt-4 w-full">Create a new room</ButtonLink>
    </div>
  );
}

function CopyButton({ value, label = "Copy Code" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className={cn("mt-1 inline-flex items-center gap-1.5 text-sm font-medium", done ? "text-emerald-300" : "text-violet-300 hover:text-white")}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? "Copied" : label}
    </button>
  );
}

function RoomCreatedCard({ state, joinUrl, onClose }: { state: RoomState; joinUrl: string; onClose: () => void }) {
  const share = async () => {
    if (navigator.share) await navigator.share({ title: "Join my My Quiz room", text: `Join “${state.room.room_name}” with code ${state.room.room_code}`, url: joinUrl }).catch(() => {});
    else await navigator.clipboard.writeText(joinUrl).catch(() => {});
  };
  return (
    <Modal open onClose={onClose} className="max-w-sm text-center">
      <p className="text-gradient text-sm font-bold tracking-[0.25em] uppercase">Room Created</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-muted">Room Name</dt><dd className="font-display text-lg font-semibold">{state.room.room_name}</dd></div>
        <div className="flex justify-center gap-6">
          <div><dt className="text-muted">Course</dt><dd className="font-medium">{state.course?.name}</dd></div>
          <div><dt className="text-muted">Created by</dt><dd className="font-medium">@{state.creator?.username}</dd></div>
        </div>
      </dl>
      <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3"><QRCodeSVG value={joinUrl} size={168} /></div>
      <p className="mt-2 text-xs text-muted">Scan QR code to join</p>
      <p className="mt-4 text-xs text-muted">Room Code</p>
      <p className="font-mono text-3xl font-bold tracking-[0.25em]">{state.room.room_code}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={share}><Share2 className="size-4" /> Share</Button>
        <Button onClick={async () => { await navigator.clipboard.writeText(state.room.room_code).catch(() => {}); }}><Copy className="size-4" /> Copy Code</Button>
      </div>
      <Link href="#" onClick={(e) => { e.preventDefault(); onClose(); }} className="mt-4 inline-block text-sm text-muted hover:text-white">Go to room dashboard</Link>
    </Modal>
  );
}

function CountdownOverlay({ seconds }: { seconds: number }) {
  const n = Math.ceil(seconds);
  const label = n > 3 ? "Get ready" : n > 0 ? String(n) : "GO";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/90 backdrop-blur-md" role="status" aria-live="assertive">
      <p key={label} className="animate-pop text-gradient font-display text-8xl font-bold sm:text-9xl">{label}</p>
    </div>
  );
}

function RoomSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Skeleton className="h-72" /><Skeleton className="h-44" /></div>
    </div>
  );
}
