import Link from "next/link";
import { Award, BarChart3, Building2, Crown, DoorOpen, Gamepad2, MapPin, Rocket, Sparkles, Star, Swords, Target, Trophy, Zap } from "lucide-react";
import { EmptyState } from "@/components/states";
import { Badge, ButtonLink, Card, Stat, TabLinks } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { isOnline, xpForLevel } from "@/lib/constants";
import { PROFILE_TABS, type ProfileTab, type getProfileData } from "@/lib/profile-data";
import type { PublicProfile } from "@/lib/types";
import { cn, formatDuration, timeAgo } from "@/lib/utils";

type Data = Awaited<ReturnType<typeof getProfileData>>;
const achIcons: Record<string, typeof Award> = { sparkles: Sparkles, trophy: Trophy, rocket: Rocket, star: Star, crown: Crown, swords: Swords, target: Target, zap: Zap };

export function ProfileView({ profile, data, tab, basePath, isMe }: { profile: PublicProfile; data: Data; tab: ProfileTab; basePath: string; isMe: boolean }) {
  const cur = xpForLevel(profile.level);
  const next = xpForLevel(profile.level + 1);
  const pct = Math.round(((profile.xp - cur) / Math.max(1, next - cur)) * 100);
  const online = isOnline(profile.last_seen_at) || isMe;
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -top-24 -left-24 size-72 rounded-full bg-brand/25 blur-[90px]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <UserAvatar src={profile.avatar_url} name={profile.username} size="xl" online={online} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{profile.display_name}</h1>
              <Badge tone="brand">Level {profile.level}</Badge>
            </div>
            <p className="text-muted">@{profile.username}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {profile.institution_name && <span className="flex items-center gap-1.5"><Building2 className="size-4" /> {profile.institution_name} <span className="capitalize">({profile.institution_type})</span></span>}
              {(profile.city || profile.country) && <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {[profile.city, profile.country].filter(Boolean).join(", ")}</span>}
            </div>
            {profile.bio && <p className="mt-3 max-w-2xl text-sm text-white/80">{profile.bio}</p>}
            <div className="mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-xs text-muted"><span>{profile.xp.toLocaleString()} XP</span><span>{next.toLocaleString()} XP to Lv {profile.level + 1}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="bg-brand-gradient h-full rounded-full" style={{ width: `${Math.max(2, pct)}%` }} /></div>
            </div>
          </div>
          <div className="flex gap-2 sm:self-start">
            {isMe ? <ButtonLink href="/settings" variant="secondary">Edit profile</ButtonLink> : <ButtonLink href="/challenge"><Swords className="size-4" /> Challenge</ButtonLink>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="XP" icon={<Sparkles className="size-3.5" />} value={profile.xp.toLocaleString()} />
        <Stat label="Total quizzes" icon={<Gamepad2 className="size-3.5" />} value={profile.total_quizzes} />
        <Stat label="Total score" icon={<Target className="size-3.5" />} value={profile.total_score.toLocaleString()} />
        <Stat label="Wins" icon={<Trophy className="size-3.5" />} value={profile.total_wins} />
        <Stat label="Challenges" icon={<Swords className="size-3.5" />} value={profile.total_challenges} />
        <Stat label="Created rooms" icon={<DoorOpen className="size-3.5" />} value={data.roomsCreated} />
      </div>

      <TabLinks value={tab} options={PROFILE_TABS.map((t) => ({ ...t, href: t.value === "overview" ? basePath : `${basePath}?tab=${t.value}` }))} />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-5"><h2 className="mb-3 font-semibold">Recent quiz activity</h2><History rows={data.recent} linkable={isMe} /></Card>
          <Card className="p-5"><h2 className="mb-3 font-semibold">Achievements</h2><Achievements items={"achievements" in data ? data.achievements ?? [] : []} compact /></Card>
        </div>
      )}
      {tab === "history" && <Card className="p-5"><History rows={data.recent} linkable={isMe} /></Card>}
      {tab === "achievements" && <Achievements items={"achievements" in data ? data.achievements ?? [] : []} />}
      {tab === "statistics" && "stats" in data && data.stats && (
        data.stats.attempts === 0 ? <EmptyState icon={<BarChart3 className="size-6" />} title="No statistics yet" description="Complete quizzes to build up your stats." /> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">Accuracy by course</h2>
              <div className="space-y-3">
                {data.stats.courses.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex justify-between text-sm"><span>{c.name}</span><span className="text-muted">{c.accuracy}% · {c.attempts} attempts</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="bg-brand-gradient h-full rounded-full" style={{ width: `${c.accuracy}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid h-fit grid-cols-2 gap-3">
              <Stat label="Overall accuracy" value={`${data.stats.accuracy}%`} />
              <Stat label="Time played" value={formatDuration(data.stats.totalTime)} />
              <Stat label="Single quizzes" value={data.stats.byMode.single ?? 0} />
              <Stat label="Room quizzes" value={data.stats.byMode.room ?? 0} />
              <Stat label="Challenge quizzes" value={data.stats.byMode.challenge ?? 0} />
              <Stat label="Attempts" value={data.stats.attempts} />
            </div>
          </div>
        )
      )}
      {tab === "challenges" && "challenges" in data && (
        data.challenges?.length ? (
          <Card className="divide-y divide-line">
            {data.challenges.map((c) => {
              const opp = c.sender_id === profile.id ? c.receiver : c.sender;
              const won = c.winner_id === profile.id;
              return (
                <Link key={c.id} href={isMe ? `/challenge/${c.id}` : `/u/${opp.username}`} className="flex items-center gap-3 p-4 hover:bg-white/[0.03]">
                  <UserAvatar src={opp.avatar_url} name={opp.username} size="sm" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">vs @{opp.username}</p><p className="truncate text-xs text-muted">{c.quiz.title} · {c.completed_at ? timeAgo(c.completed_at) : ""}</p></div>
                  <Badge tone={won ? "success" : c.winner_id ? "danger" : "neutral"}>{won ? "Won" : c.winner_id ? "Lost" : "Draw"}</Badge>
                </Link>
              );
            })}
          </Card>
        ) : <EmptyState icon={<Swords className="size-6" />} title="No completed challenges yet" />
      )}
      {tab === "rooms" && "rooms" in data && data.rooms && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Created rooms</h2>
            {data.rooms.created.length ? (
              <ul className="divide-y divide-line">
                {data.rooms.created.map((r) => <RoomRow key={r.id} room={r as unknown as RoomLite} linkable={isMe} />)}
              </ul>
            ) : <EmptyState title="No rooms created" />}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Joined rooms</h2>
            {data.rooms.joined.length ? (
              <ul className="divide-y divide-line">
                {data.rooms.joined.map((p, i) => <RoomRow key={i} room={p.rooms as unknown as RoomLite} extra={`${p.score} pts`} linkable={isMe} />)}
              </ul>
            ) : <EmptyState title="No rooms joined" />}
          </Card>
        </div>
      )}
    </div>
  );
}

