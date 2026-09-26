import { ProfileView } from "@/components/ProfileView";
import { pageProfile } from "@/lib/auth";
import { getProfileData, parseTab } from "@/lib/profile-data";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const profile = await pageProfile();
  const tab = parseTab((await searchParams).tab);
  const data = await getProfileData(profile.id, tab);
  return <ProfileView profile={profile} data={data} tab={tab} basePath="/profile" isMe />;
}
