"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { LogOut, Settings, Shield, User } from "lucide-react";
import { useProfile } from "@/components/ProfileProvider";
import { UserAvatar } from "@/components/UserAvatar";

export function useSignOut() {
  const { signOut } = useClerk();
  return () => {
    sessionStorage.removeItem("mq-splash");
    signOut({ redirectUrl: "/sign-in" });
  };
}

export function UserMenu() {
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const signOut = useSignOut();
  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const item = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/[0.07] hover:text-white";
  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Open profile menu" aria-expanded={open} className="rounded-full focus-visible:outline-2 focus-visible:outline-brand">
        <UserAvatar src={profile.avatar_url} name={profile.username} size="md" online />
      </button>
      {open && (
        <div className="animate-fade-in glass absolute top-full right-0 z-40 mt-2 w-60 rounded-2xl bg-surface/95 p-2" onClick={() => setOpen(false)}>
          <div className="flex items-center gap-3 border-b border-line px-2 pt-1 pb-3">
            <UserAvatar src={profile.avatar_url} name={profile.username} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.display_name}</p>
              <p className="truncate text-xs text-muted">@{profile.username} · Lv {profile.level}</p>
            </div>
          </div>
          <div className="pt-2">
            <Link href="/profile" className={item}><User className="size-4" /> Profile</Link>
            <Link href="/settings" className={item}><Settings className="size-4" /> Settings</Link>
            {profile.role === "admin" && <Link href="/admin" className={item}><Shield className="size-4" /> Admin</Link>}
            <button onClick={signOut} className={`${item} w-full text-rose-300`}><LogOut className="size-4" /> Log out</button>
          </div>
        </div>
      )}
    </div>
  );
}