type RoomLite = { id: string; room_code: string; room_name: string; status: string; created_at: string; courses: { name: string } | null };

function RoomRow({ room, extra, linkable }: { room: RoomLite; extra?: string; linkable: boolean }) {
  if (!room) return null;
  const inner = (
    <>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{room.room_name}</p><p className="text-xs text-muted">{room.courses?.name} · {timeAgo(room.created_at)}</p></div>
      {extra && <span className="text-sm tabular-nums">{extra}</span>}
      <Badge className="capitalize">{room.status.replace("_", " ")}</Badge>
    </>
  );
  return <li>{linkable ? <Link href={`/rooms/${room.room_code}`} className="flex items-center gap-3 py-3 hover:opacity-80">{inner}</Link> : <div className="flex items-center gap-3 py-3">{inner}</div>}</li>;
}

function History({ rows, linkable }: { rows: Data["recent"]; linkable: boolean }) {
  if (!rows.length) return <EmptyState title="No quizzes yet" description="Completed quizzes will appear here." />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const pct = r.max_score ? Math.round((r.score / r.max_score) * 100) : 0;
        const inner = (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.quizzes?.title}</p>
              <p className="text-xs text-muted"><span className="capitalize">{r.mode}</span> · {r.quizzes?.courses?.name} · {timeAgo(r.completed_at)}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold">{r.score}/{r.max_score}</p>
              <p className={cn("text-xs", pct >= 70 ? "text-emerald-300" : pct >= 40 ? "text-amber-300" : "text-rose-300")}>{pct}% · {formatDuration(r.total_time)}</p>
            </div>
          </>
        );
        return <li key={r.id}>{linkable ? <Link href={`/results/${r.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">{inner}</Link> : <div className="flex items-center gap-3 py-3">{inner}</div>}</li>;
      })}
    </ul>
  );
}

function Achievements({ items, compact }: { items: { id: string; name: string; description: string; icon: string; unlocked_at: string | null }[]; compact?: boolean }) {
  if (!items.length) return <EmptyState title="No achievements available" />;
  const list = compact ? [...items].sort((a, b) => Number(!!b.unlocked_at) - Number(!!a.unlocked_at)).slice(0, 4) : items;
  return (
    <div className={cn("grid gap-3", !compact && "sm:grid-cols-2 lg:grid-cols-3")}>
      {list.map((a) => {
        const Icon = achIcons[a.icon] ?? Award;
        return (
          <div key={a.id} className={cn("flex items-center gap-3 rounded-2xl border p-3", a.unlocked_at ? "border-brand/30 bg-brand/10" : "border-line bg-white/[0.02] opacity-60")}>
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", a.unlocked_at ? "bg-brand-gradient" : "bg-white/[0.06]")}><Icon className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{a.name}</p>
              <p className="text-xs text-muted">{a.unlocked_at ? `Unlocked ${timeAgo(a.unlocked_at)}` : a.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
