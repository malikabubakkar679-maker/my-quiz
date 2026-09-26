import { Globe2 } from "lucide-react";
import { LeaderboardTable, Podium } from "@/components/LeaderboardRow";
import { EmptyState } from "@/components/states";
import { Card, PageHeader, TabLinks } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { getCountries, getLeaderboard, parsePeriod } from "@/lib/leaderboard";

export const metadata = { title: "International" };

export default async function InternationalPage({ searchParams }: { searchParams: Promise<{ period?: string; country?: string }> }) {
  const profile = await pageProfile();
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const country = sp.country?.trim() || null;
  const [entries, countries] = await Promise.all([getLeaderboard({ period, country, limit: 10 }), getCountries()]);
  const qs = (p: string, c: string | null) => {
    const u = new URLSearchParams();
    if (p !== "all") u.set("period", p);
    if (c) u.set("country", c);
    const s = u.toString();
    return `/international${s ? `?${s}` : ""}`;
  };
  return (
    <div>
      <PageHeader title="International" description={`Top 10 players${country ? ` in ${country}` : " worldwide"}.`} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <TabLinks
          value={period}
          options={[
            { value: "all", label: "Global", href: qs("all", country) },
            { value: "weekly", label: "Weekly", href: qs("weekly", country) },
            { value: "monthly", label: "Monthly", href: qs("monthly", country) },
          ]}
        />
        <form className="flex gap-2" action="/international">
          {period !== "all" && <input type="hidden" name="period" value={period} />}
          <select name="country" defaultValue={country ?? ""} aria-label="Country" className="h-11 rounded-xl border border-line bg-white/[0.04] px-3 text-sm [&>option]:bg-surface">
            <option value="">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="h-11 rounded-xl border border-line bg-white/[0.06] px-4 text-sm font-semibold hover:bg-white/[0.1]">Apply</button>
        </form>
      </div>
      {entries.length === 0 ? (
        <EmptyState icon={<Globe2 className="size-6" />} title="No players ranked yet" description={country ? `No ranked players from ${country} for this period.` : "Complete quizzes to appear on the international board."} />
      ) : (
        <div className="space-y-6">
          <Card className="px-4 pt-8 sm:px-10"><Podium entries={entries.slice(0, 3)} /></Card>
          <Card className="overflow-hidden"><LeaderboardTable entries={entries} me={profile.id} showCountry /></Card>
        </div>
      )}
    </div>
  );
}
