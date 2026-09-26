"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("animate-fade-up glass relative w-full max-w-md rounded-t-3xl bg-surface/95 p-6 sm:rounded-2xl", className)}>
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
          <button onClick={onClose} aria-label="Close" className="ml-auto grid size-9 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
