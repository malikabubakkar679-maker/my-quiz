"use client";

import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ProfileForm } from "@/components/ProfileForm";
import { useSignOut } from "@/components/UserMenu";
import type { Profile } from "@/lib/types";

export function Onboarding({ profile }: { profile: Profile }) {
  const signOut = useSignOut();
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8 sm:py-14">
      <div className="mb-8 flex w-full max-w-2xl items-center justify-between">
        <Logo />
        <button onClick={signOut} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
          <LogOut className="size-4" /> Log out
        </button>
      </div>
      <div className="glass animate-fade-up w-full max-w-2xl rounded-3xl p-6 sm:p-8">
        <p className="text-gradient text-sm font-semibold tracking-wider uppercase">Welcome to My Quiz</p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Set up your player profile</h1>
        <p className="mt-2 mb-6 text-sm text-muted">This is how other players will see you in rooms, challenges and leaderboards.</p>
        <ProfileForm profile={profile} mode="onboarding" />
      </div>
    </div>
  );
}
