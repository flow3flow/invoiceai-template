// src/lib/structuredRef.ts
// Référence structurée belge (OGM/VCS) — format +++XXX/XXXX/XXXXX+++
// Base légale : AR du 22 décembre 1993 relatif aux virements belges
// Algorithme : modulo 97 sur les 10 chiffres de référence
// ⚠️  Obligatoire pour tout virement B2B belge depuis 2012.
 
/**
 * Génère une référence structurée belge depuis un numéro de facture.
 *
 * Format : +++XXX/XXXX/DDDCC+++
 * - 10 chiffres de référence extraits du numéro de facture
 * - 2 chiffres de contrôle (modulo 97, si 0 → 97)
 * - Total : 12 chiffres affichés en 3 groupes (3/4/5)
 *
 * @example
 * generateStructuredRef("INV-2026-0083") → "+++002/0260/083XX+++"
 */
export function generateStructuredRef(invoiceNumber: string): string {
    // 1. Extraire les chiffres du numéro de facture
    const rawDigits = invoiceNumber.replace(/\D/g, "");
   
    // 2. Prendre les 10 derniers chiffres, compléter à gauche si nécessaire
    const ref10 = rawDigits.padStart(10, "0").slice(-10);
   
    // 3. Calcul modulo 97 — jamais 0 (on utilise 97 dans ce cas)
    const num = Number(ref10);
    const mod = num % 97;
    const check = String(mod === 0 ? 97 : mod).padStart(2, "0");
   
    // 4. Construction des 12 chiffres finaux : ref(10) + check(2)
    const full12 = ref10 + check;
   
    // 5. Formatage : +++XXX/XXXX/XXXXX+++
    return `+++${full12.slice(0, 3)}/${full12.slice(3, 7)}/${full12.slice(7)}+++`;
  }
   
  /**
   * Valide une référence structurée belge existante.
   * Utile pour vérifier une référence reçue d'un fournisseur.
   */
  export function validateStructuredRef(ref: string): boolean {
    const clean = ref.replace(/\+/g, "").replace(/\//g, "").trim();
    if (clean.length !== 12 || !/^\d{12}$/.test(clean)) return false;
   
    const ref10 = clean.slice(0, 10);
    const checkProvided = Number(clean.slice(10, 12));
    const num = Number(ref10);
    const mod = num % 97;
    const checkExpected = mod === 0 ? 97 : mod;
   
    return checkProvided === checkExpected;
  }