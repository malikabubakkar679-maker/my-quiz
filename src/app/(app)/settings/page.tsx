import { UserProfile } from "@clerk/nextjs";
import { ProfileForm } from "@/components/ProfileForm";
import { Card, PageHeader } from "@/components/ui";
import { pageProfile } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await pageProfile();
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Update your public My Quiz profile and account security." />
      <Card className="p-5 sm:p-7">
        <h2 className="mb-5 font-display text-lg font-semibold">Profile</h2>
        <ProfileForm profile={profile} mode="edit" />
      </Card>
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Account & security</h2>
        <div className="overflow-x-auto"><UserProfile routing="hash" /></div>
      </section>
    </div>
  );
}
