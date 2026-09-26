import { Check, Trophy } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto hidden h-72 w-full max-w-sm sm:block" aria-hidden>
      <div className="absolute inset-0 m-auto size-56 rounded-full bg-gradient-to-br from-brand/40 to-brand-2/30 blur-2xl" />
      <div className="animate-float absolute inset-0 m-auto grid size-40 place-items-center rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/15 to-white/[0.03] shadow-[0_30px_80px_-20px_rgba(124,92,255,0.8)] backdrop-blur-xl">
        <Trophy className="size-20 text-amber-300 drop-shadow-[0_0_24px_rgba(252,211,77,0.6)]" strokeWidth={1.5} />
      </div>
      <div className="animate-float absolute top-2 left-0 rounded-2xl border border-white/10 bg-surface/80 p-3 text-xs shadow-xl backdrop-blur [animation-delay:-2s]">
        <p className="text-muted">Question 3 of 10</p>
        <p className="mt-1 font-semibold">What does HTML stand for?</p>
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-success/15 px-2 py-1 text-emerald-300"><Check className="size-3" /> HyperText Markup Language</p>
      </div>
      <div className="animate-float absolute right-0 bottom-4 rounded-2xl border border-white/10 bg-surface/80 p-3 text-xs shadow-xl backdrop-blur [animation-delay:-4s]">
        <p className="text-muted">Live room</p>
        <div className="mt-2 space-y-1.5">
          {["#1 @nova · 90", "#2 @kai · 80", "#3 @mira · 70"].map((r) => <p key={r} className="font-mono">{r}</p>)}
        </div>
      </div>
    </div>
  );
}
