import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { computeTotals } from "@/lib/invoiceCalculations";
import { toast } from "sonner";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VatScenario } from "@/lib/vatScenario";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type DocumentType = "invoice" | "credit_note" | "quote" | "order";
export type IssuerVatScheme = "normal" | "franchise" | "micro_fr" | "exempt_art44";

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
  vat_scenario?: VatScenario | null;
  issuer_vat_scheme?: IssuerVatScheme;
  service_date?: string | null;
  document_type?: DocumentType;
  linked_invoice_id?: string | null;
  linked_invoice_number?: string | null;
  structured_ref?: string | null;
  // Champs devis / bon de commande
  validity_days?: number | null;
  valid_until?: string | null;
  client_reference?: string | null;
}

// --- DÉBUT SECTION : input note de crédit ---
export interface CreateCreditNoteInput {
  originalInvoice: InvoiceWithClient;
  reason: string;
}
// --- FIN SECTION : input note de crédit ---

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  business_profile_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  service_date: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  // Snapshot émetteur immuable
  issuer_company_name: string | null;
  issuer_vat_number: string | null;
  issuer_street: string | null;
  issuer_zip_code: string | null;
  issuer_city: string | null;
  issuer_country_code: string | null;
  issuer_email: string | null;
  issuer_iban: string | null;
  issuer_logo_path: string | null;
  // Champs TVA
  vat_scenario: VatScenario | null;
  issuer_vat_scheme: IssuerVatScheme;
  document_type: DocumentType;
  linked_invoice_id: string | null;
  linked_invoice_number: string | null;
  structured_ref: string | null;
  // Champs devis / bon de commande
  validity_days: number | null;
  valid_until: string | null;
  client_reference: string | null;
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
// Prefix map par type de document
// ─────────────────────────────────────────────────────────────────────────────

