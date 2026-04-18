import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { Activity, Loader2 } from "lucide-react";

const signupSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
  displayName: z.string().trim().min(2, "Name too short").max(50),
  state: z.string().min(2, "Select your state"),
  area: z.string().trim().min(2, "Enter your area / LGA").max(100),
  phone: z.string().trim().regex(/^[0-9+\s-]{7,20}$/, "Invalid phone").optional().or(z.literal("")),
});
const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Password required").max(72),
});

const AuthPage = () => {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState<"login" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // signup state
  const [su, setSu] = useState({ email: "", password: "", displayName: "", state: "", area: "", phone: "" });
  // login state
  const [li, setLi] = useState({ email: "", password: "" });

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(su);
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          display_name: parsed.data.displayName,
          state: parsed.data.state,
          area: parsed.data.area,
          phone: parsed.data.phone || null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome to NaijaPulse!", description: "You're all set." });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(li);
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome back!" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-soft">
      <header className="container flex h-16 items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">NaijaPulse</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated md:p-8">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "login" ? "Log in to access live reports." : "Free, takes 30 seconds."}
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" type="email" autoComplete="email" required value={li.email} onChange={(e) => setLi({ ...li, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="li-password">Password</Label>
                  <Input id="li-password" type="password" autoComplete="current-password" required value={li.password} onChange={(e) => setLi({ ...li, password: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Display name</Label>
                  <Input id="su-name" required value={su.displayName} onChange={(e) => setSu({ ...su, displayName: e.target.value })} placeholder="e.g. Tunde A." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Select value={su.state} onValueChange={(v) => setSu({ ...su, state: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-area">Area / LGA</Label>
                    <Input id="su-area" required value={su.area} onChange={(e) => setSu({ ...su, area: e.target.value })} placeholder="e.g. Lekki" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="su-phone" type="tel" value={su.phone} onChange={(e) => setSu({ ...su, phone: e.target.value })} placeholder="+234..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" autoComplete="email" required value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" type="password" autoComplete="new-password" required value={su.password} onChange={(e) => setSu({ ...su, password: e.target.value })} placeholder="At least 8 characters" />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to use NaijaPulse responsibly and report accurate info.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
