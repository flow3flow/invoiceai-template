// src/lib/invoiceCalculations.ts
// ✅ Decimal.js — zéro float natif sur les montants financiers (Règle 2 doctrine)
// ✅ Arrondi ROUND_HALF_UP conforme aux normes comptables BE/FR
// ✅ Source unique de calcul — utilisé par InvoicePreview et useInvoices

import Decimal from 'decimal.js';

// Précision comptable : 20 chiffres significatifs, arrondi demi-supérieur légal
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface InvoiceTotals {
  subtotal:   number;
  vat_amount: number;
  total:      number;
}

/**
 * Source unique de calcul des totaux de facture.
 * Utilise Decimal.js pour éviter les erreurs d'arrondi float natif JS.
 *
 * Exemple du problème résolu :
 *   float natif : 0.1 + 0.2 = 0.30000000000000004  ← illégal sur facture fiscale
 *   Decimal.js  : 0.1 + 0.2 = 0.30                  ← correct
 *
 * Utilisé par InvoicePreview (affichage) et useInvoices (persistance).
 * Ne jamais dupliquer cette logique ailleurs — toujours importer cette fonction.
 */
export function computeTotals(
  items: Array<{ quantity: number; unitPrice: number; vatRate: number }>
): InvoiceTotals {
  let subtotal  = new Decimal(0);
  let vatAmount = new Decimal(0);

  for (const item of items) {
    const qty      = new Decimal(item.quantity);
    const price    = new Decimal(item.unitPrice);
    const vatRate  = new Decimal(item.vatRate).div(100);

    const lineHT   = qty.mul(price);
    const lineVat  = lineHT.mul(vatRate);

    subtotal  = subtotal.add(lineHT);
    vatAmount = vatAmount.add(lineVat);
  }

  // Arrondi final à 2 décimales — ROUND_HALF_UP (norme comptable)
  const subtotalRounded  = subtotal.toDecimalPlaces(2);
  const vatAmountRounded = vatAmount.toDecimalPlaces(2);
  const totalRounded     = subtotalRounded.add(vatAmountRounded).toDecimalPlaces(2);

  return {
    subtotal:   subtotalRounded.toNumber(),
    vat_amount: vatAmountRounded.toNumber(),
    total:      totalRounded.toNumber(),
  };
}

/**
 * Calcul du total d'une ligne individuelle.
 * Utile pour l'affichage en temps réel dans InvoiceForm.
 */
export function computeLineTotal(
  quantity: number,
  unitPrice: number,
  vatRate: number
): { lineHT: number; lineVat: number; lineTTC: number } {
  const qty     = new Decimal(quantity);
  const price   = new Decimal(unitPrice);
  const rate    = new Decimal(vatRate).div(100);

  const lineHT  = qty.mul(price).toDecimalPlaces(2);
  const lineVat = lineHT.mul(rate).toDecimalPlaces(2);
  const lineTTC = lineHT.add(lineVat).toDecimalPlaces(2);

  return {
    lineHT:  lineHT.toNumber(),
    lineVat: lineVat.toNumber(),
    lineTTC: lineTTC.toNumber(),
  };
}