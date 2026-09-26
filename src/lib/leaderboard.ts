import { db } from "@/lib/supabase/admin";
import type { LeaderboardEntry } from "@/lib/types";

export type Period = "all" | "weekly" | "monthly";

export function parsePeriod(v: string | null | undefined): Period {
  return v === "weekly" || v === "monthly" ? v : "all";
}

export async function getLeaderboard(opts: { period: Period; country?: string | null; limit?: number; offset?: number }) {
  const country = opts.country?.trim().slice(0, 80) || null;
  const { data, error } = await db().rpc("get_leaderboard", {
    p_period: opts.period,
    p_country: country,
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function getCountries(): Promise<string[]> {
  const { data } = await db().from("profiles").select("country").eq("onboarding_completed", true).not("country", "is", null).limit(1000);
  return [...new Set((data ?? []).map((r) => (r.country as string).trim()).filter(Boolean))].sort();
}
