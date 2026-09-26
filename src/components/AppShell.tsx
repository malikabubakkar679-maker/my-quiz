"use client";

import type { ReactNode } from "react";
import { MobileHeader, MobileTabBar } from "@/components/MobileNavigation";
import { NotificationPanel } from "@/components/NotificationPanel";
import { ProfileProvider } from "@/components/ProfileProvider";
import { SearchBar } from "@/components/SearchBar";
import { Sidebar } from "@/components/Sidebar";
import { UserMenu } from "@/components/UserMenu";
import type { Profile } from "@/lib/types";

export function Header() {
  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b border-line bg-bg/70 px-6 backdrop-blur-xl md:flex">
      <SearchBar className="w-full max-w-xl" />
      <div className="ml-auto flex items-center gap-3">
        <NotificationPanel />
        <UserMenu />
      </div>
    </header>
  );
}

export function AppShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  return (
    <ProfileProvider profile={profile}>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <MobileHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-12 lg:px-8">{children}</main>
        </div>
      </div>
      <MobileTabBar />
    </ProfileProvider>
  );
}
