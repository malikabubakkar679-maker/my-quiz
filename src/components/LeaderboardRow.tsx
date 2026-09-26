import Link from "next/link";
import { Crown, Medal } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import type { LeaderboardEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LeaderboardTable({ entries, me, showCountry }: { entries: LeaderboardEntry[]; me: string; showCountry?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Player</th>
            {showCountry && <th className="px-4 py-3 font-medium">Country</th>}
            <th className="px-4 py-3 text-right font-medium">Level</th>
            <th className="px-4 py-3 text-right font-medium">XP</th>
            <th className="px-4 py-3 text-right font-medium">Score</th>
            <th className="px-4 py-3 text-right font-medium">Quizzes</th>
            <th className="px-4 py-3 text-right font-medium">Wins</th>
          </tr>
        </thead>
        <tbody>{entries.map((e) => <LeaderboardRow key={e.profile_id} entry={e} me={me} showCountry={showCountry} />)}</tbody>
      </table>
    </div>
  );
}

export function LeaderboardRow({ entry: e, me, showCountry }: { entry: LeaderboardEntry; me: string; showCountry?: boolean }) {
  return (
    <tr className={cn("border-t border-line transition hover:bg-white/[0.03]", e.profile_id === me && "bg-brand/10")}>
      <td className="px-4 py-3 font-display font-bold text-muted">#{e.rank}</td>
      <td className="px-4 py-3">
        <Link href={`/u/${e.username}`} className="flex items-center gap-3">
          <UserAvatar src={e.avatar_url} name={e.username} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{e.display_name}</span>
            <span className="block truncate text-xs text-muted">@{e.username}</span>
          </span>
        </Link>
      </td>
      {showCountry && <td className="px-4 py-3 text-muted">{e.country ?? "—"}</td>}
      <td className="px-4 py-3 text-right tabular-nums">{e.level}</td>
      <td className="px-4 py-3 text-right tabular-nums">{e.xp.toLocaleString()}</td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums">{e.score.toLocaleString()}</td>
      <td className="px-4 py-3 text-right tabular-nums">{e.quizzes}</td>
      <td className="px-4 py-3 text-right tabular-nums">{e.wins}</td>
    </tr>
  );
}

export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const order = [entries[1], entries[0], entries[2]];
  const styles = [
    { h: "h-24", ring: "ring-slate-300/60", color: "text-slate-300", icon: Medal },
    { h: "h-32", ring: "ring-amber-300/80", color: "text-amber-300", icon: Crown },
    { h: "h-20", ring: "ring-orange-400/60", color: "text-orange-400", icon: Medal },
  ];
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((e, i) => {
        const s = styles[i];
        if (!e) return <div key={i} />;
        return (
          <Link key={e.profile_id} href={`/u/${e.username}`} className="animate-fade-up flex flex-col items-center text-center" style={{ animationDelay: `${i * 80}ms` }}>
            <s.icon className={cn("mb-1 size-6", s.color)} />
            <UserAvatar src={e.avatar_url} name={e.username} size={i === 1 ? "xl" : "lg"} className={cn("rounded-full ring-4", s.ring)} />
            <p className="mt-2 max-w-full truncate text-sm font-semibold">@{e.username}</p>
            <p className="text-xs text-muted">{e.score.toLocaleString()} pts</p>
            <div className={cn("mt-3 flex w-full items-start justify-center rounded-t-2xl border border-b-0 border-line bg-gradient-to-b from-brand/25 to-transparent pt-2 font-display text-2xl font-bold", s.h, s.color)}>
              {e.rank}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
