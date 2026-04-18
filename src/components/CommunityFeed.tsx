import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, ZapOff, Fuel } from "lucide-react";
import { timeAgo, formatNaira } from "@/lib/nigeria";

interface Item {
  type: "power" | "fuel";
  id: string;
  created_at: string;
  upvotes: number;
  title: string;
  subtitle: string;
  status: "good" | "bad" | "warn";
  notes: string | null;
}

export const CommunityFeed = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: pwr }, { data: fl }, { data: stations }] = await Promise.all([
      supabase.from("power_reports").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("fuel_reports").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("fuel_stations").select("id,name,area,state"),
    ]);
    const stMap = new Map((stations ?? []).map((s) => [s.id, s]));

    const merged: Item[] = [
      ...(pwr ?? []).map((r): Item => ({
        type: "power",
        id: r.id,
        created_at: r.created_at,
        upvotes: r.upvotes,
        title: `${r.area}, ${r.state}`,
        subtitle: r.status === "light" ? "Light is on" : r.status === "no_light" ? "No light" : "Intermittent",
        status: r.status === "light" ? "good" : r.status === "no_light" ? "bad" : "warn",
        notes: r.notes,
      })),
      ...(fl ?? []).map((r) => {
        const st = stMap.get(r.station_id);
        const price = r.price_naira ? ` • ${formatNaira(r.price_naira)}/L` : "";
        return {
          type: "fuel" as const,
          id: r.id,
          created_at: r.created_at,
          upvotes: r.upvotes,
          title: st ? `${st.name}, ${st.area}` : "Station",
          subtitle: `${r.fuel_type.toUpperCase()} ${r.available ? "available" : "out"}${price}`,
          status: r.available ? ("good" as const) : ("bad" as const),
          notes: r.notes,
        };
      }),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 80);

    setItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("feed_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "power_reports" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_reports" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!items.length) return <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No activity yet — be the first to report.</div>;

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const Icon = it.type === "power" ? (it.status === "good" ? Zap : ZapOff) : Fuel;
        const colorClass =
          it.status === "good" ? "bg-status-light text-status-light-foreground" :
          it.status === "bad" ? "bg-status-out text-status-out-foreground" :
          "bg-status-partial text-status-partial-foreground";
        return (
          <div key={`${it.type}-${it.id}`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate font-medium">{it.title}</div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(it.created_at)}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="outline" className="font-normal text-xs capitalize">{it.type}</Badge>
                <span className="text-sm text-muted-foreground">{it.subtitle}</span>
              </div>
              {it.notes && <p className="mt-1.5 text-sm text-muted-foreground">{it.notes}</p>}
              <div className="mt-1 text-xs text-muted-foreground">▲ {it.upvotes} confirms</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
