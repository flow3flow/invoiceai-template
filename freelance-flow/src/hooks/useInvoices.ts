import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types stricts — alignés schéma DB confirmé ───────────────────────────────

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface CreateInvoiceInput {
  client_id: string;
  invoice_number: string;
  issue_date: string;       // "YYYY-MM-DD"
  due_date?: string | null; // "YYYY-MM-DD" ou null
  notes?: string | null;
  items: InvoiceItemInput[];
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  status: string;
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

// ─── Calculs ──────────────────────────────────────────────────────────────────

function computeTotals(items: InvoiceItemInput[]) {
  let subtotal = 0;
  let vat_amount = 0;
  for (const item of items) {
    const line = item.quantity * item.unit_price;
    subtotal += line;
    vat_amount += line * (item.vat_rate / 100);
  }
  return {
    subtotal:   Math.round(subtotal * 100) / 100,
    vat_amount: Math.round(vat_amount * 100) / 100,
    total:      Math.round((subtotal + vat_amount) * 100) / 100,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useInvoices = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const createInvoice = async (input: CreateInvoiceInput): Promise<Invoice | null> => {
    if (!user) { toast.error('Utilisateur non authentifié'); return null; }
    if (!input.items.length) { toast.error('Ajoutez au moins une ligne'); return null; }

    setLoading(true);
    let invoiceId: string | null = null;

    try {
      const totals = computeTotals(input.items);

      // 1. Insertion facture
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          user_id:        user.id,
          client_id:      input.client_id,
          invoice_number: input.invoice_number,
          status:         'draft',
          issue_date:     input.issue_date,
          due_date:       input.due_date ?? null,
          subtotal:       totals.subtotal,
          vat_amount:     totals.vat_amount,
          total:          totals.total,
          notes:          input.notes ?? null,
          pdf_path:       null,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;
      invoiceId = invoice.id;

      // 2. Insertion lignes
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          input.items.map(item => ({
            invoice_id:  invoice.id,
            description: item.description,
            quantity:    item.quantity,
            unit_price:  item.unit_price,
            vat_rate:    item.vat_rate,
          }))
        );

      if (itemsError) throw itemsError;

      toast.success(`Facture ${invoice.invoice_number} créée`);
      return invoice;

    } catch (err: any) {
      // Rollback manuel
      if (invoiceId) {
        await supabase.from('invoices').delete().eq('id', invoiceId);
      }
      if (err.code === '23505') toast.error('Ce numéro de facture existe déjà');
      else if (err.code === '23503') toast.error('Client introuvable ou non autorisé');
      else { toast.error('Erreur lors de la création'); console.error(err); }
      return null;

    } finally {
      setLoading(false);
    }
  };

  return { createInvoice, loading };
};