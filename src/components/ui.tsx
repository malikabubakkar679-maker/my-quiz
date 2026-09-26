import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-gradient text-white shadow-[0_8px_24px_-10px_rgba(124,92,255,0.8)] hover:brightness-110",
  secondary: "bg-white/[0.06] text-white border border-line hover:bg-white/[0.1]",
  ghost: "text-muted hover:text-white hover:bg-white/[0.06]",
  danger: "bg-danger/15 text-rose-300 border border-danger/30 hover:bg-danger/25",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand select-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button({ variant, size, loading, className, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant, size, className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass rounded-2xl", className)} {...rest}>
      {children}
    </div>
  );
}

const fieldBase =
  "w-full rounded-xl border border-line bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-muted/70 outline-none transition focus:border-brand/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand/15 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2.5", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(fieldBase, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 [&>option]:bg-surface", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239497c2' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
});

export function Field({ label, hint, error, required, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; required?: boolean; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-white/90">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-400">{error}</p> : hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-white/[0.06] text-white/80 border-line",
  brand: "bg-brand/15 text-violet-300 border-brand/30",
  success: "bg-success/15 text-emerald-300 border-success/30",
  danger: "bg-danger/15 text-rose-300 border-danger/30",
  warn: "bg-warn/15 text-amber-300 border-warn/30",
  blue: "bg-brand-2/15 text-sky-300 border-brand-2/30",
};

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof badgeTones; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", badgeTones[tone], className)}>{children}</span>;
}

export function DifficultyBadge({ value }: { value: string }) {
  const tone = value === "easy" ? "success" : value === "hard" ? "danger" : "warn";
  return <Badge tone={tone} className="capitalize">{value}</Badge>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-xl border border-line bg-white/[0.03] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 rounded-lg px-4 text-sm font-medium transition",
            value === o.value ? "bg-brand-gradient text-white shadow" : "text-muted hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TabLinks({ value, options, className }: { value: string; options: { value: string; label: string; href: string }[]; className?: string }) {
  return (
    <div className={cn("scrollbar-none inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-white/[0.03] p-1", className)}>
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          scroll={false}
          aria-current={value === o.value ? "page" : undefined}
          className={cn(
            "flex h-9 shrink-0 items-center rounded-lg px-4 text-sm font-medium whitespace-nowrap transition",
            value === o.value ? "bg-brand-gradient text-white shadow" : "text-muted hover:text-white",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function Stat({ label, value, icon, className }: { label: string; value: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line bg-white/[0.03] p-4", className)}>
      <div className="flex items-center gap-2 text-xs text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
