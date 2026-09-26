import { requireProfile } from "@/lib/auth";
import { limit, ok, route } from "@/lib/api";
import { getRoomState } from "@/lib/rooms";

export const GET = route(async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const profile = await requireProfile();
  limit(`room-state:${profile.id}`, 120);
  const { code } = await ctx.params;
  return ok(await getRoomState(code, profile.id));
});
