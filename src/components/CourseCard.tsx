import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseIcon } from "@/components/CourseIcon";
import { DifficultyBadge } from "@/components/ui";
import type { CourseWithProgress } from "@/lib/catalog";

export function CourseCard({ course }: { course: CourseWithProgress }) {
  return (
    <Link href={`/courses/${course.slug}`} className="group glass flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-brand/40">
      <div className="flex items-start gap-4">
        <CourseIcon icon={course.icon} seed={course.slug} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-semibold">{course.name}</h3>
          <p className="truncate text-xs text-muted">{course.category ?? "General"}</p>
        </div>
        <span className="grid size-9 place-items-center rounded-full border border-line text-muted transition group-hover:border-brand/50 group-hover:bg-brand/20 group-hover:text-white">
          <ArrowRight className="size-4" />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span><b className="text-white">{course.quiz_count}</b> quizzes</span>
        <span><b className="text-white">{course.question_count}</b> questions</span>
        <DifficultyBadge value={course.difficulty} />
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">Progress</span><span>{course.progress}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${course.progress}%` }} />
        </div>
      </div>
    </Link>
  );
}
