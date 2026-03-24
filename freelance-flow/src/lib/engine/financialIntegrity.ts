// src/lib/engine/financialIntegrity.ts
// Financial Integrity Engine — InvoiceAI
// Principe : l'IA propose, ce moteur valide. Jamais de float natif.

import Decimal from 'decimal.js';

// ── Config Decimal ────────────────────────────────────────────────────────────
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  unit_price: number | string;
  quantity:   number | string;
}

export interface InvoiceToValidate {
  issuer_vat_number: string | null;
  issuer_iban:       string | null;
  client_vat_number: string | null;
  client_address:    string | null;
  client_is_company: boolean;
  total_ht:          number | string;
  items:             InvoiceItem[];
}

export type ErrorCode = 'LEGAL_MISSING' | 'MATH_ERROR' | 'VAT_INVALID';

export interface ValidationError {
  code:    ErrorCode;
  message: string;
}

export interface ValidationResult {
  isLegal: boolean;
  errors:  ValidationError[];
}

// ── Whitelist TVA légale BE/FR ────────────────────────────────────────────────
const VAT_WHITELIST_BE = [0, 0.06, 0.12, 0.21];
const VAT_WHITELIST_FR = [0, 0.055, 0.10, 0.20];

export function isVatRateValid(rate: number, countryCode: 'BE' | 'FR'): boolean {
  const whitelist = countryCode === 'BE' ? VAT_WHITELIST_BE : VAT_WHITELIST_FR;
  return whitelist.some((r) => new Decimal(r).equals(new Decimal(rate)));
}

// ── Engine principal ──────────────────────────────────────────────────────────

export function validateLegalMentions(invoice: InvoiceToValidate): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Émetteur — TVA
  const vat = invoice.issuer_vat_number ?? '';
  const vatValid = vat.startsWith('BE') || vat.startsWith('FR');
  if (!vatValid) {
    errors.push({
      code:    'VAT_INVALID',
      message: 'N° TVA émetteur invalide — attendu : BE + 10 chiffres ou FR + 2 car. + 9 chiffres',
    });
  }

  // 2. Émetteur — IBAN
  if (!invoice.issuer_iban) {
    errors.push({
      code:    'LEGAL_MISSING',
      message: 'IBAN émetteur manquant (mention légale obligatoire)',
    });
  }

  // 3. Client — TVA obligatoire uniquement B2B
  if (invoice.client_is_company && !invoice.client_vat_number) {
    errors.push({
      code:    'LEGAL_MISSING',
      message: 'N° TVA client manquant (obligatoire pour les entreprises B2B)',
    });
  }

  // 4. Client — adresse
  if (!invoice.client_address?.trim()) {
    errors.push({
      code:    'LEGAL_MISSING',
      message: 'Adresse client manquante',
    });
  }

  // 5. Intégrité financière — recalcul déterministe
  try {
    const calculatedHT = invoice.items.reduce(
      (acc, item) =>
        acc.plus(new Decimal(item.unit_price).times(new Decimal(item.quantity))),
      new Decimal(0)
    );

    if (!calculatedHT.equals(new Decimal(invoice.total_ht))) {
      errors.push({
        code:    'MATH_ERROR',
        message: `Écart financier : calculé ${calculatedHT.toFixed(2)} € ≠ stocké ${new Decimal(invoice.total_ht).toFixed(2)} €`,
      });
    }
  } catch {
    errors.push({
      code:    'MATH_ERROR',
      message: 'Impossible de valider les montants — données numériques invalides',
    });
  }

  return { isLegal: errors.length === 0, errors };
}