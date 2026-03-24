// src/lib/ai/sanitizer.ts
// Couche 1 — PII Sanitization avant envoi LLM
// Conforme Privacy Policy v2.1 §5 — Anthropic ne reçoit jamais de PII directe

export interface SanitizedPayload {
    cleanedText: string;
    dictionary:  Record<string, string>;
  }
  
  export function sanitizeInput(text: string): SanitizedPayload {
    let cleanedText = text;
    const dictionary: Record<string, string> = {};
    let idx = 0;
  
    const replace = (regex: RegExp, prefix: string) => {
      cleanedText = cleanedText.replace(regex, (match) => {
        const token = `[${prefix}_${idx++}]`;
        dictionary[token] = match;
        return token;
      });
    };
  
    // IBAN européen
    replace(/[A-Z]{2}\d{2}[A-Z0-9]{4,30}/g, 'IBAN');
    // Email
    replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'EMAIL');
    // TVA BE + FR
    replace(/(BE0\d{9}|FR[A-Z0-9]{2}\d{9})/g, 'VAT');
    // Téléphone BE/FR
    replace(/(\+32|\+33|0032|0033)?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g, 'PHONE');
  
    return { cleanedText, dictionary };
  }
  
  export function restorePII(
    text: string,
    dictionary: Record<string, string>
  ): string {
    return Object.entries(dictionary).reduce(
      (acc, [token, value]) => acc.replaceAll(token, value),
      text
    );
  }