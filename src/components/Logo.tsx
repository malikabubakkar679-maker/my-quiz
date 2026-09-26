import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id="mq-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#mq-g)" />
      <path d="M11 28V13l9 9 9-9v15" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="29.5" cy="29" r="2.2" fill="white" />
    </svg>
  );
}

export function Logo({ collapsed = false, href = "/", className }: { collapsed?: boolean; href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 font-display", className)} aria-label="My Quiz home">
      <LogoMark />
      {!collapsed && <span className="text-lg font-bold tracking-tight whitespace-nowrap">My Quiz</span>}
    </Link>
  );
}
