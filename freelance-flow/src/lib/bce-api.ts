// src/lib/bce-api.ts
// Lookup Banque Carrefour des Entreprises (BCE) belge
// Passe par la Edge Function Supabase "bce-lookup" (server-side, pas de CORS)
// La Edge Function essaie kbodata.be en premier → fallback VIES si indisponible

import { supabase } from "@/lib/supabase";

export interface BceResult {
  enterpriseNumber: string;
  denomination: string;
  legalForm: string | null;
  status: "Active" | "Stopped" | string;
  street: string | null;
  number: string | null;
  zipCode: string | null;
  municipality: string | null;
  countryCode: string;
  vatNumber: string;
  startDate: string | null;
  source: "kbodata" | "vies";
}

export interface BceError {
  code: "NOT_FOUND" | "INVALID_FORMAT" | "NETWORK_ERROR" | "EDGE_FUNCTION_ERROR";
  message: string;
}

/**
 * Normalise un numéro de TVA belge.
 * Accepte : BE0123456789 / 0123456789 / 0123.456.789
 * Retourne : "0123456789" (10 chiffres sans BE)
 */
export function normalizeBelgianVat(raw: string): string | null {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digits = clean.startsWith("BE") ? clean.slice(2) : clean;
  if (!/^\d{10}$/.test(digits)) return null;
  return digits;
}

/**
 * Lookup BCE via Edge Function Supabase "bce-lookup".
 * Stratégie server-side : kbodata.be → fallback VIES.
 * Pas de CORS, pas de DNS failure côté browser.
 */
export async function lookupBce(vatNumber: string): Promise<BceResult | BceError> {
  const digits = normalizeBelgianVat(vatNumber);

  if (!digits) {
    return {
      code: "INVALID_FORMAT",
      message: "Format de numéro de TVA invalide. Attendu : BE + 10 chiffres",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("bce-lookup", {
      body: { vatDigits: digits },
    });

    if (error) {
      return {
        code: "EDGE_FUNCTION_ERROR",
        message: `Erreur Edge Function : ${error.message}`,
      };
    }

    // Erreur retournée par la Edge Function
    if (data?.error) {
      return {
        code: data.error === "NOT_FOUND" ? "NOT_FOUND" : "NETWORK_ERROR",
        message: data.message ?? "Erreur inconnue",
      };
    }

    return data as BceResult;

  } catch (err) {
    return {
      code: "NETWORK_ERROR",
      message: `Impossible de contacter la Edge Function : ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function isBceError(result: BceResult | BceError): result is BceError {
  return "code" in result;
}