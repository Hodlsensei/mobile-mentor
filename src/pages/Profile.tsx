import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Trophy, Zap, Fuel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { NIGERIAN_STATES, timeAgo } from "@/lib/nigeria";

interface Profile {
  display_name: string;
  state: string | null;
  area: string | null;
  phone: string | null;
  trust_score: number;
}

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [powerCount, setPowerCount] = useState(0);
  const [fuelCount, setFuelCount] = useState(0);
  const [recent, setRecent] = useState<Array<{ kind: "power" | "fuel"; label: string; created_at: string }>>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: pr, count: pc }, { data: fr, count: fc }] = await Promise.all([
        supabase.from("profiles").select("display_name, state, area, phone, trust_score").eq("user_id", user.id).maybeSingle(),
        supabase.from("power_reports").select("area, status, created_at", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("fuel_reports").select("fuel_type, available, created_at", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      if (p) setProfile(p as Profile);
      setPowerCount(pc ?? 0);
      setFuelCount(fc ?? 0);
      const merged = [
        ...(pr ?? []).map((r) => ({ kind: "power" as const, label: `${r.area} — ${r.status.replace("_", " ")}`, created_at: r.created_at })),
        ...(fr ?? []).map((r) => ({ kind: "fuel" as const, label: `${r.fuel_type.toUpperCase()} — ${r.available ? "available" : "out"}`, created_at: r.created_at })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
      setRecent(merged);
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name,
      state: profile.state,
      area: profile.area,
      phone: profile.phone,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <AppHeader />
        <div className="container flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader />
      <main className="container max-w-3xl py-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/app"><ArrowLeft className="mr-1 h-4 w-4" /> Back to dashboard</Link>
        </Button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Your profile</h1>
            <p className="text-sm text-muted-foreground">Update your details and review your contributions.</p>
          </div>
          <Badge variant="secondary" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />{profile.trust_score} trust</Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardContent className="flex items-center gap-3 p-4"><Zap className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{powerCount}</p><p className="text-xs text-muted-foreground">Power reports</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Fuel className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{fuelCount}</p><p className="text-xs text-muted-foreground">Fuel reports</p></div></CardContent></Card>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">Account details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="dn">Display name</Label><Input id="dn" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ph">Phone</Label><Input id="ph" value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+234..." /></div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={profile.state ?? ""} onValueChange={(v) => setProfile({ ...profile, state: v })}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="area">Area / LGA</Label><Input id="area" value={profile.area ?? ""} onChange={(e) => setProfile({ ...profile, area: e.target.value })} placeholder="e.g. Lekki Phase 1" /></div>
            <div className="sm:col-span-2"><Button onClick={save} disabled={saving} className="w-full sm:w-auto">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button></div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">Recent activity</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet. Head to the dashboard to log one.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-2">
                      {r.kind === "power" ? <Zap className="h-3.5 w-3.5 text-primary" /> : <Fuel className="h-3.5 w-3.5 text-primary" />}
                      {r.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
