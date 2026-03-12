import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { computeTotals } from "@/lib/invoiceCalculations";
import { toast } from "sonner";

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

export interface CreateInvoiceInput {
  client_id: string;
  business_profile_id: string;
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  notes?: string | null;
  items: InvoiceItemInput[];
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

  const getInvoices = async (): Promise<InvoiceWithClient[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (
            name,
            company,
            email,
            street,
            zip_code,
            city,
            country_code,
            vat_number
          ),
          business_profiles (
            company_name,
            vat_number,
            street,
            zip_code,
            city,
            country_code,
            email,
            iban
          ),
          invoice_items (
            description,
            quantity,
            unit_price,
            vat_rate
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as InvoiceWithClient[];
    } catch (err: any) {
      toast.error("Erreur lors du chargement des factures");
      console.error(err);
      return [];
    }
  };

  const createInvoice = async (input: CreateInvoiceInput): Promise<Invoice | null> => {
    if (!user) {
      toast.error("Utilisateur non authentifié");
      return null;
    }

    if (!input.items.length) {
      toast.error("Ajoutez au moins une ligne");
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
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      invoiceId = invoice.id;

      const { error: itemsError } = await supabase.from("invoice_items").insert(
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
      return invoice;
    } catch (err: any) {
      if (invoiceId) {
        await supabase.from("invoices").delete().eq("id", invoiceId);
      }

      if (err.code === "23505") {
        toast.error("Ce numéro de facture existe déjà");
      } else if (err.code === "23503") {
        toast.error("Client introuvable ou non autorisé");
      } else {
        toast.error("Erreur lors de la création de la facture");
        console.error(err);
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createInvoice, getInvoices, loading };
};