"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Profile } from "@/lib/types";

const ProfileContext = createContext<Profile | null>(null);

export function ProfileProvider({ profile, children }: { profile: Profile; children: ReactNode }) {
  useEffect(() => {
    const ping = () => document.visibilityState === "visible" && fetch("/api/presence", { method: "POST" }).catch(() => {});
    ping();
    const id = setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Profile {
  const p = useContext(ProfileContext);
  if (!p) throw new Error("useProfile must be used inside ProfileProvider");
  return p;
}
