import { db } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/auth";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/constants";
import { roomCodeSchema } from "@/lib/validation";
import type { PublicProfile, Room, RoomParticipant } from "@/lib/types";

const ROOM_COLUMNS =
  "id, room_code, room_name, description, course_id, quiz_id, creator_id, status, max_players, duration_seconds, settings, created_at, started_at, ended_at";

export async function getRoomByCode(rawCode: string): Promise<Room & { question_ids: string[] }> {
  const parsed = roomCodeSchema.safeParse(rawCode);
  if (!parsed.success) throw new HttpError(400, "Invalid room code.");
  const { data, error } = await db().from("rooms").select(`${ROOM_COLUMNS}, question_ids`).eq("room_code", parsed.data).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Room not found.");
  return data as Room & { question_ids: string[] };
}

export type RoomState = Awaited<ReturnType<typeof getRoomState>>;

export async function getRoomState(code: string, viewerId: string) {
  let room = await getRoomByCode(code);
  const supabase = db();
  if (room.status === "in_progress") {
    await supabase.rpc("finish_room_if_done", { p_room_id: room.id, p_force: false });
    room = await getRoomByCode(code);
  }
  const [{ data: participants }, { data: course }, { data: quiz }, { data: creator }, { data: myAttempt }] = await Promise.all([
    supabase
      .from("room_participants")
      .select(`*, profile:profiles(${PUBLIC_PROFILE_COLUMNS})`)
      .eq("room_id", room.id)
      .neq("status", "left")
      .order("joined_at"),
    supabase.from("courses").select("id, name, slug, icon").eq("id", room.course_id).single(),
    supabase.from("quizzes").select("id, title, difficulty").eq("id", room.quiz_id).single(),
    supabase.from("profiles").select(PUBLIC_PROFILE_COLUMNS).eq("id", room.creator_id).single(),
    supabase.from("quiz_attempts").select("id, submitted_at").eq("room_id", room.id).eq("user_id", viewerId).maybeSingle(),
  ]);
  let myResultId: string | null = null;
  if (myAttempt?.submitted_at) {
    const { data: r } = await supabase.from("quiz_results").select("id").eq("attempt_id", myAttempt.id).maybeSingle();
    myResultId = (r?.id as string) ?? null;
  }
  const list = ((participants ?? []) as (RoomParticipant & { profile: PublicProfile })[]).sort(
    (a, b) => b.correct_answers - a.correct_answers || a.total_time - b.total_time,
  );
  const { question_ids, ...publicRoom } = room;
  return {
    room: publicRoom,
    question_count: question_ids.length,
    course,
    quiz,
    creator: creator as PublicProfile | null,
    participants: list,
    viewer: {
      id: viewerId,
      is_creator: room.creator_id === viewerId,
      participant: list.find((p) => p.user_id === viewerId) ?? null,
      attempt_id: (myAttempt?.id as string) ?? null,
      result_id: myResultId,
    },
    server_now: new Date().toISOString(),
  };
}
