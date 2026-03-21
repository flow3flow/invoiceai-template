// src/lib/peppol-check.ts
// Vérification enregistrement Peppol via Edge Function Supabase (proxy)
// Le directory.peppol.eu bloque les appels directs depuis le navigateur (CORS)
// → appel server-side via supabase.functions.invoke("peppol-check")

import { supabase } from "@/lib/supabase";

export interface PeppolResult {
  isRegistered: boolean;
  peppolId: string | null;       // "0208:0123456789"
  participantId: string | null;
  checkedAt: string;
}

export interface PeppolError {
  code: "NETWORK_ERROR" | "INVALID_FORMAT" | "EDGE_FUNCTION_ERROR";
  message: string;
}

/**
 * Vérifie si une entreprise belge est enregistrée sur le réseau Peppol.
 * Passe par la Edge Function Supabase "peppol-check" pour éviter le CORS.
 * @param vatDigits - 10 chiffres sans "BE" (ex: "0123456789")
 */
export async function checkPeppol(vatDigits: string): Promise<PeppolResult | PeppolError> {
  if (!/^\d{10}$/.test(vatDigits)) {
    return {
      code: "INVALID_FORMAT",
      message: "Format invalide — attendu 10 chiffres sans BE",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("peppol-check", {
      body: { vatDigits },
    });

    if (error) {
      return {
        code: "EDGE_FUNCTION_ERROR",
        message: `Erreur Edge Function : ${error.message}`,
      };
    }

    if (data?.error) {
      return {
        code: "NETWORK_ERROR",
        message: data.error,
      };
    }

    return {
      isRegistered:  data.isRegistered ?? false,
      peppolId:      data.peppolId ?? null,
      participantId: data.isRegistered
        ? `iso6523-actorid-upis::0208:${vatDigits}`
        : null,
      checkedAt:     data.checkedAt ?? new Date().toISOString(),
    };
  } catch (err) {
    return {
      code: "NETWORK_ERROR",
      message: `Impossible de vérifier Peppol : ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function isPeppolError(result: PeppolResult | PeppolError): result is PeppolError {
  return "code" in result;
}