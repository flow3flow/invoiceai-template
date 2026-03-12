import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { ClientSelect } from "@/components/invoice/ClientSelect";
import { Button } from "@/components/ui/button";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { toast } from "sonner";
import type { InvoiceData } from "@/types/invoice";
import { Save } from "lucide-react";

// ─── Helper ───────────────────────────────────────────────────────────────────

function addDaysToDate(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Default state ────────────────────────────────────────────────────────────

const defaultInvoice: InvoiceData = {
  companyName: "",
  companyAddress: "",
  companyVat: "",
  companyEmail: "",
  companyLogo: null,
  clientName: "",
  clientAddress: "",
  clientVat: "",
  clientEmail: "",
  invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
  invoiceDate: new Date().toISOString().split("T")[0],
  dueDate: "30",
  lineItems: [{ description: "", quantity: 1, unitPrice: 0, vatRate: 21 }],
  notes: "",
  paymentMethod: "bank",
  iban: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const InvoiceGenerator = () => {
  const [invoice, setInvoice] = useState<InvoiceData>(defaultInvoice);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const navigate = useNavigate();
  const { createInvoice, loading } = useInvoices();
  const { clients } = useClients(); // Pour auto-fill — même source que ClientSelect

  const updateInvoice = useCallback((updates: Partial<InvoiceData>) => {
    setInvoice((prev) => ({ ...prev, ...updates }));
  }, []);

  // B. Auto-fill des champs client depuis la sélection
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      updateInvoice({
        clientName:    client.name,
        clientAddress: [client.street, client.zip_code, client.city, client.country_code]
          .filter(Boolean)
          .join(", "),
        clientVat:   client.vat_number ?? "",
        clientEmail: client.email ?? "",
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedClientId) return;

    // C. Validation minimale des lignes
    const invalidItems = invoice.lineItems.filter(
      (item) =>
        !item.description.trim() ||
        item.quantity <= 0 ||
        item.unitPrice < 0 ||
        item.vatRate < 0
    );
    if (invalidItems.length > 0) {
      toast.error("Vérifiez vos lignes : description vide, quantité ou prix invalide");
      return;
    }

    if (!invoice.invoiceNumber.trim()) {
      toast.error("Le numéro de facture est requis");
      return;
    }

    const dueDays = parseInt(invoice.dueDate, 10);
    const due_date = !isNaN(dueDays)
      ? addDaysToDate(invoice.invoiceDate, dueDays)
      : null;

    const result = await createInvoice({
      client_id:      selectedClientId,
      invoice_number: invoice.invoiceNumber,
      issue_date:     invoice.invoiceDate,
      due_date,
      notes:          invoice.notes || null,
      items: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unitPrice,
        vat_rate:    item.vatRate,
      })),
    });

    // D. Post-save : bloquer double soumission + redirect
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

          <div className="flex items-end justify-between gap-4 mb-6">
            <div className="w-72">
              <ClientSelect
                value={selectedClientId}
                onChange={handleClientChange}
              />
            </div>
            <Button
              onClick={handleSaveDraft}
              disabled={loading || !selectedClientId || saved}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Enregistrement..." : saved ? "Enregistré ✓" : "Enregistrer en brouillon"}
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <InvoiceForm invoice={invoice} onUpdate={updateInvoice} clientLocked={!!selectedClientId} />
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