"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

export function LoadingScreen({ fading = false }: { fading?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading My Quiz"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-bg transition-opacity duration-300",
        fading && "pointer-events-none opacity-0",
      )}
      style={{ background: "radial-gradient(600px 400px at 50% 40%, rgb(124 92 255 / 0.22), transparent 70%), #07071a" }}
    >
      <div className="animate-pop">
        <LogoMark className="size-20 drop-shadow-[0_0_30px_rgba(124,92,255,0.6)]" />
      </div>
      <p className="animate-fade-up font-display text-2xl font-bold tracking-[0.3em] [animation-delay:120ms]">MY QUIZ</p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="bg-brand-gradient h-full w-2/5 rounded-full" style={{ animation: "loader 1.1s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

/** Full-screen branded splash shown once per browser session until the app has hydrated. */
export function Splash() {
  const [state, setState] = useState<"show" | "fade" | "gone">("show");
  useEffect(() => {
    const seen = sessionStorage.getItem("mq-splash");
    if (seen) {
      setState("gone");
      return;
    }
    sessionStorage.setItem("mq-splash", "1");
    const t1 = setTimeout(() => setState("fade"), 650);
    const t2 = setTimeout(() => setState("gone"), 950);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  if (state === "gone") return null;
  return <LoadingScreen fading={state === "fade"} />;
}
