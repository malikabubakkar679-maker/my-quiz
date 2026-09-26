import { db } from "@/lib/supabase/admin";
import { CHALLENGE_COLUMNS, type ChallengeWithPeople } from "@/lib/challenges";

export type ProfileTab = "overview" | "history" | "achievements" | "statistics" | "challenges" | "rooms";
export const PROFILE_TABS: { value: ProfileTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "history", label: "Quiz History" },
  { value: "achievements", label: "Achievements" },
  { value: "statistics", label: "Statistics" },
  { value: "challenges", label: "Challenges" },
  { value: "rooms", label: "Rooms" },
];

export function parseTab(v?: string): ProfileTab {
  return PROFILE_TABS.some((t) => t.value === v) ? (v as ProfileTab) : "overview";
}

export type HistoryRow = { id: string; score: number; max_score: number; correct_answers: number; total_questions: number; total_time: number; mode: string; completed_at: string; xp_earned: number; quizzes: { title: string; courses: { name: string } | null } | null };

export async function getProfileData(userId: string, tab: ProfileTab) {
  const supabase = db();
  const [{ count: roomsCreated }, recent] = await Promise.all([
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("creator_id", userId),
    supabase
      .from("quiz_results")
      .select("id, score, max_score, correct_answers, total_questions, total_time, mode, completed_at, xp_earned, quizzes(title, courses(name))")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(tab === "history" ? 50 : 5),
  ]);
  const base = { roomsCreated: roomsCreated ?? 0, recent: (recent.data ?? []) as unknown as HistoryRow[] };

  if (tab === "achievements" || tab === "overview") {
    const [{ data: all }, { data: mine }] = await Promise.all([
      supabase.from("achievements").select("id, code, name, description, icon").order("name"),
      supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", userId),
    ]);
    const unlocked = new Map((mine ?? []).map((m) => [m.achievement_id as string, m.unlocked_at as string]));
    return { ...base, achievements: (all ?? []).map((a) => ({ ...a, unlocked_at: unlocked.get(a.id) ?? null })) };
  }
  if (tab === "statistics") {
    const { data } = await supabase
      .from("quiz_results")
      .select("correct_answers, total_questions, total_time, mode, completed_at, quizzes(courses(name))")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(500);
    const byCourse = new Map<string, { correct: number; total: number; attempts: number }>();
    const byMode = { single: 0, room: 0, challenge: 0 } as Record<string, number>;
    let time = 0;
    for (const r of data ?? []) {
      const name = (r.quizzes as unknown as { courses: { name: string } | null } | null)?.courses?.name ?? "Other";
      const c = byCourse.get(name) ?? { correct: 0, total: 0, attempts: 0 };
      c.correct += r.correct_answers;
      c.total += r.total_questions;
      c.attempts += 1;
      byCourse.set(name, c);
      byMode[r.mode] = (byMode[r.mode] ?? 0) + 1;
      time += r.total_time;
    }
    const totals = [...byCourse.values()].reduce((a, c) => ({ correct: a.correct + c.correct, total: a.total + c.total }), { correct: 0, total: 0 });
    return {
      ...base,
      stats: {
        courses: [...byCourse.entries()].map(([name, c]) => ({ name, accuracy: c.total ? Math.round((c.correct / c.total) * 100) : 0, attempts: c.attempts })).sort((a, b) => b.attempts - a.attempts),
        byMode,
        accuracy: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0,
        totalTime: time,
        attempts: data?.length ?? 0,
      },
    };
  }
  if (tab === "challenges") {
    const { data } = await supabase
      .from("challenges")
      .select(CHALLENGE_COLUMNS)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(30);
    return { ...base, challenges: (data ?? []) as unknown as ChallengeWithPeople[] };
  }
  if (tab === "rooms") {
    const [{ data: created }, { data: joined }] = await Promise.all([
      supabase.from("rooms").select("id, room_code, room_name, status, created_at, courses(name)").eq("creator_id", userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("room_participants").select("score, correct_answers, status, rooms(id, room_code, room_name, status, created_at, courses(name))").eq("user_id", userId).order("joined_at", { ascending: false }).limit(30),
    ]);
    return { ...base, rooms: { created: created ?? [], joined: joined ?? [] } };
  }
  return base;
}
