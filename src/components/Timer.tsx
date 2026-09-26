import { Clock } from "lucide-react";
import { clock, cn } from "@/lib/utils";

export function Timer({ seconds, total }: { seconds: number; total: number }) {
  const low = seconds <= 30;
  const pct = total ? Math.max(0, Math.min(100, (seconds / total) * 100)) : 0;
  return (
    <div
      role="timer"
      aria-label={`${Math.ceil(seconds)} seconds remaining`}
      className={cn("relative flex h-10 items-center gap-2 overflow-hidden rounded-xl border px-3 font-mono text-sm font-semibold tabular-nums", low ? "border-danger/40 text-rose-300" : "border-line text-white")}
    >
      <span className={cn("absolute inset-y-0 left-0 opacity-20 transition-[width] duration-1000 ease-linear", low ? "bg-danger" : "bg-brand")} style={{ width: `${pct}%` }} />
      <Clock className={cn("relative size-4", low && "animate-pulse")} />
      <span className="relative">{clock(seconds)}</span>
    </div>
  );
}
