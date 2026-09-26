import type { ZodObject, ZodRawShape } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ok, parseBody, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";

type IdCtx = { params: Promise<{ id: string }> };

/** Admin-only create / update / delete handlers for a catalog table. */
export function adminCrud<S extends ZodRawShape>(table: string, schema: ZodObject<S>) {
  return {
    create: route(async (req) => {
      await requireAdmin();
      const input: Record<string, unknown> = await parseBody(req, schema);
      const { data, error } = await db().from(table).insert(input).select("*").single();
      if (error) throw error;
      return ok(data, { status: 201 });
    }),
    update: route(async (req, ctx: IdCtx) => {
      await requireAdmin();
      const { id } = await ctx.params;
      const input: Record<string, unknown> = await parseBody(req, schema.partial());
      const { data, error } = await db().from(table).update(input).eq("id", id).select("*").single();
      if (error) throw error;
      return ok(data);
    }),
    remove: route(async (_req, ctx: IdCtx) => {
      await requireAdmin();
      const { id } = await ctx.params;
      const { error } = await db().from(table).delete().eq("id", id);
      if (error) throw error;
      return ok({ ok: true });
    }),
  };
}
