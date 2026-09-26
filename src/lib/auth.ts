import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function adminIds(): string[] {
  return (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Returns the profile row for the signed-in Clerk user, creating an empty one on first visit. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = db();
  const { data, error } = await supabase.from("profiles").select("*").eq("clerk_user_id", userId).maybeSingle();
  if (error) throw error;
  let profile = data as Profile | null;
  if (!profile) {
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .upsert({ clerk_user_id: userId }, { onConflict: "clerk_user_id" })
      .select("*")
      .single();
    if (insertError) throw insertError;
    profile = created as Profile;
  }
  if (profile.role !== "admin" && adminIds().includes(userId)) {
    const { data: promoted } = await supabase.from("profiles").update({ role: "admin" }).eq("id", profile.id).select("*").single();
    if (promoted) profile = promoted as Profile;
  }
  return profile;
});

export async function requireProfile(opts: { onboarded?: boolean } = { onboarded: true }): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new HttpError(401, "Please sign in to continue.");
  if (profile.is_banned) throw new HttpError(403, "Your account has been suspended.");
  if (opts.onboarded !== false && !profile.onboarding_completed) throw new HttpError(403, "Please complete your profile first.");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") throw new HttpError(403, "Admin access required.");
  return profile;
}

export async function pageProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  return profile;
}
