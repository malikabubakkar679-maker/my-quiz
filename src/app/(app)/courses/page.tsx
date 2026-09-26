import { Search } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { EmptyState } from "@/components/states";
import { PageHeader } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { getCourses } from "@/lib/catalog";

export const metadata = { title: "Courses" };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const profile = await pageProfile();
  const { q } = await searchParams;
  const courses = await getCourses(profile.id, q);
  return (
    <div>
      <PageHeader title="Courses" description="Pick a subject and start mastering it." />
      <form className="relative mb-6 max-w-md" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Search courses..." aria-label="Search courses" className="h-11 w-full rounded-xl border border-line bg-white/[0.04] pr-4 pl-10 text-sm outline-none focus:border-brand/60 focus:ring-4 focus:ring-brand/15" />
      </form>
      {courses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      ) : (
        <EmptyState title={q ? `No courses match “${q}”` : "No courses yet"} description={q ? "Try a different search term." : "Courses will appear here once they're added."} />
      )}
    </div>
  );
}
