import { requireProfile } from "@/lib/auth";
import { limit, ok, parseBody, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";
import { answerSchema } from "@/lib/validation";

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const profile = await requireProfile();
  limit(`answer:${profile.id}`, 240);
  const { id } = await ctx.params;
  const input = await parseBody(req, answerSchema);
  const { error } = await db().rpc("record_answer", {
    p_attempt_id: id,
    p_user: profile.id,
    p_question_id: input.question_id,
    p_answer: input.answer,
  });
  if (error) throw error;
  return ok({ ok: true });
});
