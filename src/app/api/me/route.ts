import { getCurrentProfile } from "@/lib/auth";
import { fail, ok, route } from "@/lib/api";

export const GET = route(async () => {
  const profile = await getCurrentProfile();
  if (!profile) return fail(401, "Please sign in to continue.");
  return ok({ profile });
});
