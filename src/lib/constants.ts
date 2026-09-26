export const APP_NAME = "My Quiz";
export const PUBLIC_PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, institution_type, institution_name, city, country, bio, level, xp, total_score, total_quizzes, total_wins, total_challenges, last_seen_at, created_at";
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;
export const POINTS_PER_CORRECT = 10;

export function isOnline(lastSeen: string | null | undefined): boolean {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}
