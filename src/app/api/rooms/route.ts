import { requireProfile } from "@/lib/auth";
import { limit, ok, parseBody, route } from "@/lib/api";
import { getQuizOrThrow, pickQuestionIds } from "@/lib/game";
import { db } from "@/lib/supabase/admin";
import { generateRoomCode } from "@/lib/utils";
import { createRoomSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const profile = await requireProfile();
  limit(`room-create:${profile.id}`, 5);
  const input = await parseBody(req, createRoomSchema);
  const quiz = await getQuizOrThrow(input.quiz_id);
  const questionIds = await pickQuestionIds(quiz.id, input.question_count, input.shuffle_questions ?? true);

  for (let i = 0; i < 5; i++) {
    const { data, error } = await db()
      .from("rooms")
      .insert({
        room_code: generateRoomCode(),
        room_name: input.room_name,
        description: input.description,
        course_id: quiz.course_id,
        quiz_id: quiz.id,
        creator_id: profile.id,
        max_players: input.max_players,
        question_ids: questionIds,
        duration_seconds: input.duration_seconds ?? quiz.duration,
        settings: { shuffle_questions: input.shuffle_questions ?? true },
      })
      .select("id, room_code")
      .single();
    if (!error) return ok(data, { status: 201 });
    if (error.code !== "23505") throw error;
  }
  throw new Error("Could not allocate a room code");
});