const DOC_TYPE_PREFIX: Record<DocumentType, string> = {
  invoice:     "INV",
  quote:       "DEV",
  order:       "BC",
  credit_note: "NC",
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export const useInvoices = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // ─── getInvoices ──────────────────────────────────────────────────────────

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
  /**
   * Génère le prochain numéro séquentiel via la fonction SQL atomique.
   * @param prefix  "INV" | "DEV" | "BC" | "NC" — défaut "INV"
   *
   * ✅ Fix : nom correct = get_next_invoice_number
   *          paramètre année = p_fiscal_year (pas p_year)
   *          paramètre prefix = p_prefix
   */
  const getNextInvoiceNumber = async (prefix: string = "INV", businessProfileId: string,): Promise<string> => {
    if (!user) throw new Error("Utilisateur non authentifié");

    const fiscalYear = new Date().getFullYear();

    const { data, error } = await supabase.rpc("get_next_invoice_number", {
      p_business_profile_id: businessProfileId,
      p_fiscal_year: fiscalYear,
      p_prefix:      prefix,
    });

    if (error) {
      const pgErr = error as PostgrestError;
      console.error("[useInvoices] getNextInvoiceNumber:", pgErr.message);
      throw new Error("Impossible de générer le numéro de facture");
    }

    return data as string;
  };
  // --- FIN SECTION : getNextInvoiceNumber ---

  // ─── createInvoice ────────────────────────────────────────────────────────

  const createInvoice = async (input: CreateInvoiceInput): Promise<Invoice | null> => {
    if (!user) { toast.error("Utilisateur non authentifié"); return null; }
    if (!input.items.length) { toast.error("Ajoutez au moins une ligne"); return null; }
    if (!input.issuer_snapshot.issuer_company_name) {
      toast.error("Profil entreprise incomplet : nom manquant"); return null;
    }

    setLoading(true);
    let invoiceId: string | null = null;

    try {
      const totals = computeTotals(
        input.items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unit_price,
          vatRate: i.vat_rate,
        })),
      );

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([{
          user_id:               user.id,
          client_id:             input.client_id,
          business_profile_id:   input.business_profile_id,
          invoice_number:        input.invoice_number,
          status:                "draft",
          issue_date:            input.issue_date,
          due_date:              input.due_date ?? null,
          service_date:          input.service_date ?? null,
          subtotal:              totals.subtotal,
          vat_amount:            totals.vat_amount,
          total:                 totals.total,
          notes:                 input.notes ?? null,
          pdf_path:              null,
          vat_scenario:          input.vat_scenario ?? null,
          issuer_vat_scheme:     input.issuer_vat_scheme ?? "normal",
          document_type:         input.document_type ?? "invoice",
          linked_invoice_id:     input.linked_invoice_id ?? null,
          linked_invoice_number: input.linked_invoice_number ?? null,
          structured_ref:        input.structured_ref ?? null,
          validity_days:         input.validity_days ?? null,
          valid_until:           input.valid_until ?? null,
          client_reference:      input.client_reference ?? null,
          ...input.issuer_snapshot,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;
      invoiceId = invoice.id;

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(input.items.map((item) => ({
          invoice_id:  invoice.id,
          description: item.description,
          quantity:    item.quantity,
          unit_price:  item.unit_price,
          vat_rate:    item.vat_rate,
        })));

      if (itemsError) throw itemsError;

      toast.success(`Facture ${invoice.invoice_number} créée`);
      return invoice as Invoice;

    } catch (err: unknown) {
      if (invoiceId) await supabase.from("invoices").delete().eq("id", invoiceId);
      const pgErr = err as PostgrestError;
      if (pgErr.code === "23505") toast.error("Ce numéro de facture existe déjà");
      else if (pgErr.code === "23503") toast.error("Client ou profil introuvable");
      else {
        toast.error("Erreur lors de la création de la facture");
        console.error("[useInvoices] createInvoice:", pgErr.message ?? err);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // --- DÉBUT SECTION : updateInvoiceStatus ---
  const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    draft:     ["sent", "overdue"],
    sent:      ["paid", "overdue"],
    overdue:   ["sent", "paid"],
    paid:      [],
    cancelled: [],
  };

  const updateInvoiceStatus = async (
    invoiceId: string,
    currentStatus: InvoiceStatus,
    newStatus: InvoiceStatus,
  ): Promise<boolean> => {
    if (!user) { toast.error("Utilisateur non authentifié"); return false; }

    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      toast.error(`Transition ${currentStatus} → ${newStatus} non autorisée`);
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", invoiceId)
        .eq("user_id", user.id);

      if (error) throw error;

      const labels: Record<InvoiceStatus, string> = {
        draft:     "Brouillon",
        sent:      "Envoyée",
        paid:      "Payée",
        overdue:   "En retard",
        cancelled: "Annulée",
      };
      toast.success(`Facture marquée comme "${labels[newStatus]}"`);
      return true;

    } catch (err: unknown) {
      const pgErr = err as PostgrestError;
      toast.error("Erreur lors de la mise à jour du statut");
      console.error("[useInvoices] updateInvoiceStatus:", pgErr.message ?? err);
      return false;
    } finally {
      setLoading(false);
    }
  };
  // --- FIN SECTION : updateInvoiceStatus ---

  // --- DÉBUT SECTION : convertToInvoice ---
  /**
   * Convertit un devis (quote) ou un bon de commande (order) en facture.
   * - Génère un nouveau numéro INV-YYYY-XXXX via getNextInvoiceNumber("INV")
   * - Duplique toutes les lignes
   * - Lie la nouvelle facture au document source (linked_invoice_id)
   * - Passe le document source en statut "cancelled"
   */
  const convertToInvoice = async (source: InvoiceWithClient): Promise<Invoice | null> => {
    if (!user) { toast.error("Utilisateur non authentifié"); return null; }

    if (!["quote", "order"].includes(source.document_type)) {
      toast.error("Seuls les devis et bons de commande peuvent être convertis en facture");
      return null;
    }

    if (!source.invoice_items?.length) {
      toast.error("Lignes introuvables — rechargez la page");
      return null;
    }

    setLoading(true);
    let newInvoiceId: string | null = null;

    try {
      // ✅ Prefix "INV" explicite
      const newNumber = await getNextInvoiceNumber("INV");

      const totals = computeTotals(
        source.invoice_items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unit_price,
          vatRate: i.vat_rate,
        })),
      );

      const { data: newInvoice, error: invError } = await supabase
        .from("invoices")
        .insert([{
          user_id:               user.id,
          client_id:             source.client_id,
          business_profile_id:   source.business_profile_id,
          invoice_number:        newNumber,
          status:                "draft",
          document_type:         "invoice",
          issue_date:            new Date().toISOString().split("T")[0],
          due_date:              null,
          service_date:          null,
          subtotal:              totals.subtotal,
          vat_amount:            totals.vat_amount,
          total:                 totals.total,
          notes:                 source.notes,
          pdf_path:              null,
          vat_scenario:          source.vat_scenario,
          issuer_vat_scheme:     source.issuer_vat_scheme,
          linked_invoice_id:     source.id,
          linked_invoice_number: source.invoice_number,
          structured_ref:        null,
          issuer_company_name:   source.issuer_company_name,
          issuer_vat_number:     source.issuer_vat_number,
          issuer_street:         source.issuer_street,
          issuer_zip_code:       source.issuer_zip_code,
          issuer_city:           source.issuer_city,
          issuer_country_code:   source.issuer_country_code,
          issuer_email:          source.issuer_email,
          issuer_iban:           source.issuer_iban,
          issuer_logo_path:      source.issuer_logo_path,
        }])
        .select()
        .single();

      if (invError) throw invError;
      newInvoiceId = newInvoice.id;

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(source.invoice_items.map((item) => ({
          invoice_id:  newInvoice.id,
          description: item.description,
          quantity:    item.quantity,
          unit_price:  item.unit_price,
          vat_rate:    item.vat_rate,
        })));

      if (itemsError) throw itemsError;

      const { error: cancelError } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", source.id)
        .eq("user_id", user.id);

      if (cancelError) throw cancelError;

      const sourceLabel = source.document_type === "quote" ? "Devis" : "Bon de commande";
      toast.success(`✅ ${sourceLabel} ${source.invoice_number} → Facture ${newNumber} créée`);
      return newInvoice as Invoice;

    } catch (err: unknown) {
      if (newInvoiceId) await supabase.from("invoices").delete().eq("id", newInvoiceId);
      const pgErr = err as PostgrestError;
      toast.error("Erreur lors de la conversion");
      console.error("[useInvoices] convertToInvoice:", pgErr.message ?? err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  // --- FIN SECTION : convertToInvoice ---

  // --- DÉBUT SECTION : createCreditNote ---
  const createCreditNote = async (input: CreateCreditNoteInput): Promise<Invoice | null> => {
    if (!user) { toast.error("Utilisateur non authentifié"); return null; }

    const { originalInvoice, reason } = input;

    if (!["sent", "paid"].includes(originalInvoice.status)) {
      toast.error("Seules les factures envoyées ou payées peuvent faire l'objet d'une note de crédit");
      return null;
    }

    if (!originalInvoice.invoice_items?.length) {
      toast.error("Lignes de la facture introuvables — rechargez la page");
      return null;
    }

    setLoading(true);
    let creditNoteId: string | null = null;

    try {
      // ✅ Fix : prefix "NC" direct — plus de string replace fragile
      const cnNumber = await getNextInvoiceNumber("NC");

      const { data: creditNote, error: cnError } = await supabase
        .from("invoices")
        .insert([{
          user_id:               user.id,
          client_id:             originalInvoice.client_id,
          business_profile_id:   originalInvoice.business_profile_id,
          invoice_number:        cnNumber,
          status:                "draft",
          document_type:         "credit_note",
          issue_date:            new Date().toISOString().split("T")[0],
          due_date:              null,
          service_date:          null,
          subtotal:              -Math.abs(originalInvoice.subtotal),
          vat_amount:            -Math.abs(originalInvoice.vat_amount),
          total:                 -Math.abs(originalInvoice.total),
          notes:                 reason,
          pdf_path:              null,
          vat_scenario:          originalInvoice.vat_scenario,
          issuer_vat_scheme:     originalInvoice.issuer_vat_scheme,
          linked_invoice_id:     originalInvoice.id,
          linked_invoice_number: originalInvoice.invoice_number,
          structured_ref:        originalInvoice.structured_ref ?? null,
          issuer_company_name:   originalInvoice.issuer_company_name,
          issuer_vat_number:     originalInvoice.issuer_vat_number,
          issuer_street:         originalInvoice.issuer_street,
          issuer_zip_code:       originalInvoice.issuer_zip_code,
          issuer_city:           originalInvoice.issuer_city,
          issuer_country_code:   originalInvoice.issuer_country_code,
          issuer_email:          originalInvoice.issuer_email,
          issuer_iban:           originalInvoice.issuer_iban,
          issuer_logo_path:      originalInvoice.issuer_logo_path,
        }])
        .select()
        .single();

      if (cnError) throw cnError;
      creditNoteId = creditNote.id;

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(originalInvoice.invoice_items.map((item) => ({
          invoice_id:  creditNote.id,
          description: item.description,
          quantity:    -Math.abs(item.quantity),
          unit_price:  item.unit_price,
          vat_rate:    item.vat_rate,
        })));

      if (itemsError) throw itemsError;

      const { error: cancelError } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", originalInvoice.id);

      if (cancelError) throw cancelError;

      toast.success(`Note de crédit ${cnNumber} créée — facture ${originalInvoice.invoice_number} annulée`);
      return creditNote as Invoice;

    } catch (err: unknown) {
      if (creditNoteId) await supabase.from("invoices").delete().eq("id", creditNoteId);
      const pgErr = err as PostgrestError;
      toast.error("Erreur lors de la création de la note de crédit");
      console.error("[useInvoices] createCreditNote:", pgErr.message ?? err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  // --- FIN SECTION : createCreditNote ---

  return {
    createInvoice,
    createCreditNote,
    convertToInvoice,
    updateInvoiceStatus,
    getInvoices,
    getNextInvoiceNumber,
    loading,
  };
};