import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: lowercase letters, numbers or underscores");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Display name is required").max(50),
  username: usernameSchema,
  avatar_url: z.string().url("Profile photo is required"),
  institution_type: z.enum(["school", "college", "university"]),
  institution_name: z.string().trim().min(2, "Institution name is required").max(120),
  city: optionalText(80),
  country: optionalText(80),
  bio: optionalText(300),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const answerSchema = z.object({
  question_id: z.string().uuid(),
  answer: z.enum(["A", "B", "C", "D"]).nullable(),
});

export const startSingleSchema = z.object({
  quiz_id: z.string().uuid(),
  question_count: z.number().int().min(1).max(100).optional(),
  duration_seconds: z.number().int().min(30).max(7200).optional(),
});

export const createRoomSchema = z.object({
  quiz_id: z.string().uuid(),
  room_name: z.string().trim().min(1, "Room name is required").max(60),
  description: optionalText(300),
  max_players: z.number().int().min(2).max(100),
  question_count: z.number().int().min(1).max(100).optional(),
  duration_seconds: z.number().int().min(30).max(7200).optional(),
  shuffle_questions: z.boolean().optional(),
});

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{8}$/, "Room codes are 8 letters or numbers");

export const createChallengeSchema = z.object({
  receiver_id: z.string().uuid(),
  quiz_id: z.string().uuid(),
  question_count: z.number().int().min(1).max(100).optional(),
});

export const courseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,80}$/, "Lowercase letters, numbers and dashes"),
  description: optionalText(500),
  icon: optionalText(40),
  image: z
    .string()
    .trim()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  category: optionalText(60),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const quizSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  description: optionalText(500),
  difficulty: z.enum(["easy", "medium", "hard"]),
  duration: z.number().int().min(30).max(7200),
  is_published: z.boolean().optional(),
});

export const questionSchema = z.object({
  quiz_id: z.string().uuid(),
  question_text: z.string().trim().min(1).max(1000),
  option_a: z.string().trim().min(1).max(300),
  option_b: z.string().trim().min(1).max(300),
  option_c: z.string().trim().min(1).max(300),
  option_d: z.string().trim().min(1).max(300),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  explanation: optionalText(1000),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const reportSchema = z.object({
  target_type: z.enum(["question", "quiz", "course", "user"]),
  target_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});
