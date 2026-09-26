"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCw } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, icon, action, className }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center", className)}>
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-muted">{icon ?? <Inbox className="size-6" />}</div>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong. Please try again.", onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-2xl border border-danger/25 bg-danger/[0.06] px-6 py-10 text-center", className)}>
      <AlertTriangle className="mb-2 size-7 text-rose-400" />
      <p className="text-sm text-rose-200">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="size-4" /> Try again
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({ tone = "danger", children }: { tone?: "danger" | "success" | "info"; children: ReactNode }) {
  const tones = {
    danger: "border-danger/30 bg-danger/10 text-rose-200",
    success: "border-success/30 bg-success/10 text-emerald-200",
    info: "border-brand/30 bg-brand/10 text-violet-200",
  };
  return <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-3.5 py-2.5 text-sm", tones[tone])}>{children}</div>;
}
