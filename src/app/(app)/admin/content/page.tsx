import { ContentManager } from "@/components/admin/ContentManager";
import { db } from "@/lib/supabase/admin";
import type { Course, Question, Quiz } from "@/lib/types";

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ course?: string; quiz?: string }> }) {
  const { course, quiz } = await searchParams;
  const supabase = db();
  const uuid = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);
  const courseId = uuid(course);
  const quizId = courseId ? uuid(quiz) : undefined;
  const [{ data: courses }, { data: quizzes }, { data: questions }] = await Promise.all([
    supabase.from("courses").select("*").order("name"),
    courseId ? supabase.from("quizzes").select("*").eq("course_id", courseId).order("title") : Promise.resolve({ data: [] }),
    quizId ? supabase.from("questions").select("*").eq("quiz_id", quizId).order("created_at") : Promise.resolve({ data: [] }),
  ]);
  return <ContentManager courses={(courses ?? []) as Course[]} quizzes={(quizzes ?? []) as Quiz[]} questions={(questions ?? []) as Question[]} courseId={courseId} quizId={quizId} />;
}
