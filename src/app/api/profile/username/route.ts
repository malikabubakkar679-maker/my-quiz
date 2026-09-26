import { requireProfile } from "@/lib/auth";
import { limit, ok, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";
import { usernameSchema } from "@/lib/validation";

export const GET = route(async (req) => {
  const profile = await requireProfile({ onboarded: false });
  limit(`username:${profile.id}`, 60);
  const parsed = usernameSchema.safeParse(new URL(req.url).searchParams.get("u") ?? "");
  if (!parsed.success) return ok({ available: false, reason: parsed.error.issues[0]?.message });
  const { data } = await db().from("profiles").select("id").eq("username", parsed.data).maybeSingle();
  const available = !data || data.id === profile.id;
  return ok({ available, reason: available ? null : "Username already taken" });
});
