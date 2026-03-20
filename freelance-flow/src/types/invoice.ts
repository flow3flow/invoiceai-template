// src/types/invoice.ts

import type { VatScenario } from "@/lib/vatScenario";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

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
}