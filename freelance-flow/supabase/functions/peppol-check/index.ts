import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { vatDigits } = await req.json();

  if (!vatDigits || !/^\d{10}$/.test(vatDigits)) {
    return new Response(
      JSON.stringify({ error: "Format invalide" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const participantId = `iso6523-actorid-upis::0208:${vatDigits}`;
  const url = `https://directory.peppol.eu/search/1.0/json?participant=${encodeURIComponent(participantId)}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = res.status === 404 ? { matches: [] } : await res.json();
    const isRegistered = Array.isArray(data?.matches) && data.matches.length > 0;

    return new Response(
      JSON.stringify({
        isRegistered,
        peppolId:  isRegistered ? `0208:${vatDigits}` : null,
        checkedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});