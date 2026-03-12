import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { InvoiceDocument } from "@/components/pdf/InvoiceDocument";
import type {
  PdfInvoice,
  PdfBusinessProfile,
  PdfClient,
} from "@/components/pdf/InvoiceDocument";

// Re-export types for convenience
export type { PdfInvoice, PdfBusinessProfile, PdfClient };

/**
 * Génère un PDF de facture et déclenche le téléchargement dans le navigateur.
 */
export async function generateInvoicePdf(
  invoice: PdfInvoice,
  issuer: PdfBusinessProfile,
  client: PdfClient
): Promise<void> {
  const pdfElement = createElement(InvoiceDocument, {
    invoice,
    issuer,
    client,
  });

  const blob = await pdf(pdfElement as any).toBlob();

  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");

  link.href = url;
  link.download = `${invoice.invoice_number}.pdf`;

  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Génère un PDF de facture et retourne directement le Blob.
 * Utile pour un upload futur vers Supabase Storage.
 */
export async function generateInvoicePdfBlob(
  invoice: PdfInvoice,
  issuer: PdfBusinessProfile,
  client: PdfClient
): Promise<Blob> {
  const pdfElement = createElement(InvoiceDocument, {
    invoice,
    issuer,
    client,
  });

  return pdf(pdfElement as any).toBlob();
}