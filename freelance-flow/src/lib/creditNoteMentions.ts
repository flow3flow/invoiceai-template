// src/lib/creditNoteMentions.ts
// AR n°1, art. 54 (BE) | BOFiP TVA-DECLA-30-20-20 (FR)

export type CreditNoteContext = {
    country: 'BE' | 'FR';
    originalInvoiceNumber: string;
    originalInvoiceDate: string; // ISO 8601
  };
  
  export interface CreditNoteLegalBlock {
    // Mention obligatoire à imprimer sur le document
    mandatoryMention: string;
    // Référence légale pour audit/UBL
    legalRef: string;
    // Libellé du document (terme légal par pays)
    documentLabel: 'Note de crédit' | 'Avoir' | 'Facture rectificative';
  }
  
  /**
   * Retourne le bloc légal complet pour une note de crédit / avoir.
   * La mention belge (art. 54 AR n°1) est OBLIGATOIRE — ne jamais l'omettre.
   */
  export function resolveCreditNoteMentions(ctx: CreditNoteContext): CreditNoteLegalBlock {
    if (ctx.country === 'BE') {
      return {
        // AR n°1, art. 54 — formule légale exacte, ne pas paraphraser
        mandatoryMention:
          'TVA à reverser à l\'État dans la mesure où elle a été initialement déduite',
        legalRef: `AR n°1, art. 54 | Réf. facture originale : ${ctx.originalInvoiceNumber} du ${ctx.originalInvoiceDate}`,
        documentLabel: 'Note de crédit',
      };
    }
  
    // France — BOFiP TVA-DECLA-30-20-20 | CGI art. 289 I-5
    return {
      mandatoryMention:
        `Document annulant et remplaçant la facture n° ${ctx.originalInvoiceNumber} du ${ctx.originalInvoiceDate}`,
      legalRef: `CGI art. 289 I-5 | BOFiP TVA-DECLA-30-20-20`,
      documentLabel: 'Avoir',
    };
  }