import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { ClientSelect } from "@/components/invoice/ClientSelect";
import { Button } from "@/components/ui/button";
import { useInvoices } from "@/hooks/useInvoices";
import type { InvoiceData } from "@/types/invoice";
import { Save } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convertit une date ISO + un nombre de jours en date ISO d'échéance */
function addDaysToDate(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Default state (inchangé) ─────────────────────────────────────────────────

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

  const { createInvoice, loading } = useInvoices();

  const updateInvoice = useCallback((updates: Partial<InvoiceData>) => {
    setInvoice((prev) => ({ ...prev, ...updates }));
  }, []);

  // Mapping InvoiceData → CreateInvoiceInput
  const handleSaveDraft = async () => {
    if (!selectedClientId) return;

    const dueDays = parseInt(invoice.dueDate, 10);
    const due_date = !isNaN(dueDays)
      ? addDaysToDate(invoice.invoiceDate, dueDays)
      : null;

    await createInvoice({
      client_id:      selectedClientId,
      invoice_number: invoice.invoiceNumber,
      issue_date:     invoice.invoiceDate,
      due_date,
      notes:          invoice.notes || null,
      items: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unitPrice,  // camelCase → snake_case
        vat_rate:    item.vatRate,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">

          {/* Barre d'actions — ajout minimal au-dessus du grid */}
          <div className="flex items-end justify-between gap-4 mb-6">
            <div className="w-72">
              <ClientSelect
                value={selectedClientId}
                onChange={setSelectedClientId}
              />
            </div>
            <Button
              onClick={handleSaveDraft}
              disabled={loading || !selectedClientId}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Enregistrement..." : "Enregistrer en brouillon"}
            </Button>
          </div>

          {/* Grid existant — inchangé */}
          <div className="grid gap-8 lg:grid-cols-2">
            <InvoiceForm invoice={invoice} onUpdate={updateInvoice} />
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