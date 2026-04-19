import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Fuel, MapPin, Users, Calculator, ArrowRight, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Leaderboard } from "@/components/Leaderboard";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Nav */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
              <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">NaijaPulse</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">How it works</a>
            <a href="#community" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Community</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link to="/app">Open app <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link to="/auth">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth?mode=signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-card">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live across 36 states & FCT
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              Know when there's <span className="text-primary">light.</span>
              <br />
              Find fuel without <span className="text-primary">queueing.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Real-time power outage and fuel availability map for Nigeria — reported by Nigerians, verified by the community.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7 text-base shadow-elevated">
                <Link to={user ? "/app" : "/auth?mode=signup"}>
                  {user ? "Open dashboard" : "Get started — it's free"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <a href="#features">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No credit card. Works on any phone. Light app, low data.</p>
          </div>
        </div>
        {/* Decorative blob */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2">
          <div className="mx-auto h-[400px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-border bg-surface-muted py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">The reality</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Nigerians waste hours every week guessing
            </h2>
            <p className="mt-4 text-muted-foreground">
              "Is there light in Lekki?" "Which filling station has fuel today?" "How much is PMS now?"
              You shouldn't have to call five people to find out.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
            {[
              { stat: "4-8 hrs", label: "Avg daily power outage" },
              { stat: "₦1,200+", label: "Fuel price per litre" },
              { stat: "2 hrs", label: "Lost queueing weekly" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
                <div className="font-display text-3xl font-bold text-primary">{s.stat}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">What you get</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">Everything in one app</h2>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
            {[
              {
                icon: Zap,
                title: "Live power status",
                desc: "Report 'light' or 'no light' in your area. See live status across LGAs and DisCos on a clean map.",
              },
              {
                icon: Fuel,
                title: "Fuel station tracker",
                desc: "Find stations with fuel near you, see current pump prices for PMS, diesel, and gas. No surprises at the pump.",
              },
              {
                icon: Calculator,
                title: "Generator calculator",
                desc: "Estimate fuel cost and runtime based on your gen size (KVA) and usage hours. Plan your tank.",
              },
              {
                icon: Users,
                title: "Verified by community",
                desc: "Upvote accurate reports. Reliable contributors earn trust scores so the best info rises to the top.",
              },
            ].map((f) => (
              <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <h3 className="font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border bg-surface-muted py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">Three steps. That's it.</h2>
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Sign up free", d: "Create your account with email or phone in under 30 seconds." },
              { n: "02", t: "Pick your area", d: "Tell us your state and LGA so we surface relevant reports." },
              { n: "03", t: "Report & explore", d: "Tap to report what you see. Browse the live map and fuel feed." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/20 bg-background font-display text-lg font-bold text-primary">
                  {s.n}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <Leaderboard />

      {/* CTA */}
      <section id="community" className="py-20">
        <div className="container">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center shadow-elevated md:p-16">
            <div aria-hidden className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div aria-hidden className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <MapPin className="relative mx-auto h-10 w-10 text-primary-foreground" />
            <h2 className="relative mt-6 font-display text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
              Join the movement.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/90">
              Every report helps your neighbour. Together, we save time, fuel, and stress — all over Nigeria.
            </p>
            <Button asChild size="lg" variant="secondary" className="relative mt-8 h-12 px-7 text-base">
              <Link to={user ? "/app" : "/auth?mode=signup"}>
                {user ? "Open dashboard" : "Create free account"} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-hero">
              <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold">NaijaPulse</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built with ❤️ in Nigeria. © {new Date().getFullYear()} NaijaPulse.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
