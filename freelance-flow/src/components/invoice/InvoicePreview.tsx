import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Mail, Save, Loader2 } from "lucide-react";
import type { InvoiceData } from "@/types/invoice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { computeTotals } from "@/lib/invoiceCalculations";
import { generateInvoicePdf, generateInvoicePdfBlob } from "@/lib/pdf/generateInvoicePdf";
import { supabase } from "@/lib/supabase";

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailTo, setEmailTo] = useState(invoice.clientEmail ?? "");

  const calculations = computeTotals(invoice.lineItems);

  const computedDueDate = (() => {
    if (!invoice.invoiceDate) return null;
    const d = new Date(invoice.invoiceDate);
    d.setDate(d.getDate() + Number(invoice.dueDate ?? 30));
    return d.toISOString().split("T")[0];
  })();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-BE");
  };

  const dueDateDisplay = (() => {
    if (!invoice.invoiceDate) return "";
    const d = new Date(invoice.invoiceDate);
    d.setDate(d.getDate() + Number(invoice.dueDate ?? 30));
    return d.toLocaleDateString("fr-BE");
  })();

  // --- DÉBUT SECTION : handleDownload ---
  const handleDownload = async () => {
    if (!invoice.invoiceNumber) {
      toast.error("Numéro de facture manquant.");
      return;
    }
    if (!invoice.companyName) {
      toast.error("Nom de l'entreprise manquant.");
      return;
    }
    try {
      await generateInvoicePdf(
        {
          invoice_number: invoice.invoiceNumber,
          status: "draft",
          issue_date: invoice.invoiceDate ?? new Date().toISOString().split("T")[0],
          due_date: computedDueDate,
          subtotal: calculations.subtotal,
          vat_amount: calculations.vat_amount,
          total: calculations.total,
          notes: invoice.notes ?? null,
          items: invoice.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            vat_rate: item.vatRate,
          })),
        },
        {
          company_name: invoice.companyName,
          vat_number: invoice.companyVat ?? null,
          street: invoice.companyAddress ?? null,
          zip_code: null,
          city: null,
          country_code: "BE",
          email: invoice.companyEmail ?? null,
          iban: invoice.iban ?? null,
        },
        {
          name: invoice.clientName ?? "",
          company: null,
          email: invoice.clientEmail ?? null,
          street: invoice.clientAddress ?? null,
          zip_code: null,
          city: null,
          country_code: null,
          vat_number: invoice.clientVat ?? null,
        }
      );
      toast.success("PDF téléchargé avec succès.");
    } catch (err) {
      console.error("[InvoicePreview] handleDownload:", err);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };
  // --- FIN SECTION : handleDownload ---

  // --- DÉBUT SECTION : handleSendEmail ---
  const handleSendEmail = async () => {
    if (!emailTo || !emailTo.includes("@")) {
      toast.error("Adresse email invalide.");
      return;
    }
    if (!invoice.invoiceNumber) {
      toast.error("Numéro de facture manquant.");
      return;
    }
    if (!invoice.companyName) {
      toast.error("Nom de l'entreprise manquant.");
      return;
    }

    setEmailLoading(true);
    try {
      // 1. Générer le PDF en Blob
      const blob = await generateInvoicePdfBlob(
        {
          invoice_number: invoice.invoiceNumber,
          status: "draft",
          issue_date: invoice.invoiceDate ?? new Date().toISOString().split("T")[0],
          due_date: computedDueDate,
          subtotal: calculations.subtotal,
          vat_amount: calculations.vat_amount,
          total: calculations.total,
          notes: invoice.notes ?? null,
          items: invoice.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            vat_rate: item.vatRate,
          })),
        },
        {
          company_name: invoice.companyName,
          vat_number: invoice.companyVat ?? null,
          street: invoice.companyAddress ?? null,
          zip_code: null,
          city: null,
          country_code: "BE",
          email: invoice.companyEmail ?? null,
          iban: invoice.iban ?? null,
        },
        {
          name: invoice.clientName ?? "",
          company: null,
          email: invoice.clientEmail ?? null,
          street: invoice.clientAddress ?? null,
          zip_code: null,
          city: null,
          country_code: null,
          vat_number: invoice.clientVat ?? null,
        }
      );

      // 2. Convertir Blob → base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // retire le préfixe data:application/pdf;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 3. Appeler l'Edge Function via le client Supabase
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          to: emailTo,
          invoiceNumber: invoice.invoiceNumber,
          pdfBase64: base64,
          issuerName: invoice.companyName,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error("Échec de l'envoi");

      toast.success(`Email envoyé à ${emailTo}`);
    } catch (err) {
      console.error("[InvoicePreview] handleSendEmail:", err);
      toast.error("Erreur lors de l'envoi de l'email.");
    } finally {
      setEmailLoading(false);
    }
  };
  // --- FIN SECTION : handleSendEmail ---

  const handleSave = () => {
    toast.success("✓");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Button variant="hero" className="flex-1" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" /> {t("preview.download")}
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <Mail className="h-4 w-4 mr-2" /> {t("preview.sendEmail")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{t("preview.sendTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t("preview.recipient")}</Label>
                <Input
                  type="email"
                  placeholder="client@company.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("preview.subject")}</Label>
                <Input
                  readOnly
                  value={`Facture ${invoice.invoiceNumber} — ${invoice.companyName}`}
                />
              </div>
              <Button
                variant="hero"
                className="w-full"
                onClick={handleSendEmail}
                disabled={emailLoading}
              >
                {emailLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours...</>
                ) : (
                  t("preview.send")
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleSave}>
          <Save className="h-4 w-4" />
        </Button>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-glow">
        <div ref={previewRef} className="bg-white text-gray-900 p-8 min-h-[700px] text-sm">
          <div className="flex justify-between items-start mb-8">
            <div>
              {invoice.companyLogo ? (
                <img src={invoice.companyLogo} alt="Logo" className="h-12 mb-3 object-contain" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mb-3">
                  <span className="text-white font-bold text-lg">{invoice.companyName?.[0] || "I"}</span>
                </div>
              )}
              <h2 className="font-bold text-lg text-gray-900">{invoice.companyName || "Your Company"}</h2>
              <p className="text-gray-500 text-xs mt-1">{invoice.companyAddress}</p>
              {invoice.companyVat && (
                <p className="text-gray-500 text-xs">{t("preview.vat")}: {invoice.companyVat}</p>
              )}
              {invoice.companyEmail && (
                <p className="text-gray-500 text-xs">{invoice.companyEmail}</p>
              )}
            </div>
            <div className="text-right">
              <h1 className="font-bold text-2xl text-gray-900 mb-2">{t("preview.invoiceTitle")}</h1>
              <p className="text-gray-600 text-xs">
                <span className="font-medium">{invoice.invoiceNumber}</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {t("form.date")}: {formatDate(invoice.invoiceDate)}
              </p>
              <p className="text-gray-500 text-xs">
                {t("preview.paymentDetails")}: {dueDateDisplay}
              </p>
            </div>
          </div>

          <div className="mb-8 bg-gray-50 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">
              {t("preview.billTo")}
            </p>
            <p className="font-semibold text-gray-900">{invoice.clientName || "Client Name"}</p>
            <p className="text-gray-500 text-xs">{invoice.clientAddress}</p>
            {invoice.clientVat && (
              <p className="text-gray-500 text-xs">{t("preview.vat")}: {invoice.clientVat}</p>
            )}
            {invoice.clientEmail && (
              <p className="text-gray-500 text-xs">{invoice.clientEmail}</p>
            )}
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  {t("preview.description")}
                </th>
                <th className="text-center py-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  {t("preview.qty")}
                </th>
                <th className="text-right py-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  {t("preview.price")}
                </th>
                <th className="text-right py-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  {t("preview.vat")}
                </th>
                <th className="text-right py-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  {t("preview.total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, i) => {
                const lineTotal = item.quantity * item.unitPrice;
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 text-gray-800">{item.description || "—"}</td>
                    <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">€{item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 text-right text-gray-600">{item.vatRate}%</td>
                    <td className="py-3 text-right font-medium text-gray-900">€{lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>{t("preview.subtotal")}</span>
                <span>€{calculations.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t("preview.vatLabel")}</span>
                <span>€{calculations.vat_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-900 pt-2 text-lg font-bold text-gray-900">
                <span>{t("preview.totalLabel")}</span>
                <span>€{calculations.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {invoice.iban && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">
                {t("preview.paymentDetails")}
              </p>
              <p className="text-gray-700 text-xs">{t("preview.bankTransfer")}</p>
              <p className="text-gray-900 font-medium text-sm">IBAN: {invoice.iban}</p>
            </div>
          )}

          {invoice.notes && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                {t("preview.notes")}
              </p>
              <p className="text-gray-600 text-xs">{invoice.notes}</p>
            </div>
          )}

          <div className="text-center text-gray-300 text-[10px] mt-8 pt-4 border-t border-gray-100">
            Powered by InvoiceAI
          </div>
        </div>
      </Card>
    </div>
  );
}