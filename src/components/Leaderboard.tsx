import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, MapPin, Award } from "lucide-react";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  state: string | null;
  area: string | null;
  trust_score: number;
  report_count: number;
}

export const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch profiles
      let profileQuery = supabase
        .from("profiles")
        .select("user_id, display_name, state, area, trust_score");

      if (stateFilter !== "all") {
        profileQuery = profileQuery.eq("state", stateFilter);
      }

      const { data: profiles } = await profileQuery;
      if (!profiles) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Fetch recent reports (last 7 days)
      const [{ data: powerReports }, { data: fuelReports }] = await Promise.all([
        supabase.from("power_reports").select("user_id").gte("created_at", sevenDaysAgo),
        supabase.from("fuel_reports").select("user_id").gte("created_at", sevenDaysAgo),
      ]);

      const counts = new Map<string, number>();
      [...(powerReports ?? []), ...(fuelReports ?? [])].forEach((r) => {
        counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
      });

      const ranked: LeaderboardEntry[] = profiles
        .map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          state: p.state,
          area: p.area,
          trust_score: p.trust_score ?? 0,
          report_count: counts.get(p.user_id) ?? 0,
        }))
        .filter((e) => e.report_count > 0 || e.trust_score > 0)
        .sort((a, b) => {
          // Composite: trust_score weighted heavier, then report count
          const scoreA = a.trust_score * 2 + a.report_count;
          const scoreB = b.trust_score * 2 + b.report_count;
          return scoreB - scoreA;
        })
        .slice(0, 10);

      setEntries(ranked);
      setLoading(false);
    };
    load();
  }, [stateFilter]);

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const medalColor = (idx: number) => {
    if (idx === 0) return "text-yellow-500";
    if (idx === 1) return "text-slate-400";
    if (idx === 2) return "text-amber-700";
    return "text-muted-foreground";
  };

  return (
    <section className="border-t border-border bg-background py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Community heroes</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Top trusted reporters
          </h2>
          <p className="mt-4 text-muted-foreground">
            Ranked by trust score and contributions in the last 7 days. Big shout-out to these citizens.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl">
          <div className="mb-4 flex items-center justify-end">
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {NIGERIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No reporters yet for this state. Be the first!</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {entries.map((e, idx) => (
                  <li key={e.user_id} className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-muted">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center font-display text-lg font-bold ${medalColor(idx)}`}>
                      {idx < 3 ? <Trophy className="h-5 w-5 fill-current" /> : `#${idx + 1}`}
                    </div>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {initials(e.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{e.display_name}</div>
                      {(e.state || e.area) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{[e.area, e.state].filter(Boolean).join(", ")}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="gap-1">
                        <Award className="h-3 w-3" />
                        {e.trust_score}
                      </Badge>
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {e.report_count} {e.report_count === 1 ? "report" : "reports"} / 7d
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
