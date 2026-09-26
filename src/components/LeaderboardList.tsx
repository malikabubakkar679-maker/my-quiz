"use client";

import { useState } from "react";
import { LeaderboardTable } from "@/components/LeaderboardRow";
import { InlineAlert } from "@/components/states";
import { Button } from "@/components/ui";
import { api } from "@/lib/fetcher";
import type { LeaderboardEntry } from "@/lib/types";

export function LeaderboardList({ initial, period, me, pageSize }: { initial: LeaderboardEntry[]; period: string; me: string; pageSize: number }) {
  const [entries, setEntries] = useState(initial);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(initial.length === pageSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api<{ entries: LeaderboardEntry[]; has_more: boolean }>(`/api/leaderboard?period=${period}&page=${page + 1}&size=${pageSize}`);
      setEntries((e) => [...e, ...d.entries]);
      setPage((p) => p + 1);
      setMore(d.has_more);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <LeaderboardTable entries={entries.slice(3)} me={me} />
      {error && <div className="p-4"><InlineAlert>{error}</InlineAlert></div>}
      {more && (
        <div className="border-t border-line p-4 text-center">
          <Button variant="secondary" loading={loading} onClick={loadMore}>Load more</Button>
        </div>
      )}
    </>
  );
}
