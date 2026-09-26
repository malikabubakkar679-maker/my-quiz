"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Award, Bell, CheckCheck, Swords, Trophy, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui";
import { api } from "@/lib/fetcher";
import type { AppNotification } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const icons: Record<string, typeof Bell> = {
  challenge_request: Swords,
  challenge_accepted: Swords,
  challenge_declined: Swords,
  challenge_completed: Trophy,
  room_invitation: Users,
  quiz_result: Trophy,
  achievement: Award,
  level_up: TrendingUp,
};

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ notifications: AppNotification[]; unread: number }>("/api/notifications");
      setItems(d.notifications);
      setUnread(d.unread);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const markAll = async () => {
    setUnread(0);
    setItems((xs) => xs?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null);
    await api("/api/notifications", { method: "POST", json: {} }).catch(load);
  };
  const markOne = (n: AppNotification) => {
    setOpen(false);
    if (n.read_at) return;
    setUnread((u) => Math.max(0, u - 1));
    setItems((xs) => xs?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? null);
    api("/api/notifications", { method: "POST", json: { ids: [n.id] } }).catch(() => {});
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative grid size-11 place-items-center rounded-xl border border-line bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08] hover:text-white"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="bg-brand-gradient absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-bg">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-fade-in glass fixed inset-x-3 top-16 z-40 rounded-2xl bg-surface/95 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs text-violet-300 hover:text-white">
                <CheckCheck className="size-4" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {error && <p className="p-3 text-sm text-rose-300">Couldn’t load notifications.</p>}
            {!items && !error && [0, 1, 2].map((i) => <Skeleton key={i} className="m-1 h-14" />)}
            {items?.length === 0 && <p className="p-6 text-center text-sm text-muted">You’re all caught up.</p>}
            {items?.map((n) => {
              const Icon = icons[n.type] ?? Bell;
              const inner = (
                <>
                  <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", n.read_at ? "bg-white/[0.05] text-muted" : "bg-brand/20 text-violet-300")}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", !n.read_at && "font-semibold")}>{n.title}</span>
                    {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
                    <span className="text-[11px] text-muted/80">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read_at && <span className="mt-2 size-2 rounded-full bg-brand" />}
                </>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => markOne(n)} className="flex gap-3 rounded-xl p-2.5 hover:bg-white/[0.06]">
                  {inner}
                </Link>
              ) : (
                <button key={n.id} onClick={() => markOne(n)} className="flex w-full gap-3 rounded-xl p-2.5 text-left hover:bg-white/[0.06]">
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
