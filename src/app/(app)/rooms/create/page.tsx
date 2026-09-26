import Link from "next/link";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import { PageHeader } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { getQuizCatalog } from "@/lib/catalog";

export const metadata = { title: "Create Room" };

export default async function CreateRoomPage({ searchParams }: { searchParams: Promise<{ quiz?: string }> }) {
  await pageProfile();
  const [{ courses, quizzes }, sp] = await Promise.all([getQuizCatalog(), searchParams]);
  return (
    <div>
      <PageHeader
        title="Create a Quiz Room"
        description="Host a live multiplayer quiz. Share the code and start when everyone is in."
        action={<Link href="/rooms/join" className="text-sm text-violet-300 hover:text-white">Have a code? Join a room →</Link>}
      />
      <CreateRoomForm courses={courses} quizzes={quizzes} initialQuiz={sp.quiz} />
    </div>
  );
}
