import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
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
import { NIGERIAN_STATES, DISCOS, timeAgo } from "@/lib/nigeria";
import { Plus, Zap, ZapOff, Loader2, ThumbsUp } from "lucide-react";
import { z } from "zod";
import { ReportFilters, FilterState } from "@/components/ReportFilters";
import { useAreaAlerts, useNotificationPermission } from "@/hooks/useAreaAlerts";

// Default Leaflet icon fix
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface PowerReport {
  id: string;
  user_id: string;
  area: string;
  state: string;
  disco: string | null;
  status: "light" | "no_light" | "partial";
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  upvotes: number;
  created_at: string;
}

const reportSchema = z.object({
  area: z.string().trim().min(2).max(100),
  state: z.string().min(2),
  disco: z.string().optional(),
  status: z.enum(["light", "no_light", "partial"]),
  notes: z.string().trim().max(280).optional().or(z.literal("")),
});

const statusConfig = {
  light: { label: "Light on", color: "bg-status-light text-status-light-foreground", dot: "hsl(var(--status-light))" },
  no_light: { label: "No light", color: "bg-status-out text-status-out-foreground", dot: "hsl(var(--status-out))" },
  partial: { label: "Intermittent", color: "bg-status-partial text-status-partial-foreground", dot: "hsl(var(--status-partial))" },
};

export const PowerReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<PowerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ area: "", state: "", disco: "", status: "light" as const, notes: "" });
  const [filters, setFilters] = useState<FilterState>({ state: "", area: "", last24h: false });
  const [alertsOn, setAlertsOn] = useState(false);
  const { permission, request, supported } = useNotificationPermission();

  const handleAlertToggle = async (next: boolean) => {
    if (next && permission !== "granted") {
      const res = await request();
      if (res !== "granted") {
        toast({ title: "Notifications blocked", description: "Enable notifications in your browser to get alerts.", variant: "destructive" });
        return;
      }
    }
    setAlertsOn(next);
    if (next) toast({ title: "Alerts on", description: `You'll get a ping for new power reports in ${filters.area || filters.state}.` });
  };

  const loadReports = async () => {
    const { data, error } = await supabase
      .from("power_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast({ title: "Couldn't load reports", description: error.message, variant: "destructive" });
    else setReports((data ?? []) as PowerReport[]);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
    const channel = supabase
      .channel("power_reports_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "power_reports" }, () => loadReports())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null),
        { timeout: 5000 },
      );
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = reportSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("power_reports").insert({
      user_id: user.id,
      area: parsed.data.area,
      state: parsed.data.state,
      disco: parsed.data.disco || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Report submitted!", description: "Thanks for helping your area." });
    setOpen(false);
    setForm({ area: "", state: "", disco: "", status: "light", notes: "" });
  };

  const upvote = async (r: PowerReport) => {
    if (!user) return;
    const { error } = await supabase.from("report_votes").upsert(
      { user_id: user.id, report_type: "power", report_id: r.id, vote: 1 },
      { onConflict: "user_id,report_type,report_id" },
    );
    if (error) toast({ title: "Couldn't vote", description: error.message, variant: "destructive" });
  };

  const filtered = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return reports.filter((r) => {
      if (filters.state && r.state !== filters.state) return false;
      if (filters.area && !r.area.toLowerCase().includes(filters.area.toLowerCase())) return false;
      if (filters.last24h && new Date(r.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [reports, filters]);

  const mapped = useMemo(() => filtered.filter((r) => r.latitude && r.longitude), [filtered]);
  const center: [number, number] = mapped.length
    ? [mapped[0].latitude!, mapped[0].longitude!]
    : [9.082, 8.6753]; // Nigeria center

  useAreaAlerts(
    reports,
    { enabled: alertsOn, state: filters.state, area: filters.area, label: "Power" },
    (r) => `${r.area}, ${r.state}: ${statusConfig[r.status].label}`,
  );

  return (
    <div className="space-y-4">
      <ReportFilters
        filters={filters}
        onChange={setFilters}
        alertEnabled={alertsOn}
        onAlertToggle={handleAlertToggle}
        alertCapable={supported}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      {/* Map */}
      <div className="relative h-[400px] overflow-hidden rounded-xl border border-border shadow-card lg:h-[600px]">
        <MapContainer center={center} zoom={mapped.length ? 11 : 6} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mapped.map((r) => (
            <CircleMarker
              key={r.id}
              center={[r.latitude!, r.longitude!]}
              radius={10}
              pathOptions={{ color: statusConfig[r.status].dot, fillColor: statusConfig[r.status].dot, fillOpacity: 0.7, weight: 2 }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{r.area}, {r.state}</div>
                  <Badge className={statusConfig[r.status].color}>{statusConfig[r.status].label}</Badge>
                  {r.disco && <div className="text-xs text-muted-foreground">{r.disco}</div>}
                  {r.notes && <div className="text-sm">{r.notes}</div>}
                  <div className="text-xs text-muted-foreground">{timeAgo(r.created_at)} • ▲ {r.upvotes}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Floating report button */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="absolute bottom-4 right-4 z-[1000] shadow-elevated h-12 rounded-full px-5">
              <Plus className="h-5 w-5" /> Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report power status</DialogTitle>
              <DialogDescription>Help your community know what's happening.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">⚡ Light is ON</SelectItem>
                    <SelectItem value="no_light">🚫 No light</SelectItem>
                    <SelectItem value="partial">⚠️ Intermittent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">Area / LGA</Label>
                  <Input id="area" required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Yaba" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>DisCo (optional)</Label>
                <Select value={form.disco} onValueChange={(v) => setForm({ ...form, disco: v })}>
                  <SelectTrigger><SelectValue placeholder="Select your DisCo" /></SelectTrigger>
                  <SelectContent>
                    {DISCOS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" maxLength={280} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Light came back 30 mins ago" />
              </div>
              {coords && <p className="text-xs text-muted-foreground">📍 Location attached</p>}
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Feed */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h3 className="font-display text-lg font-semibold">Live reports</h3>
          <p className="text-xs text-muted-foreground">{filtered.length} of {reports.length} reports • real-time</p>
        </div>
        <div className="max-h-[540px] overflow-y-auto">
          {loading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {reports.length === 0 ? <>No reports yet. Be the first! Tap <strong>Report</strong>.</> : "No reports match your filters."}
            </div>
          ) : (
            filtered.map((r) => {
              const cfg = statusConfig[r.status];
              const Icon = r.status === "light" ? Zap : ZapOff;
              return (
                <div key={r.id} className="flex items-start gap-3 border-b border-border/50 p-4 last:border-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-medium">{r.area}, {r.state}</div>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-normal">{cfg.label}</Badge>
                      {r.disco && <span className="text-muted-foreground">{r.disco}</span>}
                    </div>
                    {r.notes && <p className="mt-1.5 text-sm text-muted-foreground">{r.notes}</p>}
                    <button onClick={() => upvote(r)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                      <ThumbsUp className="h-3 w-3" /> Confirm ({r.upvotes})
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
