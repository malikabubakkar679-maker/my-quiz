import { db } from "@/lib/supabase/admin";
import { ilikePattern, searchTerm } from "@/lib/search";
import type { Course, Quiz } from "@/lib/types";

export type CourseWithProgress = Course & { completed: number; progress: number };

export async function getCourses(userId: string, q?: string | null): Promise<CourseWithProgress[]> {
  const supabase = db();
  let query = supabase.from("courses").select("*").order("name");
  const term = searchTerm(q);
  if (term) query = query.ilike("name", ilikePattern(term));
  const [{ data: courses, error }, { data: done }] = await Promise.all([
    query,
    supabase.from("quiz_results").select("quiz_id, quizzes!inner(course_id)").eq("user_id", userId).limit(2000),
  ]);
  if (error) throw error;
  const perCourse = new Map<string, Set<string>>();
  for (const r of done ?? []) {
    const cid = (r.quizzes as unknown as { course_id: string }).course_id;
    if (!perCourse.has(cid)) perCourse.set(cid, new Set());
    perCourse.get(cid)!.add(r.quiz_id as string);
  }
  return ((courses ?? []) as Course[]).map((c) => {
    const completed = perCourse.get(c.id)?.size ?? 0;
    return { ...c, completed, progress: c.quiz_count ? Math.min(100, Math.round((completed / c.quiz_count) * 100)) : 0 };
  });
}

export type QuizOption = Pick<Quiz, "id" | "title" | "difficulty" | "duration" | "question_count" | "course_id" | "description">;

export async function getQuizCatalog() {
  const supabase = db();
  const [{ data: courses }, { data: quizzes }] = await Promise.all([
    supabase.from("courses").select("id, name, slug, icon").order("name"),
    supabase
      .from("quizzes")
      .select("id, title, difficulty, duration, question_count, course_id, description")
      .eq("is_published", true)
      .gt("question_count", 0)
      .order("title"),
  ]);
  return {
    courses: (courses ?? []) as Pick<Course, "id" | "name" | "slug" | "icon">[],
    quizzes: (quizzes ?? []) as QuizOption[],
  };
}
