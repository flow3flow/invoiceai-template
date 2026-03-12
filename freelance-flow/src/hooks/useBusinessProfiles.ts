import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BusinessProfile {
  id: string;
  user_id: string;
  company_name: string;
  vat_number: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  country_code: string;
  email: string | null;
  iban: string | null;
  logo_path: string | null;
  is_default: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BusinessProfileInput = Omit<
  BusinessProfile,
  'id' | 'user_id' | 'is_default' | 'deleted_at' | 'created_at' | 'updated_at'
>;

export const useBusinessProfiles = () => {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProfiles = async () => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('company_name', { ascending: true });

      if (error) throw error;
      setProfiles(data ?? []);
    } catch (err: any) {
      toast.error('Erreur lors du chargement des profils');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfiles();
    } else {
      setProfiles([]);
      setLoading(false);
    }
  }, [user]);

  const createProfile = async (
    input: BusinessProfileInput,
    setAsDefault = false
  ): Promise<BusinessProfile | null> => {
    if (!user) return null;

    const isFirst = profiles.length === 0;
    const shouldBeDefault = setAsDefault || isFirst;

    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .insert([{ ...input, user_id: user.id, is_default: shouldBeDefault }])
        .select()
        .single();

      if (error) throw error;

      if (shouldBeDefault && profiles.length > 0) {
        const { error: rpcError } = await supabase.rpc(
          'set_default_business_profile',
          { p_profile_id: data.id }
        );

        if (rpcError) throw rpcError;

        setProfiles((prev) =>
          [...prev.map((p) => ({ ...p, is_default: false })), { ...data, is_default: true }].sort(sortProfiles)
        );
      } else {
        setProfiles((prev) => [...prev, data].sort(sortProfiles));
      }

      toast.success('Profil créé');
      return data;
    } catch (err: any) {
      toast.error('Erreur lors de la création du profil');
      console.error(err);
      throw err;
    }
  };

  const updateProfile = async (
    id: string,
    input: Partial<BusinessProfileInput>
  ): Promise<void> => {
    const { is_default: _, ...safeInput } = input as Partial<BusinessProfileInput> & {
      is_default?: boolean;
    };

    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .update(safeInput)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? data : p)).sort(sortProfiles)
      );

      toast.success('Profil mis à jour');
    } catch (err: any) {
      toast.error('Erreur lors de la mise à jour');
      throw err;
    }
  };

  const setDefaultProfile = async (id: string): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc(
        'set_default_business_profile',
        { p_profile_id: id }
      );

      if (error) throw error;

      const profile = profiles.find((p) => p.id === id);

      setProfiles((prev) =>
        prev.map((p) => ({ ...p, is_default: p.id === id })).sort(sortProfiles)
      );

      toast.success(`"${profile?.company_name}" défini comme profil par défaut`);
    } catch (err: any) {
      toast.error('Erreur lors du changement de profil par défaut');
      throw err;
    }
  };

  const deleteProfile = async (id: string): Promise<void> => {
    if (!user) return;

    const profile = profiles.find((p) => p.id === id);

    if (profile?.is_default && profiles.length > 1) {
      toast.error('Définissez un autre profil par défaut avant de supprimer celui-ci');
      return;
    }

    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({ deleted_at: new Date().toISOString(), is_default: false })
        .eq('id', id);

      if (error) throw error;

      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast.success('Profil supprimé');
    } catch (err: any) {
      if (err.message?.includes('invoices are linked')) {
        toast.error('Impossible : ce profil a des factures liées');
      } else {
        toast.error('Erreur lors de la suppression');
      }
      throw err;
    }
  };

  const defaultProfile = profiles.find((p) => p.is_default) ?? profiles[0] ?? null;

  return {
    profiles,
    defaultProfile,
    loading,
    createProfile,
    updateProfile,
    setDefaultProfile,
    deleteProfile,
    refresh: fetchProfiles,
  };
};

function sortProfiles(a: BusinessProfile, b: BusinessProfile): number {
  if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
  return a.company_name.localeCompare(b.company_name);
}