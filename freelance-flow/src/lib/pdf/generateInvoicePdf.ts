// src/lib/pdf/generateInvoicePdf.ts

import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { InvoiceDocument } from "@/components/pdf/InvoiceDocument";
import type {
  PdfInvoice,
  PdfBusinessProfile,
  PdfClient,
} from "@/components/pdf/InvoiceDocument";
import type { VatScenario } from "@/lib/vatScenario";

export type { PdfInvoice, PdfBusinessProfile, PdfClient };

// ─────────────────────────────────────────────────────────────────────────────
// Builder — construit un PdfInvoice depuis une DB row Supabase
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceDbRow {
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  service_date?: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  vat_scenario?: string | null;
  issuer_vat_scheme?: string | null;
  document_type?: string | null;
  linked_invoice_number?: string | null;
  // --- AJOUT ---
  structured_ref?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }>;
}

export function buildPdfInvoice(row: InvoiceDbRow): PdfInvoice {
  const VALID_VAT_SCHEMES = ["normal", "franchise", "micro_fr", "exempt_art44"] as const;
  const VALID_DOC_TYPES   = ["invoice", "credit_note", "quote"] as const;

  return {
    invoice_number:        row.invoice_number,
    status:                row.status,
    issue_date:            row.issue_date,
    due_date:              row.due_date ?? null,
    service_date:          row.service_date ?? null,
    subtotal:              row.subtotal,
    vat_amount:            row.vat_amount,
    total:                 row.total,
    notes:                 row.notes ?? null,
    items:                 row.items ?? [],
    vat_scenario:          (row.vat_scenario as VatScenario) ?? null,
    issuer_vat_scheme:     VALID_VAT_SCHEMES.includes(row.issuer_vat_scheme as typeof VALID_VAT_SCHEMES[number])
                             ? (row.issuer_vat_scheme as PdfInvoice["issuer_vat_scheme"])
                             : "normal",
    document_type:         VALID_DOC_TYPES.includes(row.document_type as typeof VALID_DOC_TYPES[number])
                             ? (row.document_type as PdfInvoice["document_type"])
                             : "invoice",
    linked_invoice_number: row.linked_invoice_number ?? null,
    // --- AJOUT : référence structurée belge ---
    structured_ref:        row.structured_ref ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation défensive
// ─────────────────────────────────────────────────────────────────────────────

function validateInputs(
  invoice: PdfInvoice,
  issuer: PdfBusinessProfile,
  client: PdfClient,
): void {
  if (!invoice.invoice_number) {
    throw new Error("generateInvoicePdf: invoice_number manquant");
  }
  if (!issuer.company_name) {
    throw new Error("generateInvoicePdf: issuer.company_name manquant");
  }
  if (!issuer.country_code) {
    throw new Error("generateInvoicePdf: issuer.country_code manquant — requis pour le resolver TVA");
  }
  if (!invoice.items || invoice.items.length === 0) {
    throw new Error("generateInvoicePdf: aucune ligne de facturation (items vide)");
  }
  if (
    invoice.document_type === "credit_note" &&
    issuer.country_code === "BE" &&
    !invoice.linked_invoice_number
  ) {
    console.warn(
      "[generateInvoicePdf] Note de crédit BE sans linked_invoice_number — mention AR n°1 art. 54 incomplète",
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — téléchargement navigateur
// ─────────────────────────────────────────────────────────────────────────────

export async function generateInvoicePdf(
  invoice: PdfInvoice,
  issuer: PdfBusinessProfile,
  client: PdfClient,
): Promise<void> {
  validateInputs(invoice, issuer, client);

  const element = createElement(InvoiceDocument, { invoice, issuer, client });

  let blob: Blob;
  try {
    blob = await pdf(element as any).toBlob();
  } catch (err) {
    console.error("[generateInvoicePdf] Erreur rendu PDF :", err);
    throw err;
  }

  const filename = invoice.document_type === "credit_note"
    ? `NC-${invoice.invoice_number}.pdf`
    : `${invoice.invoice_number}.pdf`;

  const url  = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href     = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — Blob (upload Supabase Storage / envoi email Resend)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateInvoicePdfBlob(
  invoice: PdfInvoice,
  issuer: PdfBusinessProfile,
  client: PdfClient,
): Promise<Blob> {
  validateInputs(invoice, issuer, client);

  const element = createElement(InvoiceDocument, { invoice, issuer, client });
  try {
    return await pdf(element as any).toBlob();
  } catch (err) {
    console.error("[generateInvoicePdfBlob] Erreur rendu PDF :", err);
    throw err;
  }
}