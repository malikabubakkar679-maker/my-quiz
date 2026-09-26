import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Banned } from "@/components/Banned";
import { Onboarding } from "@/components/Onboarding";
import { getCurrentProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  if (profile.is_banned) return <Banned />;
  if (!profile.onboarding_completed) return <Onboarding profile={profile} />;
  return <AppShell profile={profile}>{children}</AppShell>;
}
