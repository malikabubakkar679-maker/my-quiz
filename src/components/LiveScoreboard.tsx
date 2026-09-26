import { UserAvatar } from "@/components/UserAvatar";
import type { RoomState } from "@/lib/rooms";
import { cn, formatDuration } from "@/lib/utils";

export function LiveScoreboard({ participants, highlight, compact }: { participants: RoomState["participants"]; highlight?: string; compact?: boolean }) {
  if (!participants.length) return <p className="p-4 text-center text-sm text-muted">No players yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 text-right font-medium">Correct</th>
            <th className="px-3 py-2 text-right font-medium">Score</th>
            {!compact && <th className="px-3 py-2 text-right font-medium">Time</th>}
          </tr>
        </thead>
        <tbody>
          {participants.map((p, i) => (
            <tr key={p.id} className={cn("border-t border-line transition-colors", p.user_id === highlight && "bg-brand/10")}>
              <td className="px-3 py-2.5 font-display font-bold text-muted">{i + 1}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <UserAvatar src={p.profile.avatar_url} name={p.profile.username} size="xs" />
                  <span className="max-w-28 truncate font-medium">@{p.profile.username}</span>
                  {p.status === "finished" && <span className="size-1.5 rounded-full bg-success" title="Finished" />}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{p.correct_answers}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{p.score}</td>
              {!compact && <td className="px-3 py-2.5 text-right text-muted tabular-nums">{p.status === "finished" ? formatDuration(p.total_time) : `${p.answered} answered`}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
