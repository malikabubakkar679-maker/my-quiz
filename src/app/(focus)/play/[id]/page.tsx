import { QuizPlayer } from "@/components/QuizPlayer";

export const metadata = { title: "Quiz" };

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizPlayer attemptId={id} />;
}
