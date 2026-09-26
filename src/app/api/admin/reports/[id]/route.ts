import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ok, parseBody, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";

const schema = z.object({ status: z.enum(["open", "resolved", "dismissed"]) });

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const { status } = await parseBody(req, schema);
  const { data, error } = await db()
    .from("reports")
    .update({ status, resolved_by: status === "open" ? null : admin.id, resolved_at: status === "open" ? null : new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return ok(data);
});
