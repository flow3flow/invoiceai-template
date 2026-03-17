import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { InvoiceDocument } from "@/components/pdf/InvoiceDocument";
import type {
  PdfInvoice,
  PdfBusinessProfile,
  PdfClient,
} from "@/components/pdf/InvoiceDocument";

export type { PdfInvoice, PdfBusinessProfile, PdfClient };

/**
 * Génère un PDF de facture et déclenche le téléchargement dans le navigateur.
 */
export async function generateInvoicePdf(
  invoice: PdfInvoice,
  issuer: PdfBusinessProfile,
  client: PdfClient
): Promise<void> {
  if (!invoice.invoice_number) {
    throw new Error("generateInvoicePdf: invoice_number manquant");
  }
  if (!issuer.company_name) {
    throw new Error("generateInvoicePdf: issuer.company_name manquant");
  }

  const element = createElement(InvoiceDocument, { invoice, issuer, client });

  let blob: Blob;
  try {
    blob = await pdf(element as any).toBlob();
  } catch (err) {
    console.error("[generateInvoicePdf] Erreur rendu PDF :", err);
    throw err;
  }

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
 * Génère un PDF et retourne le Blob.
 * Utilisé pour upload vers Supabase Storage.
 */
export async function generateInvoicePdfBlob(
  invoice: PdfInvoice,
  issuer: PdfBusinessProfile,
  client: PdfClient
): Promise<Blob> {
  const element = createElement(InvoiceDocument, { invoice, issuer, client });
  try {
    return await pdf(element as any).toBlob();
  } catch (err) {
    console.error("[generateInvoicePdfBlob] Erreur rendu PDF :", err);
    throw err;
  }
}