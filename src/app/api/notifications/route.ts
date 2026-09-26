import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { limit, ok, parseBody, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";

export const GET = route(async () => {
  const profile = await requireProfile();
  limit(`notif:${profile.id}`, 60);
  const supabase = db();
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", profile.id).is("read_at", null),
  ]);
  if (error) throw error;
  return ok({ notifications: data ?? [], unread: count ?? 0 });
});

const readSchema = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

export const POST = route(async (req) => {
  const profile = await requireProfile();
  const { ids } = await parseBody(req, readSchema);
  let query = db().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", profile.id).is("read_at", null);
  if (ids?.length) query = query.in("id", ids);
  const { error } = await query;
  if (error) throw error;
  return ok({ ok: true });
});
