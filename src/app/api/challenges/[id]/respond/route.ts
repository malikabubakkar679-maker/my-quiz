import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { fail, ok, parseBody, route } from "@/lib/api";
import { getChallenge } from "@/lib/challenges";
import { db } from "@/lib/supabase/admin";

const schema = z.object({ action: z.enum(["accept", "decline", "cancel"]) });

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const profile = await requireProfile();
  const { id } = await ctx.params;
  const { action } = await parseBody(req, schema);
  const { challenge } = await getChallenge(id, profile.id);
  if (challenge.status !== "pending") return fail(409, "This challenge is no longer pending.");

  const isReceiver = challenge.receiver_id === profile.id;
  if ((action === "accept" || action === "decline") && !isReceiver) return fail(403, "Only the invited player can respond.");
  if (action === "cancel" && challenge.sender_id !== profile.id) return fail(403, "Only the sender can cancel.");

  const status = action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled";
  const supabase = db();
  const { data, error } = await supabase
    .from("challenges")
    .update({ status, accepted_at: action === "accept" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return fail(409, "This challenge is no longer pending.");

  if (action !== "cancel") {
    await supabase.rpc("notify", {
      p_user: challenge.sender_id,
      p_type: action === "accept" ? "challenge_accepted" : "challenge_declined",
      p_title: `@${profile.username} ${action === "accept" ? "accepted" : "declined"} your challenge`,
      p_body: challenge.quiz.title,
      p_link: `/challenge/${id}`,
      p_data: { challenge_id: id },
    });
  }
  return ok({ status });
});
