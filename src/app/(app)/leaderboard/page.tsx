import { Trophy } from "lucide-react";
import { LeaderboardList } from "@/components/LeaderboardList";
import { Podium } from "@/components/LeaderboardRow";
import { EmptyState } from "@/components/states";
import { Card, PageHeader, TabLinks } from "@/components/ui";
import { pageProfile } from "@/lib/auth";
import { getLeaderboard, parsePeriod } from "@/lib/leaderboard";

export const metadata = { title: "Leaderboard" };
const PAGE = 50;

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const profile = await pageProfile();
  const period = parsePeriod((await searchParams).period);
  const entries = await getLeaderboard({ period, limit: PAGE });
  const mine = entries.find((e) => e.profile_id === profile.id);
  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description={period === "all" ? "All-time rankings across every My Quiz player." : period === "weekly" ? "Rankings from the last 7 days." : "Rankings from the last 30 days."}
        action={
          <TabLinks
            value={period}
            options={[
              { value: "all", label: "Global", href: "/leaderboard" },
              { value: "weekly", label: "Weekly", href: "/leaderboard?period=weekly" },
              { value: "monthly", label: "Monthly", href: "/leaderboard?period=monthly" },
            ]}
          />
        }
      />
      {entries.length === 0 ? (
        <EmptyState icon={<Trophy className="size-6" />} title="No rankings yet" description="Complete a quiz to claim the top spot." />
      ) : (
        <div className="space-y-6">
          <Card className="px-4 pt-8 sm:px-10"><Podium entries={entries.slice(0, 3)} /></Card>
          {mine && <p className="text-sm text-muted">You’re ranked <b className="text-white">#{mine.rank}</b> with {mine.score.toLocaleString()} points.</p>}
          {entries.length > 3 && (
            <Card className="overflow-hidden">
              <LeaderboardList key={period} initial={entries} period={period} me={profile.id} pageSize={PAGE} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
