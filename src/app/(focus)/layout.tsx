import { redirect } from "next/navigation";
import { ProfileProvider } from "@/components/ProfileProvider";
import { getCurrentProfile } from "@/lib/auth";

export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  if (profile.is_banned || !profile.onboarding_completed) redirect("/");
  return <ProfileProvider profile={profile}>{children}</ProfileProvider>;
}
