// src/types/invoice.ts

import type { VatScenario } from "@/lib/vatScenario";

// ─── Document type ────────────────────────────────────────────────────────────
export type DocumentType = "invoice" | "quote" | "order";

export const DOC_CONFIG: Record<DocumentType, {
  prefix: string;
  title: string;
  saveLabel: string;
}> = {
  invoice: { prefix: "INV", title: "FACTURE",           saveLabel: "Enregistrer en brouillon" },
  quote:   { prefix: "DEV", title: "DEVIS",             saveLabel: "Enregistrer le devis"     },
  order:   { prefix: "BC",  title: "BON DE COMMANDE",   saveLabel: "Enregistrer le BC"        },
};

// ─── Line item ────────────────────────────────────────────────────────────────
export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

// ─── Invoice data ─────────────────────────────────────────────────────────────
export interface InvoiceData {
  companyName: string;
  companyAddress: string;
  companyVat: string;
  companyEmail: string;
  companyLogo: string | null;
  // Pays de l'émetteur — alimente le VatScenarioSelector
  companyCountryCode: string;
  clientName: string;
  clientAddress: string;
  clientVat: string;
  clientEmail: string;
  invoiceNumber: string;
  invoiceDate: string;
  // Date de prestation si différente de la date d'émission (obligation légale BE/FR)
  serviceDate: string | null;
  dueDate: string;
  lineItems: LineItem[];
  notes: string;
  paymentMethod: string;
  iban: string;
  // Scénario TVA — détermine les mentions légales sur le PDF
  vatScenario: VatScenario | null;
  // Type de document (Lovable)
  documentType: DocumentType;
  // Champs devis
  validityDays: number;
  validUntil: string;
  // Champs bon de commande
  clientReference: string;
}