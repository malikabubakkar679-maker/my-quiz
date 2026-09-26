import { notFound } from "next/navigation";
import { TabLinksNav } from "@/components/admin/AdminNav";
import { getCurrentProfile } from "@/lib/auth";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin</h1>
        <TabLinksNav />
      </div>
      {children}
    </div>
  );
}
