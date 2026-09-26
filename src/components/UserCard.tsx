import type { ReactNode } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { isOnline } from "@/lib/constants";

export function UserCard({ user, action }: { user: { username: string | null; display_name: string | null; avatar_url: string | null; last_seen_at?: string | null; level?: number; institution_name?: string | null }; action?: ReactNode }) {
  const online = isOnline(user.last_seen_at);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.02] p-3">
      <UserAvatar src={user.avatar_url} name={user.username} size="md" online={online} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{user.display_name}</p>
        <p className="truncate text-xs text-muted">@{user.username}{user.level ? ` · Lv ${user.level}` : ""} · <span className={online ? "text-emerald-400" : ""}>{online ? "Online" : "Offline"}</span></p>
      </div>
      {action}
    </div>
  );
}
