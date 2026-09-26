import { requireProfile } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { getChallenge } from "@/lib/challenges";

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const profile = await requireProfile();
  const { id } = await ctx.params;
  return ok(await getChallenge(id, profile.id));
});
