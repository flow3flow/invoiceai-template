// src/hooks/useClients.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setClients(data ?? []);
    } catch (err: any) {
      toast.error('Erreur lors du chargement des clients');
      console.error(err);
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

      setClients((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
      );

      toast.success('Client ajouté avec succès');
      return data;
    } catch (err: any) {
      toast.error("Erreur lors de l'ajout du client");
      throw err;
    }
  };

  const updateClient = async (
    id: string,
    input: Partial<ClientInput>
  ): Promise<void> => {
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
        prev
          .map((c) => (c.id === id ? data : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      toast.success('Client mis à jour');
    } catch (err: any) {
      toast.error('Erreur lors de la mise à jour');
      throw err;
    }
  };

  const deleteClient = async (id: string): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);

      if (error) throw error;

      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success('Client supprimé');
    } catch (err: any) {
      if (err.code === '23503') {
        toast.error('Impossible : ce client a des factures associées');
      } else {
        toast.error('Erreur lors de la suppression');
      }
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchClients();
    } else {
      setClients([]);
      setLoading(false);
    }
  }, [user]);

  return {
    clients,
    loading,
    addClient,
    updateClient,
    deleteClient,
    refresh: fetchClients,
  };
};