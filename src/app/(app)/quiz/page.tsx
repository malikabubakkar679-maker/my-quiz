import { QuizSetup } from "@/components/QuizSetup";
import { PageHeader } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { getQuizCatalog } from "@/lib/catalog";

export const metadata = { title: "Single Quiz" };

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ quiz?: string; course?: string }> }) {
  await pageProfile();
  const [{ courses, quizzes }, sp] = await Promise.all([getQuizCatalog(), searchParams]);
  return (
    <div>
      <PageHeader title="Single Quiz" description="Set up your practice run, review it and go." />
      <QuizSetup courses={courses} quizzes={quizzes} initialQuiz={sp.quiz} initialCourse={sp.course} />
    </div>
  );
}
