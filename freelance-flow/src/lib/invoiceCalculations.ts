import type { LineItem } from '@/types/invoice';

export interface InvoiceTotals {
  subtotal: number;
  vat_amount: number;
  total: number;
}

/**
 * Source unique de calcul des totaux.
 * Utilisé par InvoicePreview (affichage) et useInvoices (persistance).
 */
export function computeTotals(
  items: Array<{ quantity: number; unitPrice: number; vatRate: number }>
): InvoiceTotals {
  let subtotal = 0;
  let vatAmount = 0;
  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    subtotal += line;
    vatAmount += line * (item.vatRate / 100);
  }
  return {
    subtotal:   Math.round(subtotal * 100) / 100,
    vat_amount: Math.round(vatAmount * 100) / 100,
    total:      Math.round((subtotal + vatAmount) * 100) / 100,
  };
}