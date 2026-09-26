import { requireProfile } from "@/lib/auth";
import { limit, ok, route } from "@/lib/api";
import { getLeaderboard, parsePeriod } from "@/lib/leaderboard";

export const GET = route(async (req) => {
  const profile = await requireProfile();
  limit(`leaderboard:${profile.id}`, 60);
  const params = new URL(req.url).searchParams;
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("size") ?? 50) || 50));
  const entries = await getLeaderboard({
    period: parsePeriod(params.get("period")),
    country: params.get("country"),
    limit: pageSize,
    offset: page * pageSize,
  });
  return ok({ entries, page, has_more: entries.length === pageSize });
});
