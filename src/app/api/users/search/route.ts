import { requireProfile } from "@/lib/auth";
import { limit, ok, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";
import { ilikePattern, searchTerm } from "@/lib/search";

export const GET = route(async (req) => {
  const profile = await requireProfile();
  limit(`user-search:${profile.id}`, 60);
  const term = searchTerm(new URL(req.url).searchParams.get("q"));
  let query = db()
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, last_seen_at, institution_name")
    .eq("onboarding_completed", true)
    .eq("is_banned", false)
    .neq("id", profile.id)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(20);
  if (term) {
    const pattern = ilikePattern(term);
    query = query.or(`username.ilike.${pattern},display_name.ilike.${pattern}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return ok({ users: data ?? [] });
});
