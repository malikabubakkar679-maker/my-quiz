import { notFound } from "next/navigation";
import { ChallengeView } from "@/components/ChallengeView";
import { pageProfile } from "@/lib/auth";
import { getChallenge } from "@/lib/challenges";
import { HttpError } from "@/lib/auth";

export const metadata = { title: "Challenge" };

export default async function ChallengeDetail({ params }: { params: Promise<{ id: string }> }) {
  const profile = await pageProfile();
  const { id } = await params;
  try {
    const { challenge, viewer } = await getChallenge(id, profile.id);
    return <ChallengeView challenge={challenge} viewer={viewer} />;
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
}
