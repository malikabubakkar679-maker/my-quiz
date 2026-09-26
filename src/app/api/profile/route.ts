import { requireProfile } from "@/lib/auth";
import { fail, limit, ok, parseBody, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";
import { profileSchema } from "@/lib/validation";

export const PUT = route(async (req) => {
  const profile = await requireProfile({ onboarded: false });
  limit(`profile:${profile.id}`, 20);
  const input = await parseBody(req, profileSchema);

  const avatarPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.id}/`;
  if (!input.avatar_url.startsWith(avatarPrefix)) return fail(400, "Please upload a profile photo.");

  const { data: taken } = await db().from("profiles").select("id").eq("username", input.username).neq("id", profile.id).maybeSingle();
  if (taken) return fail(409, "Username already taken.", { field: "username" });

  const { data, error } = await db()
    .from("profiles")
    .update({ ...input, onboarding_completed: true })
    .eq("id", profile.id)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return fail(409, "Username already taken.", { field: "username" });
    throw error;
  }
  return ok({ profile: data });
});
