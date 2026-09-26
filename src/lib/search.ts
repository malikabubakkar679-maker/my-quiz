/** Normalizes free-text search input for safe use inside PostgREST ilike filters. */
export function searchTerm(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? "").replace(/[^\p{L}\p{N}\s_-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 50);
  return cleaned.length >= 1 ? cleaned : null;
}

export function ilikePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
