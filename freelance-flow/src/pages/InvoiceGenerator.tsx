import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { ClientSelect } from "@/components/invoice/ClientSelect";
import { BusinessProfileSelect } from "@/components/invoice/BusinessProfileSelect";
import { Button } from "@/components/ui/button";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useBusinessProfiles } from "@/hooks/useBusinessProfiles";
import { toast } from "sonner";
import type { InvoiceData } from "@/types/invoice";
import type { BusinessProfile } from "@/hooks/useBusinessProfiles";
import { Save } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
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
// État initial
// ─────────────────────────────────────────────────────────────────────────────

const defaultInvoice: InvoiceData = {
  companyName: "",
  companyAddress: "",
  companyVat: "",
  companyEmail: "",
  companyLogo: null,
  companyCountryCode: "BE",            // ← défaut freelance belge
  clientName: "",
  clientAddress: "",
  clientVat: "",
  clientEmail: "",
  invoiceNumber: "",                   // ← séquence DB, pas de random
  invoiceDate: new Date().toISOString().split("T")[0],
  serviceDate: null,                   // ← date de prestation (obligation légale)
  dueDate: "30",
  lineItems: [{ description: "", quantity: 1, unitPrice: 0, vatRate: 21 }],
  notes: "",
  paymentMethod: "bank",
  iban: "",
  vatScenario: "BE_STANDARD_21",       // ← scénario TVA par défaut
};

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

const InvoiceGenerator = () => {
  const [invoice, setInvoice] = useState<InvoiceData>(defaultInvoice);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBusinessProfile, setSelectedBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [numberLoading, setNumberLoading] = useState(true);

  const navigate = useNavigate();
  const { createInvoice, getNextInvoiceNumber, loading } = useInvoices();
  const { clients } = useClients();
  const { defaultProfile } = useBusinessProfiles();

  const updateInvoice = useCallback((updates: Partial<InvoiceData>) => {
    setInvoice((prev) => ({ ...prev, ...updates }));
  }, []);

  // --- DÉBUT SECTION : numéro séquentiel depuis la DB au montage ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNumberLoading(true);
      try {
        const number = await getNextInvoiceNumber();
        if (!cancelled) updateInvoice({ invoiceNumber: number });
      } catch (err) {
        console.error("[InvoiceGenerator] getNextInvoiceNumber:", err);
        toast.error("Impossible de générer le numéro de facture. Rechargez la page.");
      } finally {
        if (!cancelled) setNumberLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // --- FIN SECTION : numéro séquentiel ---

  // --- DÉBUT SECTION : pré-remplissage profil entreprise ---
  // Synchronise les champs émetteur ET le pays (nécessaire pour VatScenarioSelector)
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
      // Reset le scénario TVA au changement de profil pour éviter
      // un scénario BE sélectionné sur un profil FR et vice-versa
      vatScenario: profile.country_code === "FR" ? "FR_STANDARD_20" : "BE_STANDARD_21",
    });
  }, [selectedBusinessProfile, defaultProfile, updateInvoice]);
  // --- FIN SECTION : pré-remplissage profil entreprise ---

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      updateInvoice({
        clientName: client.name,
        clientAddress: [client.street, client.zip_code, client.city, client.country_code]
          .filter(Boolean)
          .join(", "),
        clientVat:   client.vat_number ?? "",
        clientEmail: client.email ?? "",
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedClientId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    const profile = selectedBusinessProfile ?? defaultProfile;
    if (!profile) {
      toast.error("Veuillez créer un profil entreprise par défaut dans Paramètres");
      return;
    }

    if (numberLoading || !invoice.invoiceNumber.trim()) {
      toast.error("Numéro de facture en cours de génération, patientez.");
      return;
    }

    if (!invoice.vatScenario) {
      toast.error("Veuillez sélectionner un régime TVA");
      return;
    }

    const invalidItems = invoice.lineItems.filter(
      (item) =>
        !item.description.trim() ||
        item.quantity <= 0 ||
        item.unitPrice < 0 ||
        item.vatRate < 0,
    );
    if (invalidItems.length > 0) {
      toast.error("Vérifiez vos lignes : description vide, quantité ou prix invalide");
      return;
    }

    const dueDays = parseInt(invoice.dueDate, 10);
    const due_date = !isNaN(dueDays)
      ? addDaysToDate(invoice.invoiceDate, dueDays)
      : null;

    // --- DÉBUT SECTION : snapshot émetteur immuable ---
    // Capture l'état du profil AU MOMENT de la sauvegarde.
    // Obligation légale BE/FR — ne jamais modifier après émission.
    const issuer_snapshot = {
      issuer_company_name:  profile.company_name ?? "",
      issuer_vat_number:    profile.vat_number ?? null,
      issuer_street:        profile.street ?? null,
      issuer_zip_code:      profile.zip_code ?? null,
      issuer_city:          profile.city ?? null,
      issuer_country_code:  profile.country_code ?? null,
      issuer_email:         profile.email ?? null,
      issuer_iban:          profile.iban ?? null,
      issuer_logo_path:     profile.logo_path ?? null,
    };
    // --- FIN SECTION : snapshot émetteur immuable ---

    const result = await createInvoice({
      client_id:           selectedClientId,
      business_profile_id: profile.id,
      invoice_number:      invoice.invoiceNumber,
      issue_date:          invoice.invoiceDate,
      due_date,
      notes:               invoice.notes || null,
      // --- DÉBUT SECTION : nouveaux champs TVA ---
      vat_scenario:        invoice.vatScenario,
      issuer_vat_scheme:   "normal",          // ← à exposer via profil si franchise
      service_date:        invoice.serviceDate ?? null,
      document_type:       "invoice",
      // --- FIN SECTION : nouveaux champs TVA ---
      items: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unitPrice,
        vat_rate:    item.vatRate,
      })),
      issuer_snapshot,
    });

    if (result) {
      setSaved(true);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-end gap-4 flex-1 min-w-0">
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

            <Button
              onClick={handleSaveDraft}
              disabled={loading || numberLoading || !selectedClientId || saved}
              className="gap-2 shrink-0"
            >
              <Save className="h-4 w-4" />
              {loading
                ? "Enregistrement..."
                : numberLoading
                ? "Génération du numéro..."
                : saved
                ? "Enregistré ✓"
                : "Enregistrer en brouillon"}
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <InvoiceForm
              invoice={invoice}
              onUpdate={updateInvoice}
              clientLocked={!!selectedClientId}
            />
            <div className="lg:sticky lg:top-24 lg:self-start">
              <InvoicePreview invoice={invoice} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;