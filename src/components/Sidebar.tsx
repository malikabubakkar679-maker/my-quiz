"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsLeft, LogOut, Settings, Shield, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NAV_ITEMS, isActive } from "@/components/nav";
import { useProfile } from "@/components/ProfileProvider";
import { useSignOut } from "@/components/UserMenu";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const profile = useProfile();
  const signOut = useSignOut();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mq-sidebar");
    setCollapsed(saved ? saved === "1" : window.innerWidth < 1280);
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      localStorage.setItem("mq-sidebar", c ? "0" : "1");
      return !c;
    });

  const link = (active: boolean) =>
    cn(
      "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
      active ? "bg-gradient-to-r from-brand/25 to-brand-2/10 text-white" : "text-muted hover:bg-white/[0.05] hover:text-white",
    );

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface/40 backdrop-blur-xl transition-[width] duration-300 ease-out md:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
        <Logo collapsed={collapsed} />
        {!collapsed && (
          <button onClick={toggle} aria-label="Collapse sidebar" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-white">
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <button onClick={toggle} aria-label="Expand sidebar" className="mx-auto mb-2 grid size-8 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-white">
          <ChevronsLeft className="size-4 rotate-180" />
        </button>
      )}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link key={item.href} href={item.href} className={link(active)} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined}>
              {active && <span className="bg-brand-gradient absolute top-2 bottom-2 left-0 w-1 rounded-r-full" />}
              <item.icon className={cn("size-5 shrink-0", active && "text-violet-300")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
        {profile.role === "admin" && (
          <Link href="/admin" className={link(pathname.startsWith("/admin"))} title={collapsed ? "Admin" : undefined}>
            <Shield className="size-5 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>
      <div className="border-t border-line p-3">
        <div className={cn("mb-2 flex items-center gap-3 rounded-xl p-2", collapsed && "justify-center")}>
          <UserAvatar src={profile.avatar_url} name={profile.username} size="md" online />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">@{profile.username}</p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" /> Online
              </p>
            </div>
          )}
        </div>
        <div className={cn("grid gap-1", collapsed ? "grid-cols-1" : "grid-cols-3")}>
          {[
            { href: "/profile", label: "Profile", icon: User },
            { href: "/settings", label: "Settings", icon: Settings },
          ].map((i) => (
            <Link key={i.href} href={i.href} title={i.label} aria-label={i.label} className="grid h-9 place-items-center rounded-lg text-muted hover:bg-white/[0.06] hover:text-white">
              <i.icon className="size-4" />
            </Link>
          ))}
          <button onClick={signOut} title="Log out" aria-label="Log out" className="grid h-9 place-items-center rounded-lg text-muted hover:bg-danger/15 hover:text-rose-300">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
