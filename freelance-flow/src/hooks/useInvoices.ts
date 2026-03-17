import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { computeTotals } from "@/lib/invoiceCalculations";
import { toast } from "sonner";
import type { PostgrestError } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

// --- DÉBUT SECTION : snapshot émetteur obligatoire ---
export interface IssuerSnapshot {
  issuer_company_name: string;
  issuer_vat_number: string | null;
  issuer_street: string | null;
  issuer_zip_code: string | null;
  issuer_city: string | null;
  issuer_country_code: string | null;
  issuer_email: string | null;
  issuer_iban: string | null;
  issuer_logo_path: string | null;
}
// --- FIN SECTION : snapshot émetteur obligatoire ---

export interface CreateInvoiceInput {
  client_id: string;
  business_profile_id: string;
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  notes?: string | null;
  items: InvoiceItemInput[];
  issuer_snapshot: IssuerSnapshot;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  business_profile_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  issuer_company_name: string | null;
  issuer_vat_number: string | null;
  issuer_street: string | null;
  issuer_zip_code: string | null;
  issuer_city: string | null;
  issuer_country_code: string | null;
  issuer_email: string | null;
  issuer_iban: string | null;
  issuer_logo_path: string | null;
}

export interface InvoiceWithClient extends Invoice {
  clients: {
    name: string;
    company: string | null;
    email?: string | null;
    street?: string | null;
    zip_code?: string | null;
    city?: string | null;
    country_code?: string | null;
    vat_number?: string | null;
  } | null;
  // ⚠️ business_profiles : affichage uniquement.
  // PDF → toujours utiliser issuer_* (snapshot immuable).
  business_profiles: {
    company_name: string;
    vat_number: string | null;
    street: string | null;
    zip_code: string | null;
    city: string | null;
    country_code: string;
    email: string | null;
    iban: string | null;
  } | null;
  invoice_items: {
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export const useInvoices = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // ─── getInvoices ────────────────────────────────────────────────────────────

  const getInvoices = async (): Promise<InvoiceWithClient[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        clients (
          name, company, email,
          street, zip_code, city,
          country_code, vat_number
        ),
        business_profiles (
          company_name, vat_number,
          street, zip_code, city,
          country_code, email, iban
        ),
        invoice_items (
          description, quantity,
          unit_price, vat_rate
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      const pgErr = error as PostgrestError;
      toast.error("Erreur lors du chargement des factures");
      console.error("[useInvoices] getInvoices:", pgErr.message);
      return [];
    }

    return (data ?? []) as InvoiceWithClient[];
  };

  // --- DÉBUT SECTION : getNextInvoiceNumber ---
  // Appelle la fonction PostgreSQL atomique — séquence sans trou garantie.
  // Ne jamais générer le numéro côté client (Math.random, Date.now, etc.).
  const getNextInvoiceNumber = async (): Promise<string> => {
    if (!user) throw new Error("Utilisateur non authentifié");

    const year = new Date().getFullYear();

    const { data, error } = await supabase.rpc("generate_invoice_number", {
      p_user_id: user.id,
      p_year: year,
    });

    if (error) {
      const pgErr = error as PostgrestError;
      console.error("[useInvoices] getNextInvoiceNumber:", pgErr.message);
      throw new Error("Impossible de générer le numéro de facture");
    }

    return data as string;
  };
  // --- FIN SECTION : getNextInvoiceNumber ---

  // ─── createInvoice ──────────────────────────────────────────────────────────

  const createInvoice = async (input: CreateInvoiceInput): Promise<Invoice | null> => {
    if (!user) {
      toast.error("Utilisateur non authentifié");
      return null;
    }

    if (!input.items.length) {
      toast.error("Ajoutez au moins une ligne");
      return null;
    }

    if (!input.issuer_snapshot.issuer_company_name) {
      toast.error("Profil entreprise incomplet : nom manquant");
      return null;
    }

    setLoading(true);
    let invoiceId: string | null = null;

    try {
      const totals = computeTotals(
        input.items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unit_price,
          vatRate: i.vat_rate,
        }))
      );

      // --- DÉBUT SECTION : INSERT avec snapshot immuable ---
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            user_id: user.id,
            client_id: input.client_id,
            business_profile_id: input.business_profile_id,
            invoice_number: input.invoice_number,
            status: "draft",
            issue_date: input.issue_date,
            due_date: input.due_date ?? null,
            subtotal: totals.subtotal,
            vat_amount: totals.vat_amount,
            total: totals.total,
            notes: input.notes ?? null,
            pdf_path: null,
            // Snapshot figé à la création — jamais mis à jour après émission
            ...input.issuer_snapshot,
          },
        ])
        .select()
        .single();
      // --- FIN SECTION : INSERT avec snapshot immuable ---

      if (invoiceError) throw invoiceError;

      invoiceId = invoice.id;

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(
          input.items.map((item) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            vat_rate: item.vat_rate,
          }))
        );

      if (itemsError) throw itemsError;

      toast.success(`Facture ${invoice.invoice_number} créée`);
      return invoice as Invoice;

    } catch (err: unknown) {
      // Rollback : supprime la facture orpheline si INSERT items a échoué
      if (invoiceId) {
        await supabase.from("invoices").delete().eq("id", invoiceId);
      }

      const pgErr = err as PostgrestError;
      if (pgErr.code === "23505") {
        toast.error("Ce numéro de facture existe déjà");
      } else if (pgErr.code === "23503") {
        toast.error("Client ou profil introuvable");
      } else {
        toast.error("Erreur lors de la création de la facture");
        console.error("[useInvoices] createInvoice:", pgErr.message ?? err);
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createInvoice, getInvoices, getNextInvoiceNumber, loading };
};