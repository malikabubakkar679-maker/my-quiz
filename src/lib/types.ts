export type InstitutionType = "school" | "college" | "university";
export type Difficulty = "easy" | "medium" | "hard";
export type RoomStatus = "waiting" | "in_progress" | "ended" | "cancelled";
export type ChallengeStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";
export type AttemptMode = "single" | "room" | "challenge";
export type AnswerKey = "A" | "B" | "C" | "D";

export interface Profile {
  id: string;
  clerk_user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  institution_type: InstitutionType | null;
  institution_name: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  onboarding_completed: boolean;
  role: "user" | "admin";
  is_banned: boolean;
  level: number;
  xp: number;
  total_score: number;
  total_quizzes: number;
  total_wins: number;
  total_challenges: number;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicProfile = Pick<
  Profile,
  | "id"
  | "username"
  | "display_name"
  | "avatar_url"
  | "institution_type"
  | "institution_name"
  | "city"
  | "country"
  | "bio"
  | "level"
  | "xp"
  | "total_score"
  | "total_quizzes"
  | "total_wins"
  | "total_challenges"
  | "last_seen_at"
  | "created_at"
>;

export interface Course {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  category: string | null;
  difficulty: Difficulty;
  question_count: number;
  quiz_count: number;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  duration: number;
  question_count: number;
  created_by: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: AnswerKey;
  explanation: string | null;
  difficulty: Difficulty;
}

export type PlayQuestion = Pick<Question, "id" | "question_text" | "option_a" | "option_b" | "option_c" | "option_d">;

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  mode: AttemptMode;
  room_id: string | null;
  challenge_id: string | null;
  question_ids: string[];
  answers: Record<string, AnswerKey>;
  duration_seconds: number;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
}

export interface QuizResult {
  id: string;
  attempt_id: string;
  user_id: string;
  quiz_id: string;
  mode: AttemptMode;
  room_id: string | null;
  challenge_id: string | null;
  score: number;
  max_score: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  total_questions: number;
  total_time: number;
  average_time: number;
  xp_earned: number;
  is_winner: boolean;
  started_at: string;
  completed_at: string;
}

export interface Room {
  id: string;
  room_code: string;
  room_name: string;
  description: string | null;
  course_id: string;
  quiz_id: string;
  creator_id: string;
  status: RoomStatus;
  max_players: number;
  duration_seconds: number;
  settings: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  answered: number;
  total_time: number;
  status: "joined" | "playing" | "finished" | "left";
  joined_at: string;
}

export interface Challenge {
  id: string;
  sender_id: string;
  receiver_id: string;
  quiz_id: string;
  status: ChallengeStatus;
  duration_seconds: number;
  sender_score: number | null;
  receiver_score: number | null;
  sender_correct: number | null;
  receiver_correct: number | null;
  sender_time: number | null;
  receiver_time: number | null;
  winner_id: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  profile_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  level: number;
  xp: number;
  score: number;
  quizzes: number;
  wins: number;
}
