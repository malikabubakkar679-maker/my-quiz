import { requireProfile } from "@/lib/auth";
import { limit, ok, parseBody, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";
import { reportSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const profile = await requireProfile();
  limit(`report:${profile.id}`, 5);
  const input = await parseBody(req, reportSchema);
  const { error } = await db().from("reports").insert({ ...input, reporter_id: profile.id });
  if (error) throw error;
  return ok({ ok: true }, { status: 201 });
});
