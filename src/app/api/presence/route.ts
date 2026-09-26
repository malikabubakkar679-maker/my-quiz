import { requireProfile } from "@/lib/auth";
import { limit, ok, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";

export const POST = route(async () => {
  const profile = await requireProfile({ onboarded: false });
  limit(`presence:${profile.id}`, 6);
  await db().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id);
  return ok({ ok: true });
});
