import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { NIGERIAN_STATES, FUEL_TYPES, formatNaira, timeAgo } from "@/lib/nigeria";
import { Plus, Fuel, Loader2, ThumbsUp, MapPin } from "lucide-react";
import { z } from "zod";
import { ReportFilters, FilterState } from "@/components/ReportFilters";
import { useAreaAlerts, useNotificationPermission } from "@/hooks/useAreaAlerts";

interface Station { id: string; name: string; brand: string | null; area: string; state: string; }
interface FuelReport {
  id: string; station_id: string; user_id: string; fuel_type: string;
  available: boolean; price_naira: number | null; queue_level: string | null;
  notes: string | null; upvotes: number; created_at: string;
}

const stationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  brand: z.string().trim().max(50).optional().or(z.literal("")),
  state: z.string().min(2),
  area: z.string().trim().min(2).max(100),
});

const reportSchema = z.object({
  station_id: z.string().uuid(),
  fuel_type: z.enum(["pms", "diesel", "gas", "kerosene"]),
  available: z.boolean(),
  price_naira: z.coerce.number().min(0).max(100000).optional().or(z.literal("")),
  queue_level: z.enum(["none", "short", "long"]).optional(),
  notes: z.string().trim().max(280).optional().or(z.literal("")),
});

export const FuelReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({ state: "", area: "", fuelType: "", last24h: false });
  const [alertsOn, setAlertsOn] = useState(false);
  const { permission, request, supported } = useNotificationPermission();
  const [stations, setStations] = useState<Station[]>([]);
  const [reports, setReports] = useState<(FuelReport & { station: Station | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [stationOpen, setStationOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [stationForm, setStationForm] = useState({ name: "", brand: "", state: "", area: "" });
  const [reportForm, setReportForm] = useState({
    station_id: "", fuel_type: "pms" as const, available: true, price_naira: "" as string,
    queue_level: "none" as const, notes: "",
  });

  const load = async () => {
    const [{ data: stData }, { data: rpData }] = await Promise.all([
      supabase.from("fuel_stations").select("*").order("created_at", { ascending: false }),
      supabase.from("fuel_reports").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    const sts = (stData ?? []) as Station[];
    setStations(sts);
    const stMap = new Map(sts.map((s) => [s.id, s]));
    setReports(((rpData ?? []) as FuelReport[]).map((r) => ({ ...r, station: stMap.get(r.station_id) ?? null })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("fuel_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_reports" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_stations" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submitStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = stationSchema.safeParse(stationForm);
    if (!parsed.success) {
      toast({ title: "Check inputs", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("fuel_stations").insert({
      name: parsed.data.name, brand: parsed.data.brand || null,
      state: parsed.data.state, area: parsed.data.area, created_by: user.id,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Station added!" });
    setStationOpen(false);
    setStationForm({ name: "", brand: "", state: "", area: "" });
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = reportSchema.safeParse(reportForm);
    if (!parsed.success) {
      toast({ title: "Check inputs", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("fuel_reports").insert({
      user_id: user.id,
      station_id: parsed.data.station_id,
      fuel_type: parsed.data.fuel_type,
      available: parsed.data.available,
      price_naira: parsed.data.price_naira === "" ? null : Number(parsed.data.price_naira),
      queue_level: parsed.data.queue_level || null,
      notes: parsed.data.notes || null,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Report submitted!", description: "Thanks for helping drivers near you." });
    setReportOpen(false);
    setReportForm({ station_id: "", fuel_type: "pms", available: true, price_naira: "", queue_level: "none", notes: "" });
  };

  const upvote = async (r: FuelReport) => {
    if (!user) return;
    await supabase.from("report_votes").upsert(
      { user_id: user.id, report_type: "fuel", report_id: r.id, vote: 1 },
      { onConflict: "user_id,report_type,report_id" },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Fuel stations near you</h3>
          <p className="text-sm text-muted-foreground">{stations.length} stations • {reports.length} recent reports</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={stationOpen} onOpenChange={setStationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4" /> Add station</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add fuel station</DialogTitle>
                <DialogDescription>So others can find and report it.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submitStation} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="st-name">Station name</Label>
                  <Input id="st-name" required value={stationForm.name} onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })} placeholder="e.g. NNPC Mega Station Wuse" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-brand">Brand</Label>
                  <Input id="st-brand" value={stationForm.brand} onChange={(e) => setStationForm({ ...stationForm, brand: e.target.value })} placeholder="NNPC, Total, Mobil..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Select value={stationForm.state} onValueChange={(v) => setStationForm({ ...stationForm, state: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="st-area">Area</Label>
                    <Input id="st-area" required value={stationForm.area} onChange={(e) => setStationForm({ ...stationForm, area: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add station"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={stations.length === 0}><Plus className="h-4 w-4" /> Report fuel</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report fuel availability</DialogTitle>
                <DialogDescription>Share what you saw at the pump.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submitReport} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Station</Label>
                  <Select value={reportForm.station_id} onValueChange={(v) => setReportForm({ ...reportForm, station_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {s.area}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Fuel type</Label>
                    <Select value={reportForm.fuel_type} onValueChange={(v) => setReportForm({ ...reportForm, fuel_type: v as typeof reportForm.fuel_type })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FUEL_TYPES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Available?</Label>
                    <Select value={reportForm.available ? "yes" : "no"} onValueChange={(v) => setReportForm({ ...reportForm, available: v === "yes" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">✅ Available</SelectItem>
                        <SelectItem value="no">🚫 No fuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rp-price">Price/litre (₦)</Label>
                    <Input id="rp-price" type="number" min="0" max="100000" value={reportForm.price_naira} onChange={(e) => setReportForm({ ...reportForm, price_naira: e.target.value })} placeholder="1200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Queue</Label>
                    <Select value={reportForm.queue_level} onValueChange={(v) => setReportForm({ ...reportForm, queue_level: v as typeof reportForm.queue_level })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No queue</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="long">Very long</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-notes">Notes (optional)</Label>
                  <Textarea id="rp-notes" maxLength={280} value={reportForm.notes} onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Fuel className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No fuel reports yet</p>
          <p className="text-sm text-muted-foreground">Add a station, then submit the first report.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map((r) => {
            const ft = FUEL_TYPES.find((f) => f.value === r.fuel_type);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{r.station?.name ?? "Unknown station"}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {r.station?.area}, {r.station?.state}
                    </div>
                  </div>
                  {r.available ? (
                    <Badge className="bg-status-light text-status-light-foreground">Available</Badge>
                  ) : (
                    <Badge className="bg-status-out text-status-out-foreground">No fuel</Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{ft?.label}</Badge>
                  {r.price_naira && <span className="font-mono font-semibold text-primary">{formatNaira(r.price_naira)}/L</span>}
                  {r.queue_level && r.queue_level !== "none" && (
                    <Badge variant="secondary" className="text-xs">Queue: {r.queue_level}</Badge>
                  )}
                </div>
                {r.notes && <p className="mt-2 text-sm text-muted-foreground">{r.notes}</p>}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{timeAgo(r.created_at)}</span>
                  <button onClick={() => upvote(r)} className="inline-flex items-center gap-1 hover:text-primary">
                    <ThumbsUp className="h-3 w-3" /> Confirm ({r.upvotes})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
