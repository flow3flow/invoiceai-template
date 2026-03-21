// src/hooks/useClients.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PostgrestError } from '@supabase/supabase-js';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  vat_number: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  country_code: string;
  // --- AJOUT : champs BCE + Peppol ---
  is_company: boolean;
  peppol_id: string | null;
  peppol_verified_at: string | null;
  bce_verified_at: string | null;
  // ---
  created_at: string;
  updated_at: string;
}

export type ClientInput = Omit<
  Client,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchClients = async () => {
    if (!user) { setClients([]); setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setClients(data ?? []);
    } catch (err: unknown) {
      const pgErr = err as PostgrestError;
      toast.error('Erreur lors du chargement des clients');
      console.error('[useClients] fetchClients:', pgErr.message ?? err);
    } finally {
      setLoading(false);
    }
  };

  const addClient = async (input: ClientInput): Promise<Client | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...input, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      setClients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Client ajouté avec succès');
      return data;
    } catch (err: unknown) {
      const pgErr = err as PostgrestError;
      toast.error("Erreur lors de l'ajout du client");
      console.error('[useClients] addClient:', pgErr.message ?? err);
      return null;
    }
  };

  const updateClient = async (id: string, input: Partial<ClientInput>): Promise<void> => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setClients((prev) =>
        prev.map((c) => (c.id === id ? data : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success('Client mis à jour');
    } catch (err: unknown) {
      const pgErr = err as PostgrestError;
      toast.error('Erreur lors de la mise à jour');
      console.error('[useClients] updateClient:', pgErr.message ?? err);
    }
  };

  const deleteClient = async (id: string): Promise<void> => {
    if (!user) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success('Client supprimé');
    } catch (err: unknown) {
      const pgErr = err as PostgrestError;
      if (pgErr.code === '23503') {
        toast.error('Impossible : ce client a des factures associées');
      } else {
        toast.error('Erreur lors de la suppression');
        console.error('[useClients] deleteClient:', pgErr.message ?? err);
      }
    }
  };

  useEffect(() => {
    if (user) fetchClients();
    else { setClients([]); setLoading(false); }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return { clients, loading, addClient, updateClient, deleteClient, refresh: fetchClients };
};