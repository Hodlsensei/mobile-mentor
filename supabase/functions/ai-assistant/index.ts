import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMsg { role: "user" | "assistant" | "system"; content: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json() as { messages: ChatMsg[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Pull recent live data (last 24h, capped) to ground the model
    const sinceISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: fuelRows }, { data: powerRows }] = await Promise.all([
      supabase
        .from("fuel_reports")
        .select("fuel_type, available, price_naira, queue_level, notes, created_at, upvotes, fuel_stations(name, brand, area, state)")
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("power_reports")
        .select("area, state, disco, status, notes, created_at, upvotes")
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const fuelLines = (fuelRows ?? []).map((r: any) => {
      const s = r.fuel_stations;
      const price = r.price_naira ? `₦${Number(r.price_naira).toLocaleString()}` : "no price";
      const av = r.available ? "AVAILABLE" : "OUT";
      const station = s ? `${s.name} (${s.brand ?? "—"}) — ${s.area}, ${s.state}` : "Unknown station";
      return `- [FUEL ${r.fuel_type.toUpperCase()}] ${station} | ${av} | ${price} | queue: ${r.queue_level ?? "n/a"} | ${r.notes ?? ""} | ${new Date(r.created_at).toISOString()}`;
    }).join("\n");

    const powerLines = (powerRows ?? []).map((r: any) => {
      return `- [POWER] ${r.area}, ${r.state} | DisCo: ${r.disco ?? "n/a"} | status: ${r.status} | ${r.notes ?? ""} | ${new Date(r.created_at).toISOString()}`;
    }).join("\n");

    const system = `You are NaijaPulse Assistant — a helpful guide for Nigerians tracking real-time power and fuel availability.

Use ONLY the live community reports below (last 24h) when answering questions about prices, availability, queues, or outages. If the data does not cover a question, say so honestly and suggest the user check back or file a report. Be concise, friendly, and use ₦ for prices. Mention station names and areas when relevant.

LIVE FUEL REPORTS:
${fuelLines || "(no fuel reports in last 24h)"}

LIVE POWER REPORTS:
${powerLines || "(no power reports in last 24h)"}

Current time: ${new Date().toISOString()}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiRes.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
