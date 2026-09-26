import { requireProfile } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { loadPlayableAttempt } from "@/lib/game";

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const profile = await requireProfile();
  const { id } = await ctx.params;
  const data = await loadPlayableAttempt(id, profile.id);
  return ok({ ...data, server_now: new Date().toISOString() });
});
