"use client";

import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui";
import { useSignOut } from "@/components/UserMenu";

export function Banned() {
  const signOut = useSignOut();
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="glass max-w-sm rounded-2xl p-8">
        <ShieldOff className="mx-auto mb-3 size-10 text-rose-400" />
        <h1 className="font-display text-xl font-bold">Account suspended</h1>
        <p className="mt-2 text-sm text-muted">Your My Quiz account has been suspended by an administrator.</p>
        <Button variant="secondary" className="mt-5" onClick={signOut}>Log out</Button>
      </div>
    </div>
  );
}
