import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CourseIcon } from "@/components/CourseIcon";
import { QuizCard } from "@/components/QuizCard";
import { EmptyState } from "@/components/states";
import { DifficultyBadge } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import type { Course, Quiz } from "@/lib/types";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const profile = await pageProfile();
  const { slug } = await params;
  const supabase = db();
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle<Course>();
  if (!course) notFound();
  const { data: quizzes } = await supabase.from("quizzes").select("*").eq("course_id", course.id).eq("is_published", true).order("title");
  const ids = (quizzes ?? []).map((q) => q.id);
  const { data: results } = ids.length
    ? await supabase.from("quiz_results").select("quiz_id, score, max_score").eq("user_id", profile.id).in("quiz_id", ids)
    : { data: [] };
  const best = new Map<string, number>();
  for (const r of results ?? []) {
    const pct = r.max_score ? Math.round((r.score / r.max_score) * 100) : 0;
    best.set(r.quiz_id, Math.max(best.get(r.quiz_id) ?? 0, pct));
  }
  return (
    <div>
      <Link href="/courses" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-white"><ChevronLeft className="size-4" /> All courses</Link>
      <div className="glass mb-6 flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
        <CourseIcon icon={course.icon} seed={course.slug} className="size-16" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{course.name}</h1>
            <DifficultyBadge value={course.difficulty} />
          </div>
          {course.description && <p className="mt-1 text-sm text-muted">{course.description}</p>}
          <p className="mt-2 text-xs text-muted">{course.quiz_count} quizzes · {course.question_count} questions</p>
        </div>
      </div>
      <h2 className="mb-4 font-display text-xl font-semibold">Quizzes</h2>
      {quizzes?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(quizzes as Quiz[]).map((q) => <QuizCard key={q.id} quiz={q} best={best.get(q.id) ?? null} />)}
        </div>
      ) : (
        <EmptyState title="No quizzes found." description="This course doesn't have any quizzes yet." />
      )}
    </div>
  );
}
