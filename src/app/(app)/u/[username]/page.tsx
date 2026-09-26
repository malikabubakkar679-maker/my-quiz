import { notFound, redirect } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { pageProfile } from "@/lib/auth";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/constants";
import { getProfileData, parseTab } from "@/lib/profile-data";
import { db } from "@/lib/supabase/admin";
import type { PublicProfile } from "@/lib/types";

export default async function UserPage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> }) {
  const me = await pageProfile();
  const [{ username }, sp] = await Promise.all([params, searchParams]);
  const name = decodeURIComponent(username).toLowerCase();
  if (name === me.username) redirect(`/profile${sp.tab ? `?tab=${sp.tab}` : ""}`);
  const { data: user } = await db().from("profiles").select(PUBLIC_PROFILE_COLUMNS).eq("username", name).eq("onboarding_completed", true).eq("is_banned", false).maybeSingle<PublicProfile>();
  if (!user) notFound();
  const tab = parseTab(sp.tab);
  const data = await getProfileData(user.id, tab);
  return <ProfileView profile={user} data={data} tab={tab} basePath={`/u/${user.username}`} isMe={false} />;
}
