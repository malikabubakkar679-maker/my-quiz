"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { CourseIcon } from "@/components/CourseIcon";
import { UserAvatar } from "@/components/UserAvatar";
import { DifficultyBadge } from "@/components/ui";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type Results = {
  courses: { id: string; name: string; slug: string; icon: string | null; quiz_count: number }[];
  quizzes: { id: string; title: string; difficulty: string; question_count: number; courses: { name: string; slug: string } | null }[];
  users: { id: string; username: string; display_name: string; avatar_url: string | null; level: number }[];
};

export function SearchBar({ className, autoFocus, onNavigate }: { className?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        setResults(await api<Results>(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal }));
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = () => {
    setOpen(false);
    setQ("");
    onNavigate?.();
  };
  const empty = results && !results.courses.length && !results.quizzes.length && !results.users.length;

  return (
    <div ref={box} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) {
            router.push(`/courses?q=${encodeURIComponent(q.trim())}`);
            go();
          }
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search courses or quizzes..."
          aria-label="Search courses, quizzes or users"
          className="h-11 w-full rounded-xl border border-line bg-white/[0.04] pr-10 pl-10 text-sm outline-none placeholder:text-muted/80 focus:border-brand/60 focus:ring-4 focus:ring-brand/15"
        />
        {loading && <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted" />}
      </form>
      {open && q.trim().length >= 2 && (results || error) && (
        <div className="animate-fade-in glass absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl bg-surface/95 p-2">
          {error && <p className="p-3 text-sm text-rose-300">Search failed. Please try again.</p>}
          {empty && <p className="p-3 text-sm text-muted">No results for “{q.trim()}”.</p>}
          {results && results.courses.length > 0 && (
            <Section title="Courses">
              {results.courses.map((c) => (
                <Link key={c.id} href={`/courses/${c.slug}`} onClick={go} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.06]">
                  <CourseIcon icon={c.icon} seed={c.slug} className="size-9" />
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted">{c.quiz_count} quizzes</span>
                </Link>
              ))}
            </Section>
          )}
          {results && results.quizzes.length > 0 && (
            <Section title="Quizzes">
              {results.quizzes.map((z) => (
                <Link key={z.id} href={`/quiz?quiz=${z.id}`} onClick={go} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.06]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{z.title}</p>
                    <p className="text-xs text-muted">{z.courses?.name} · {z.question_count} questions</p>
                  </div>
                  <DifficultyBadge value={z.difficulty} />
                </Link>
              ))}
            </Section>
          )}
          {results && results.users.length > 0 && (
            <Section title="Users">
              {results.users.map((u) => (
                <Link key={u.id} href={`/u/${u.username}`} onClick={go} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.06]">
                  <UserAvatar src={u.avatar_url} name={u.username} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.display_name}</p>
                    <p className="text-xs text-muted">@{u.username}</p>
                  </div>
                  <span className="text-xs text-muted">Lv {u.level}</span>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</p>
      {children}
    </div>
  );
}
