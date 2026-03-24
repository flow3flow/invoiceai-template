// src/pages/InvoiceGenerator.tsx
// ✅ FIE (Financial Integrity Engine) branché sur le bouton Enregistrer
// ✅ Checklist conformité style audit terminal
// ✅ Logique métier 100% préservée

import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { ClientSelect } from "@/components/invoice/ClientSelect";
import { BusinessProfileSelect } from "@/components/invoice/BusinessProfileSelect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useBusinessProfiles } from "@/hooks/useBusinessProfiles";
import { generateInvoicePdf } from "@/lib/pdf/generateInvoicePdf";
import { generateStructuredRef } from "@/lib/structured-ref";
import {
  validateLegalMentions,
  type InvoiceToValidate,
  type ValidationError,
} from "@/lib/engine/financialIntegrity";
import { toast } from "sonner";
import type { InvoiceData, DocumentType } from "@/types/invoice";
import { DOC_CONFIG } from "@/types/invoice";
import type { VatScenario } from "@/lib/vatScenario";
import type { BusinessProfile } from "@/hooks/useBusinessProfiles";
import {
  Save, Download, Loader2,
  AlertTriangle, ShieldCheck, ShieldAlert, Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — inchangés
// ─────────────────────────────────────────────────────────────────────────────

function addDaysToDate(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatBusinessAddress(profile: {
  street: string | null;
  zip_code: string | null;
  city: string | null;
  country_code: string;
}): string {
  return [
    profile.street,
    [profile.zip_code, profile.city].filter(Boolean).join(" "),
    profile.country_code,
  ]
    .filter(Boolean)
    .join(", ");
}

// ─────────────────────────────────────────────────────────────────────────────
// État initial — inchangé
// ─────────────────────────────────────────────────────────────────────────────

const defaultInvoice: InvoiceData = {
  companyName:        "",
  companyAddress:     "",
  companyVat:         "",
  companyEmail:       "",
  companyLogo:        null,
  companyCountryCode: "BE",
  clientName:         "",
  clientAddress:      "",
  clientVat:          "",
  clientEmail:        "",
  invoiceNumber:      "",
  invoiceDate:        new Date().toISOString().split("T")[0],
  serviceDate:        null,
  dueDate:            "30",
  lineItems:          [{ description: "", quantity: 1, unitPrice: 0, vatRate: 21 }],
  notes:              "",
  paymentMethod:      "bank",
  iban:               "",
  vatScenario:        "BE_STANDARD_21" as VatScenario,
  documentType:       "invoice",
  validityDays:       30,
  validUntil:         "",
  clientReference:    "",
};

// ─────────────────────────────────────────────────────────────────────────────
// FIE Checklist — style audit terminal
// ─────────────────────────────────────────────────────────────────────────────

function FIEChecklist({
  errors,
  isLegal,
  isVisible,
}: {
  errors: ValidationError[];
  isLegal: boolean;
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  // Chaque check est indépendant — détection par code + message précis
  const checks = [
    {
      label:  "TVA ÉMETTEUR",
      ok: !errors.some((e) => e.code === "VAT_INVALID"),
    },
    {
      label:  "IBAN ÉMETTEUR",
      ok: !errors.some(
        (e) => e.code === "LEGAL_MISSING" && e.message.toLowerCase().includes("iban"),
      ),
    },
    {
      label:  "ADRESSE CLIENT",
      ok: !errors.some(
        (e) => e.code === "LEGAL_MISSING" && e.message.toLowerCase().includes("adresse"),
      ),
    },
    {
      label:  "INTÉGRITÉ CALCULS",
      ok: !errors.some((e) => e.code === "MATH_ERROR"),
    },
  ];

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-4 relative overflow-hidden min-w-[220px]">

      {/* Icône décorative fond */}
      <div className="absolute top-2 right-2 opacity-5 text-primary">
        <ShieldCheck className="h-10 w-10" />
      </div>

      {/* Titre audit */}
      <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Zap className={`h-3 w-3 ${isLegal ? "text-green-500" : "text-amber-500"}`} />
        Audit conformité
      </p>

      {/* Checks */}
      <div className="space-y-2.5">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center justify-between border-b border-border/30 pb-2 last:border-0 last:pb-0"
          >
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {check.label}
            </span>
            <span
              className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                check.ok ? "text-green-500" : "text-amber-500"
              }`}
            >
              {check.ok ? "✓ VALIDE" : "⚠ REQUIS"}
            </span>
          </div>
        ))}
      </div>

      {/* Première erreur détaillée */}
      {errors.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border/30 text-[10px] font-mono text-amber-500/80 leading-snug">
          ⚠ {errors[0].message}
        </div>
      )}

      {/* Succès */}
      {isLegal && (
        <div className="mt-3 pt-2 border-t border-green-500/20 text-[10px] font-mono text-green-500 flex items-center gap-1">
          ✓ Conforme AR n°1 art. 54 BE / CGI art. 289 FR
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal — inchangé
// ─────────────────────────────────────────────────────────────────────────────

const InvoiceGenerator = () => {
  const [invoice, setInvoice]                   = useState<InvoiceData>(defaultInvoice);
  const [docType, setDocType]                   = useState<DocumentType>("invoice");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBusinessProfile, setSelectedBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [saved, setSaved]               = useState(false);
  const [numberLoading, setNumberLoading] = useState(true);
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  const navigate = useNavigate();
  const { createInvoice, getNextInvoiceNumber, loading } = useInvoices();
  const { clients }        = useClients();
  const { defaultProfile } = useBusinessProfiles();

  const updateInvoice = useCallback((updates: Partial<InvoiceData>) => {
    setInvoice((prev) => ({ ...prev, ...updates }));
  }, []);

  // ── Numéro séquentiel — inchangé ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNumberLoading(true);
      try {
        const prefixMap: Record<DocumentType, string> = {
          invoice:     "INV",
          quote:       "DEV",
          order:       "BC",
          credit_note: "NC",
        };
        const number = await getNextInvoiceNumber(prefixMap[docType] ?? "INV");
        if (!cancelled) updateInvoice({ invoiceNumber: number });
      } catch (err) {
        console.error("[InvoiceGenerator] getNextInvoiceNumber:", err);
        toast.error("Impossible de générer le numéro de facture. Rechargez la page.");
      } finally {
        if (!cancelled) setNumberLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [docType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pré-remplissage profil — inchangé ────────────────────────────────────
  useEffect(() => {
    const profile = selectedBusinessProfile ?? defaultProfile;
    if (!profile) return;
    updateInvoice({
      companyName:        profile.company_name ?? "",
      companyAddress:     formatBusinessAddress(profile),
      companyVat:         profile.vat_number ?? "",
      companyEmail:       profile.email ?? "",
      iban:               profile.iban ?? "",
      companyCountryCode: profile.country_code ?? "BE",
      vatScenario: (profile.country_code === "FR"
        ? "FR_STANDARD_20"
        : "BE_STANDARD_21") as VatScenario,
    });
  }, [selectedBusinessProfile, defaultProfile, updateInvoice]);

  // ── Changement type document — inchangé ──────────────────────────────────
  const handleDocTypeChange = (value: string) => {
    if (!value) return;
    const newType = value as DocumentType;
    setDocType(newType);
    const updates: Partial<InvoiceData> = { documentType: newType };
    if (newType === "quote") {
      updates.validUntil = addDaysToDate(invoice.invoiceDate, invoice.validityDays || 30);
    }
    updateInvoice(updates);
  };

  // ── Sélection client — inchangé ───────────────────────────────────────────
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      updateInvoice({
        clientName:    client.name,
        clientAddress: [client.street, client.zip_code, client.city, client.country_code]
          .filter(Boolean).join(", "),
        clientVat:     client.vat_number ?? "",
        clientEmail:   client.email ?? "",
      });
    }
  };

  // ── FIE validation temps réel — inchangé ─────────────────────────────────
  const fieValidation = useMemo(() => {
    const subtotalHT = invoice.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice, 0,
    );
    const toValidate: InvoiceToValidate = {
      issuer_vat_number: invoice.companyVat || null,
      issuer_iban:       invoice.iban || null,
      client_vat_number: invoice.clientVat || null,
      client_address:    invoice.clientAddress || null,
      client_is_company: !!invoice.clientVat,
      total_ht:          subtotalHT,
      items: invoice.lineItems.map((item) => ({
        unit_price: item.unitPrice,
        quantity:   item.quantity,
      })),
    };
    return validateLegalMentions(toValidate);
  }, [invoice]);

  // ── Sauvegarde — inchangée ────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setShowChecklist(true);

    if (!selectedClientId) { toast.error("Veuillez sélectionner un client"); return; }
    const profile = selectedBusinessProfile ?? defaultProfile;
    if (!profile) { toast.error("Veuillez créer un profil entreprise dans Paramètres"); return; }
    if (numberLoading || !invoice.invoiceNumber.trim()) {
      toast.error("Numéro de facture en cours de génération, patientez."); return;
    }

    if (!fieValidation.isLegal) {
      const errorCodes = fieValidation.errors.map((e) => e.code);
      if (errorCodes.includes("MATH_ERROR")) {
        toast.error("❌ Erreur de calcul détectée — corrigez les montants avant de continuer");
        return;
      }
      toast.error(
        `❌ ${fieValidation.errors.length} mention${fieValidation.errors.length > 1 ? "s" : ""} légale${fieValidation.errors.length > 1 ? "s" : ""} manquante${fieValidation.errors.length > 1 ? "s" : ""} — voir le récapitulatif ci-dessous`,
      );
      return;
    }

    const invalidItems = invoice.lineItems.filter(
      (item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0 || item.vatRate < 0,
    );
    if (invalidItems.length > 0) {
      toast.error("Vérifiez vos lignes : description vide, quantité ou prix invalide"); return;
    }

    const dueDays  = parseInt(invoice.dueDate, 10);
    const due_date = !isNaN(dueDays) ? addDaysToDate(invoice.invoiceDate, dueDays) : null;
    const structured_ref = generateStructuredRef(invoice.invoiceNumber);

    const issuer_snapshot = {
      issuer_company_name: profile.company_name ?? "",
      issuer_vat_number:   profile.vat_number ?? null,
      issuer_street:       profile.street ?? null,
      issuer_zip_code:     profile.zip_code ?? null,
      issuer_city:         profile.city ?? null,
      issuer_country_code: profile.country_code ?? null,
      issuer_email:        profile.email ?? null,
      issuer_iban:         profile.iban ?? null,
      issuer_logo_path:    profile.logo_path ?? null,
    };

    const result = await createInvoice({
      client_id:           selectedClientId,
      business_profile_id: profile.id,
      invoice_number:      invoice.invoiceNumber,
      issue_date:          invoice.invoiceDate,
      due_date,
      notes:               invoice.notes || null,
      vat_scenario:        invoice.vatScenario,
      issuer_vat_scheme:   "normal",
      service_date:        invoice.serviceDate ?? null,
      document_type:       docType,
      validity_days:       docType === "quote" ? invoice.validityDays : null,
      valid_until:         docType === "quote" ? invoice.validUntil || null : null,
      client_reference:    docType === "order" ? invoice.clientReference || null : null,
      structured_ref,
      items: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unitPrice,
        vat_rate:    item.vatRate,
      })),
      issuer_snapshot,
    });

    if (result) { setSaved(true); navigate("/dashboard"); }
  };

  // ── PDF — inchangé ────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    const profile = selectedBusinessProfile ?? defaultProfile;
    if (!profile) { toast.error("Profil entreprise requis pour générer le PDF"); return; }
    if (!invoice.lineItems.some((i) => i.description.trim())) {
      toast.error("Ajoutez au moins une ligne de prestation"); return;
    }

    setPdfLoading(true);
    try {
      const client         = clients.find((c) => c.id === selectedClientId);
      const structured_ref = invoice.invoiceNumber ? generateStructuredRef(invoice.invoiceNumber) : null;
      const subtotal       = invoice.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const vat_amount     = invoice.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice * (i.vatRate / 100), 0);
      const total          = subtotal + vat_amount;

      await generateInvoicePdf(
        {
          invoice_number:        invoice.invoiceNumber || "APERÇU",
          status:                "draft",
          issue_date:            invoice.invoiceDate,
          due_date:              addDaysToDate(invoice.invoiceDate, parseInt(invoice.dueDate) || 30),
          subtotal, vat_amount, total,
          notes:                 invoice.notes || null,
          items:                 invoice.lineItems.map((i) => ({
            description: i.description, quantity: i.quantity,
            unit_price: i.unitPrice, vat_rate: i.vatRate,
          })),
          vat_scenario:          invoice.vatScenario ?? null,
          issuer_vat_scheme:     "normal",
          document_type:         docType,
          linked_invoice_number: null,
          structured_ref,
        },
        {
          company_name: profile.company_name ?? "",
          vat_number:   profile.vat_number ?? null,
          street:       profile.street ?? null,
          zip_code:     profile.zip_code ?? null,
          city:         profile.city ?? null,
          country_code: profile.country_code ?? "BE",
          email:        profile.email ?? null,
          iban:         profile.iban ?? null,
        },
        {
          name:         client?.name ?? invoice.clientName,
          company:      client?.company ?? null,
          email:        client?.email ?? invoice.clientEmail ?? null,
          street:       client?.street ?? null,
          zip_code:     client?.zip_code ?? null,
          city:         client?.city ?? null,
          country_code: client?.country_code ?? null,
          vat_number:   client?.vat_number ?? invoice.clientVat ?? null,
        },
      );
    } catch (err) {
      console.error("[InvoiceGenerator] handleDownloadPdf:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const config = DOC_CONFIG[docType];

  const isSaveBlocked =
    loading || numberLoading || !selectedClientId || saved || !fieValidation.isLegal;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-8">
          <div className="container mx-auto px-4">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-end gap-4 flex-1 min-w-0">

                {/* Type de document */}
                <ToggleGroup
                  type="single"
                  value={docType}
                  onValueChange={handleDocTypeChange}
                  className="border border-border/50 rounded-lg p-1 bg-card"
                >
                  <ToggleGroupItem value="invoice" className="text-sm px-3 py-1.5">
                    🧾 Facture
                  </ToggleGroupItem>
                  <ToggleGroupItem value="quote" className="text-sm px-3 py-1.5">
                    📋 Devis
                  </ToggleGroupItem>
                  <ToggleGroupItem value="order" className="text-sm px-3 py-1.5">
                    📦 Bon de commande
                  </ToggleGroupItem>
                </ToggleGroup>

                <div className="w-72">
                  <ClientSelect value={selectedClientId} onChange={handleClientChange} />
                </div>
                <div className="w-72">
                  <BusinessProfileSelect
                    value={selectedBusinessProfile?.id ?? null}
                    onChange={setSelectedBusinessProfile}
                  />
                </div>
              </div>

              {/* ── Zone actions + FIE ──────────────────────────────── */}
              <div className="flex flex-col items-end gap-3 shrink-0">

                {/* Boutons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading || numberLoading}
                    className="gap-2"
                  >
                    {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Télécharger PDF
                  </Button>

                  {/* Bouton Enregistrer — FIE bloquant */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={handleSaveDraft}
                          disabled={isSaveBlocked}
                          className={`gap-2 ${
                            !fieValidation.isLegal && selectedClientId
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20"
                              : ""
                          }`}
                        >
                          {loading || numberLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : !fieValidation.isLegal && selectedClientId ? (
                            <ShieldAlert className="h-4 w-4" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {loading
                            ? "Enregistrement..."
                            : numberLoading
                            ? "Génération du numéro..."
                            : saved
                            ? "Enregistré ✓"
                            : !fieValidation.isLegal && selectedClientId
                            ? `${fieValidation.errors.length} erreur${fieValidation.errors.length > 1 ? "s" : ""} à corriger`
                            : config.saveLabel}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!fieValidation.isLegal && selectedClientId && (
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs font-medium mb-1">Corrections requises :</p>
                        <ul className="text-xs space-y-0.5">
                          {fieValidation.errors.map((err, i) => (
                            <li key={i}>· {err.message}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>

                {/* Badge statut conformité */}
                {selectedClientId && (
                  <div className="flex items-center gap-1.5">
                    {fieValidation.isLegal ? (
                      <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 bg-green-500/5 gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Conforme
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/5 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {fieValidation.errors.length} point{fieValidation.errors.length > 1 ? "s" : ""} à corriger
                      </Badge>
                    )}
                  </div>
                )}

                {/* Checklist audit terminal — après première tentative */}
                <FIEChecklist
                  errors={fieValidation.errors}
                  isLegal={fieValidation.isLegal}
                  isVisible={showChecklist && !!selectedClientId}
                />
              </div>
            </div>

            {/* ── Grid form / preview ──────────────────────────────── */}
            <div className="grid gap-8 lg:grid-cols-2">
              <InvoiceForm
                invoice={invoice}
                onUpdate={updateInvoice}
                clientLocked={!!selectedClientId}
                docType={docType}
              />
              <div className="lg:sticky lg:top-24 lg:self-start">
                <InvoicePreview invoice={invoice} docType={docType} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default InvoiceGenerator;