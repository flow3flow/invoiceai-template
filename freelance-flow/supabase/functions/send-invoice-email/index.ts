import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- DÉBUT SECTION : Types ---
interface SendInvoiceEmailPayload {
  invoice_id: string;
  pdf_base64: string; // PDF généré côté client, encodé en base64
  recipient_email: string;
  recipient_name: string;
}

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments: {
    filename: string;
    content: string; // base64
  }[];
}
// --- FIN SECTION : Types ---

// --- DÉBUT SECTION : CORS Headers ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// --- FIN SECTION : CORS Headers ---

// --- DÉBUT SECTION : Template HTML Email ---
function buildEmailHtml(params: {
  senderName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: string;
  currency: string;
  dueDate: string;
  recipientName: string;
}): string {
  const {
    senderName,
    invoiceNumber,
    invoiceDate,
    totalAmount,
    currency,
    dueDate,
    recipientName,
  } = params;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Facture ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                InvoiceAI
              </h1>
              <p style="margin:4px 0 0;color:#a0aec0;font-size:13px;">
                Facturation professionnelle simplifiée
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;">
                Bonjour <strong>${recipientName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Veuillez trouver ci-joint la facture <strong>${invoiceNumber}</strong>
                émise par <strong>${senderName}</strong>.
              </p>

              <!-- Invoice Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Numéro de facture</td>
                        <td align="right" style="color:#111827;font-size:13px;font-weight:600;padding-bottom:8px;">
                          ${invoiceNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Date d'émission</td>
                        <td align="right" style="color:#111827;font-size:13px;padding-bottom:8px;">
                          ${invoiceDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Date d'échéance</td>
                        <td align="right" style="color:#e53e3e;font-size:13px;font-weight:600;padding-bottom:8px;">
                          ${dueDate}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colspan="2"
                          style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:4px;">
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#374151;font-size:15px;font-weight:700;">Montant total TTC</td>
                        <td align="right"
                          style="color:#1a1a2e;font-size:18px;font-weight:700;">
                          ${totalAmount} ${currency}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;color:#6b7280;font-size:13px;line-height:1.6;">
                La facture est disponible en pièce jointe au format PDF.
                En cas de question, n'hésitez pas à répondre directement à cet email.
              </p>

              <p style="margin:0;color:#374151;font-size:14px;">
                Cordialement,<br />
                <strong>${senderName}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
                Cet email a été envoyé via InvoiceAI · Business Project Flow<br />
                Facture générée le ${invoiceDate}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
// --- FIN SECTION : Template HTML Email ---

// --- DÉBUT SECTION : Handler principal ---
serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth — vérifier le JWT Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Vérifier l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse le payload
    const payload: SendInvoiceEmailPayload = await req.json();
    const { invoice_id, pdf_base64, recipient_email, recipient_name } = payload;

    if (!invoice_id || !pdf_base64 || !recipient_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invoice_id, pdf_base64, recipient_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Récupérer les données de la facture (snapshots immuables)
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount_ttc,
        currency,
        status,
        issuer_name,
        issuer_email,
        client_name,
        client_email
      `)
      .eq("id", invoice_id)
      .eq("user_id", user.id) // RLS : l'utilisateur ne peut envoyer que SES factures
      .single();

    if (invoiceError || !invoice) {
      console.error("[send-invoice-email] Invoice fetch error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Sécurité : ne pas envoyer une facture en draft
    if (invoice.status === "draft") {
      return new Response(
        JSON.stringify({ error: "Cannot send a draft invoice. Validate it first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Formatage des dates et montants (sans Intl — règle d'or)
    const formatDate = (dateStr: string): string => {
      const d = new Date(dateStr);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const formatAmount = (amount: number, currency: string): string => {
      const fixed = amount.toFixed(2);
      // Formatage européen : séparateur décimal = virgule
      return fixed.replace(".", ",");
    };

    // 6. Construire l'email
    const emailHtml = buildEmailHtml({
      senderName: invoice.issuer_name,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: formatDate(invoice.invoice_date),
      totalAmount: formatAmount(invoice.total_amount_ttc, invoice.currency),
      currency: invoice.currency ?? "EUR",
      dueDate: formatDate(invoice.due_date),
      recipientName: recipient_name || invoice.client_name,
    });

    const resendPayload: ResendEmailPayload = {
      from: `${invoice.issuer_name} via InvoiceAI <invoices@invoiceai.be>`,
      to: [recipient_email],
      subject: `Facture ${invoice.invoice_number} — ${invoice.issuer_name}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Facture_${invoice.invoice_number}.pdf`,
          content: pdf_base64,
        },
      ],
    };

    // 7. Appel Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-invoice-email] RESEND_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error("[send-invoice-email] Resend API error:", resendError);
      return new Response(
        JSON.stringify({ error: "Email sending failed", details: resendError }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();

    // 8. Mettre à jour le statut de la facture → "sent"
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoice_id)
      .eq("user_id", user.id);

    if (updateError) {
      // Non-bloquant : l'email est parti, on log l'erreur de mise à jour
      console.error("[send-invoice-email] Status update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        resend_id: resendData.id,
        invoice_number: invoice.invoice_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-invoice-email] Unhandled error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
// --- FIN SECTION : Handler principal ---