import { QrCode } from "lucide-react";
import { JoinRoomForm } from "@/components/JoinRoomForm";
import { Card } from "@/components/ui";
import { pageProfile } from "@/lib/auth";

export const metadata = { title: "Join Room" };

export default async function JoinRoomPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await pageProfile();
  const { code } = await searchParams;
  return (
    <div className="mx-auto max-w-xl pt-4 sm:pt-10">
      <Card className="p-6 sm:p-8">
        <span className="bg-brand-gradient mb-4 grid size-12 place-items-center rounded-xl"><QrCode className="size-6" /></span>
        <h1 className="font-display text-2xl font-bold">Join a Quiz Room</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Enter the 8-character code from the host, or scan their QR code.</p>
        <JoinRoomForm initialCode={code ?? ""} autoJoin={!!code} large />
      </Card>
    </div>
  );
}
