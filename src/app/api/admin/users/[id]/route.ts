import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, parseBody, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";

const schema = z.object({ role: z.enum(["user", "admin"]).optional(), is_banned: z.boolean().optional() });

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const input = await parseBody(req, schema);
  if (id === admin.id) return fail(400, "You can't change your own admin status.");
  const { data, error } = await db().from("profiles").update(input).eq("id", id).select("id, role, is_banned").single();
  if (error) throw error;
  return ok(data);
});
