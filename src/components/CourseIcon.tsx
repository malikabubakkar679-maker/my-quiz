import { BookOpen, Braces, Code, Cpu, FlaskConical, Globe, GraduationCap, Palette, Sigma, Terminal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  braces: Braces,
  code: Code,
  cpu: Cpu,
  "flask-conical": FlaskConical,
  globe: Globe,
  palette: Palette,
  sigma: Sigma,
  terminal: Terminal,
};

const tints = ["from-violet-500/30 to-indigo-500/10", "from-sky-500/30 to-blue-500/10", "from-fuchsia-500/30 to-violet-500/10", "from-emerald-500/25 to-teal-500/10", "from-amber-500/25 to-orange-500/10"];

export const COURSE_ICON_NAMES = Object.keys(icons);

export function CourseIcon({ icon, seed = "", className }: { icon?: string | null; seed?: string; className?: string }) {
  const Icon = (icon && icons[icon]) || GraduationCap;
  const tint = tints[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % tints.length];
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br", tint, className)}>
      <Icon className="size-1/2 text-white" />
    </span>
  );
}
