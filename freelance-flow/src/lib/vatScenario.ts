// src/lib/vatScenario.ts
// Moteur de scénarios TVA — InvoiceAI
// Base légale : AR n°1 art. 53-54 (BE) | CGI art. 289 + 242 nonies A (FR)
// ⚠️  Ne jamais modifier les mentions légales sans valider avec un comptable agréé.

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CountryCode = 'BE' | 'FR';

export type VatScenario =
  // ── BELGIQUE ─────────────────────────────
  | 'BE_STANDARD_21'
  | 'BE_REDUCED_6'
  | 'BE_REDUCED_12'
  | 'BE_INTRACOM_GOODS'
  | 'BE_INTRACOM_SERVICES'
  | 'BE_REVERSE_CHARGE_LOCAL'
  | 'BE_FRANCHISE'
  | 'BE_EXEMPT_ART44'
  // ── FRANCE ───────────────────────────────
  | 'FR_STANDARD_20'
  | 'FR_REDUCED_10'
  | 'FR_REDUCED_55'
  | 'FR_INTRACOM'
  | 'FR_REVERSE_CHARGE'
  | 'FR_MICRO_FRANCHISE';

export interface VatScenarioResult {
  scenario: VatScenario;
  vatRate: number;
  vatAmount: number;
  totalHT: number;
  totalTTC: number;
  legalMention: string | null;
  legalRef: string | null;
  vatDueByCustomer: boolean;
  isOutOfScope: boolean;
  warningMessage: string | null;
  ublTaxExemptionCode: string | null;
  ublTaxExemptionReason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MENTIONS LÉGALES EXACTES
// Source : AR n°1 art. 53 §§3-4, art. 54 (BE) | BOFiP TVA-DECLA-10-10-20 (FR)
// ─────────────────────────────────────────────────────────────────────────────

const LEGAL_MENTIONS: Record<VatScenario, {
  mention: string | null;
  ref: string | null;
  ublCode: string | null;
  ublReason: string | null;
}> = {
  // ── BELGIQUE
  BE_STANDARD_21: {
    mention: null,
    ref: 'Art. 53 AR n°1',
    ublCode: 'S',
    ublReason: 'Standard rate',
  },
  BE_REDUCED_6: {
    mention: null,
    ref: 'Art. 53 AR n°1 — Taux réduit 6%',
    ublCode: 'AA',
    ublReason: 'Lower rate',
  },
  BE_REDUCED_12: {
    mention: null,
    ref: 'Art. 53 AR n°1 — Taux réduit 12%',
    ublCode: 'AA',
    ublReason: 'Lower rate',
  },
  BE_INTRACOM_GOODS: {
    // AR n°1, art. 53 §3
    mention: 'Autoliquidation TVA – Article 39bis du Code de la TVA',
    ref: 'Art. 39bis CTVA | AR n°1 art. 53 §3',
    ublCode: 'K',
    ublReason: 'Intra-Community supply',
  },
  BE_INTRACOM_SERVICES: {
    // AR n°1, art. 53 §4
    mention: 'Autoliquidation de la TVA : Art. 21 § 2 du Code belge de la TVA',
    ref: 'Art. 21 §2 CTVA | Art. 196 Directive 2006/112/CE | AR n°1 art. 53 §4',
    ublCode: 'K',
    ublReason: 'Intra-Community services — reverse charge',
  },
  BE_REVERSE_CHARGE_LOCAL: {
    mention: 'Autoliquidation - Art. 20 de l\'AR n°1',
    ref: 'Art. 20 AR n°1 | Art. 51 §2 5° CTVA',
    ublCode: 'AE',
    ublReason: 'Reverse charge — domestic',
  },
  BE_FRANCHISE: {
    // Art. 56bis CTVA
    mention: 'Régime particulier de franchise des petites entreprises – TVA non applicable',
    ref: 'Art. 56bis du Code de la TVA',
    ublCode: 'E',
    ublReason: 'Exempt — small enterprise scheme',
  },
  BE_EXEMPT_ART44: {
    // Art. 44 CTVA — médical, éducation, associations, services sociaux, etc.
    mention: 'Opération exonérée de TVA – Art. 44 du Code de la TVA',
    ref: 'Art. 44 CTVA',
    ublCode: 'E',
    ublReason: 'Exempt — Article 44 CTVA',
  },

  // ── FRANCE
  FR_STANDARD_20: {
    mention: null,
    ref: 'Art. 289 CGI | Art. 242 nonies A annexe II CGI',
    ublCode: 'S',
    ublReason: 'Standard rate',
  },
  FR_REDUCED_10: {
    mention: null,
    ref: 'Art. 289 CGI — Taux réduit 10%',
    ublCode: 'AA',
    ublReason: 'Lower rate',
  },
  FR_REDUCED_55: {
    mention: null,
    ref: 'Art. 289 CGI — Taux réduit 5,5%',
    ublCode: 'AA',
    ublReason: 'Lower rate',
  },
  FR_INTRACOM: {
    mention: 'Autoliquidation',
    ref: 'Art. 283-2 CGI | Art. 196 Directive 2006/112/CE',
    ublCode: 'K',
    ublReason: 'Intra-Community — reverse charge',
  },
  FR_REVERSE_CHARGE: {
    mention: 'Autoliquidation',
    ref: 'Art. 283-2 CGI',
    ublCode: 'AE',
    ublReason: 'Reverse charge — domestic',
  },
  FR_MICRO_FRANCHISE: {
    mention: 'TVA non applicable, art. 293 B du CGI',
    ref: 'Art. 293 B du CGI',
    ublCode: 'E',
    ublReason: 'Exempt — micro-enterprise franchise',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TAUX TVA PAR SCÉNARIO
// ─────────────────────────────────────────────────────────────────────────────

const VAT_RATES: Record<VatScenario, number> = {
  BE_STANDARD_21:          0.21,
  BE_REDUCED_6:            0.06,
  BE_REDUCED_12:           0.12,
  BE_INTRACOM_GOODS:       0.00,
  BE_INTRACOM_SERVICES:    0.00,
  BE_REVERSE_CHARGE_LOCAL: 0.00,
  BE_FRANCHISE:            0.00,
  BE_EXEMPT_ART44:         0.00,
  FR_STANDARD_20:          0.20,
  FR_REDUCED_10:           0.10,
  FR_REDUCED_55:           0.055,
  FR_INTRACOM:             0.00,
  FR_REVERSE_CHARGE:       0.00,
  FR_MICRO_FRANCHISE:      0.00,
};

// --- CORRECTION : BE_EXEMPT_ART44 retiré des out of scope ---
// Art. 44 est une exonération légale courante (médical, éducation, social)
// Ce n'est PAS un taux hors périmètre — c'est une mention obligatoire V1
const OUT_OF_SCOPE_SCENARIOS = new Set<VatScenario>([
  'BE_REDUCED_6',
  'BE_REDUCED_12',
  // 'BE_EXEMPT_ART44' ← retiré — exonération légale standard, pas hors périmètre
  'FR_REDUCED_10',
  'FR_REDUCED_55',
]);

// Scénarios autoliquidation — TVA due par le client, ne pas collecter
const VAT_DUE_BY_CUSTOMER = new Set<VatScenario>([
  'BE_INTRACOM_GOODS',
  'BE_INTRACOM_SERVICES',
  'BE_REVERSE_CHARGE_LOCAL',
  'FR_INTRACOM',
  'FR_REVERSE_CHARGE',
]);

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function legalMentionsResolver(
  scenario: VatScenario,
  amountHT: number,
): VatScenarioResult {
  const vatRate = VAT_RATES[scenario];
  const meta = LEGAL_MENTIONS[scenario];
  const isOutOfScope = OUT_OF_SCOPE_SCENARIOS.has(scenario);
  const vatDueByCustomer = VAT_DUE_BY_CUSTOMER.has(scenario);

  const vatAmount = round2(amountHT * vatRate);
  const totalHT = round2(amountHT);
  const totalTTC = vatDueByCustomer ? totalHT : round2(totalHT + vatAmount);

  return {
    scenario,
    vatRate,
    vatAmount,
    totalHT,
    totalTTC,
    legalMention: meta.mention,
    legalRef: meta.ref,
    vatDueByCustomer,
    isOutOfScope,
    warningMessage: isOutOfScope
      ? `Ce taux de TVA (${scenario}) est hors périmètre V1 d'InvoiceAI. Vérifiez avec votre comptable avant validation.`
      : null,
    ublTaxExemptionCode: meta.ublCode,
    ublTaxExemptionReason: meta.ublReason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUALIFICATEUR
// ─────────────────────────────────────────────────────────────────────────────

export interface QualificationInput {
  sellerCountry: CountryCode;
  sellerVatScheme: 'normal' | 'franchise' | 'micro_fr' | 'exempt_art44';
  buyerCountry: string;
  buyerIsVatLiable: boolean;
  supplyType: 'goods' | 'services';
  manualScenarioOverride?: VatScenario;
}

export function qualifyVatScenario(input: QualificationInput): VatScenario {
  if (input.manualScenarioOverride) return input.manualScenarioOverride;

  const { sellerCountry, sellerVatScheme, buyerCountry, buyerIsVatLiable, supplyType } = input;

  // Régimes spéciaux vendeur — priorité absolue
  if (sellerVatScheme === 'franchise')    return sellerCountry === 'BE' ? 'BE_FRANCHISE' : 'FR_MICRO_FRANCHISE';
  if (sellerVatScheme === 'micro_fr')     return 'FR_MICRO_FRANCHISE';
  if (sellerVatScheme === 'exempt_art44') return 'BE_EXEMPT_ART44';

  // Intracommunautaire
  const isIntracom = buyerCountry !== sellerCountry && buyerIsVatLiable;
  if (isIntracom) {
    if (sellerCountry === 'BE') return supplyType === 'goods' ? 'BE_INTRACOM_GOODS' : 'BE_INTRACOM_SERVICES';
    if (sellerCountry === 'FR') return 'FR_INTRACOM';
  }

  // Standard domestique
  if (sellerCountry === 'BE') return 'BE_STANDARD_21';
  if (sellerCountry === 'FR') return 'FR_STANDARD_20';

  throw new Error(`[vatScenario] Pays vendeur non supporté : ${sellerCountry}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}