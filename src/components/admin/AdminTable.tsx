import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui";

export function AdminTable({ head, rows, empty, page, hasMore, base }: { head: string[]; rows: ReactNode[][]; empty: string; page: number; hasMore: boolean; base: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <Card className="overflow-hidden">
      {rows.length === 0 ? (
        <EmptyState className="m-4" title={empty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-xs text-muted">{head.map((h, i) => <th key={h} className={`px-4 py-3 font-medium ${i === head.length - 1 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className={`px-4 py-3 ${j === r.length - 1 ? "text-right" : ""}`}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {(page > 0 || hasMore) && (
        <div className="flex justify-between border-t border-line p-3 text-sm">
          {page > 0 ? <Link className="text-violet-300 hover:text-white" href={`${base}${sep}page=${page - 1}`}>← Previous</Link> : <span />}
          {hasMore && <Link className="text-violet-300 hover:text-white" href={`${base}${sep}page=${page + 1}`}>Next →</Link>}
        </div>
      )}
    </Card>
  );
}

export const PAGE_SIZE = 25;
export function pageOf(v?: string) {
  return Math.max(0, Number(v ?? 0) || 0);
}
