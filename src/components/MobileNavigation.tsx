"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, Search, Settings, Shield, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MOBILE_TABS, NAV_ITEMS, isActive } from "@/components/nav";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useProfile } from "@/components/ProfileProvider";
import { SearchBar } from "@/components/SearchBar";
import { useSignOut } from "@/components/UserMenu";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const pathname = usePathname();
  const profile = useProfile();
  const signOut = useSignOut();

  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bg/80 px-3 backdrop-blur-xl md:hidden">
        <button onClick={() => setMenu(true)} aria-label="Open menu" className="grid size-11 place-items-center rounded-xl text-white/80 hover:bg-white/10">
          <Menu className="size-5" />
        </button>
        <Logo className="mr-auto" />
        <button onClick={() => setSearch((s) => !s)} aria-label="Search" className="grid size-11 place-items-center rounded-xl text-white/80 hover:bg-white/10">
          <Search className="size-5" />
        </button>
        <NotificationPanel />
      </header>
      {search && (
        <div className="animate-fade-in sticky top-16 z-30 border-b border-line bg-bg/95 p-3 backdrop-blur-xl md:hidden">
          <SearchBar autoFocus onNavigate={() => setSearch(false)} />
        </div>
      )}
      {menu && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenu(false)} />
          <div className="animate-fade-up absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col border-r border-line bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button onClick={() => setMenu(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-xl hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <Link href="/profile" className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] p-3">
              <UserAvatar src={profile.avatar_url} name={profile.username} size="lg" online />
              <div className="min-w-0">
                <p className="truncate font-semibold">{profile.display_name}</p>
                <p className="truncate text-sm text-muted">@{profile.username} · Lv {profile.level}</p>
              </div>
            </Link>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium", isActive(pathname, item) ? "bg-brand/20 text-white" : "text-white/75 hover:bg-white/[0.05]")}
                >
                  <item.icon className="size-5" /> {item.label}
                </Link>
              ))}
              <Link href="/settings" className="flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-white/75 hover:bg-white/[0.05]">
                <Settings className="size-5" /> Settings
              </Link>
              {profile.role === "admin" && (
                <Link href="/admin" className="flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-white/75 hover:bg-white/[0.05]">
                  <Shield className="size-5" /> Admin
                </Link>
              )}
            </nav>
            <button onClick={signOut} className="mt-2 flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-rose-300 hover:bg-danger/10">
              <LogOut className="size-5" /> Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      {MOBILE_TABS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-white" : "text-muted")}>
            <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-brand/25")}>
              <item.icon className={cn("size-5", active && "text-violet-300")} />
            </span>
            {item.label === "Single Quiz" ? "Quiz" : item.label === "Challenge Quiz" ? "Challenge" : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
