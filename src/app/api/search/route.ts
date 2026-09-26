import { requireProfile } from "@/lib/auth";
import { limit, ok, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";
import { ilikePattern, searchTerm } from "@/lib/search";

export const GET = route(async (req) => {
  const profile = await requireProfile();
  limit(`search:${profile.id}`, 60);
  const term = searchTerm(new URL(req.url).searchParams.get("q"));
  if (!term) return ok({ courses: [], quizzes: [], users: [] });
  const pattern = ilikePattern(term);
  const supabase = db();
  const [courses, quizzes, users] = await Promise.all([
    supabase.from("courses").select("id, name, slug, icon, quiz_count").ilike("name", pattern).limit(5),
    supabase
      .from("quizzes")
      .select("id, title, difficulty, question_count, courses(name, slug)")
      .eq("is_published", true)
      .ilike("title", pattern)
      .limit(5),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, level")
      .eq("onboarding_completed", true)
      .eq("is_banned", false)
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(5),
  ]);
  return ok({ courses: courses.data ?? [], quizzes: quizzes.data ?? [], users: users.data ?? [] });
});
