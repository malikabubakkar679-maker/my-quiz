import { AdminTable, PAGE_SIZE, pageOf } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui";
import { db } from "@/lib/supabase/admin";
import { formatDuration, timeAgo } from "@/lib/utils";

export default async function AdminResults({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageOf((await searchParams).page);
  const { data } = await db()
    .from("quiz_results")
    .select("id, score, max_score, correct_answers, total_questions, total_time, mode, completed_at, quizzes(title), profiles(username)")
    .order("completed_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rows = (data ?? []).slice(0, PAGE_SIZE) as unknown as { id: string; score: number; max_score: number; correct_answers: number; total_questions: number; total_time: number; mode: string; completed_at: string; quizzes: { title: string } | null; profiles: { username: string } | null }[];
  return (
    <AdminTable
      head={["Player", "Quiz", "Mode", "Correct", "Score", "Time", "Completed"]}
      empty="No quiz results yet."
      page={page}
      hasMore={(data ?? []).length > PAGE_SIZE}
      base="/admin/results"
      rows={rows.map((r) => [`@${r.profiles?.username ?? "—"}`, r.quizzes?.title, <Badge key="m" className="capitalize">{r.mode}</Badge>, `${r.correct_answers}/${r.total_questions}`, `${r.score}/${r.max_score}`, formatDuration(r.total_time), timeAgo(r.completed_at)])}
    />
  );
}
