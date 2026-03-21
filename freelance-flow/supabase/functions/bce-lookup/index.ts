import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { vatDigits } = await req.json();

    if (!vatDigits || !/^\d{10}$/.test(vatDigits)) {
      return new Response(
        JSON.stringify({ error: "INVALID_FORMAT", message: "Format invalide — attendu 10 chiffres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tentative 1 — kbodata.be (données riches)
    try {
      const res = await fetch(`https://api.kbodata.be/organisation/${vatDigits}`, {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        const address = data.addresses?.[0] ?? {};
        const denomination =
          data.denominations?.find((d: { language: string }) => d.language === "FR")?.denomination ??
          data.denominations?.[0]?.denomination ??
          data.denomination ?? "";

        return new Response(JSON.stringify({
          enterpriseNumber: data.enterpriseNumber ?? vatDigits,
          denomination,
          legalForm:    data.legalForm?.description ?? null,
          status:       data.status ?? "Unknown",
          street:       address.street ?? null,
          number:       address.number ?? null,
          zipCode:      address.zipCode ?? null,
          municipality: address.municipality ?? null,
          countryCode:  "BE",
          vatNumber:    `BE${vatDigits}`,
          startDate:    data.startDate ?? null,
          source:       "kbodata",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch {
      // kbodata.be failed → fallback VIES
    }

    // Tentative 2 — VIES Commission Européenne (fallback)
    const viesRes = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/BE/vat/${vatDigits}`,
      { headers: { Accept: "application/json" } }
    );

    if (!viesRes.ok) {
      return new Response(
        JSON.stringify({ error: "NOT_FOUND", message: `Aucune entreprise trouvée pour BE${vatDigits}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vies = await viesRes.json();

    // FIX : on utilise le nom même si valid=false (VIES parfois retourne false
    // pour de vraies entreprises belges — on se base sur la présence du nom)
    const denomination = vies.name ?? "";
    if (!denomination) {
      return new Response(
        JSON.stringify({ error: "NOT_FOUND", message: `Aucune donnée trouvée pour BE${vatDigits}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lines = (vies.address ?? "").split("\n").map((l: string) => l.trim()).filter(Boolean);
    const zipCode      = lines[1]?.split(" ")[0] ?? null;
    const municipality = lines[1]?.split(" ").slice(1).join(" ") ?? null;

    return new Response(JSON.stringify({
      enterpriseNumber: vatDigits,
      denomination,
      legalForm:        null,
      status:           vies.valid ? "Active" : "Unknown",
      street:           lines[0] ?? null,
      number:           null,
      zipCode,
      municipality,
      countryCode:      "BE",
      vatNumber:        `BE${vatDigits}`,
      startDate:        null,
      source:           "vies",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "NETWORK_ERROR", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});