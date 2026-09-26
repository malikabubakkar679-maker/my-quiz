import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = { xs: 24, sm: 32, md: 40, lg: 56, xl: 96 } as const;

export function UserAvatar({
  src,
  name,
  size = "md",
  online,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof sizes;
  online?: boolean;
  className?: string;
}) {
  const px = sizes[size];
  const initials = (name ?? "?").replace(/^@/, "").slice(0, 2).toUpperCase();
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: px, height: px }}>
      {src ? (
        <Image src={src} alt={name ?? "avatar"} width={px} height={px} unoptimized className="size-full rounded-full object-cover ring-2 ring-white/10" />
      ) : (
        <span className="bg-brand-gradient grid size-full place-items-center rounded-full text-xs font-bold text-white ring-2 ring-white/10" style={{ fontSize: px * 0.36 }}>
          {initials}
        </span>
      )}
      {online !== undefined && (
        <span
          aria-label={online ? "Online" : "Offline"}
          className={cn("absolute right-0 bottom-0 rounded-full ring-2 ring-bg", online ? "bg-success" : "bg-white/30")}
          style={{ width: Math.max(8, px * 0.26), height: Math.max(8, px * 0.26) }}
        />
      )}
    </span>
  );
}
