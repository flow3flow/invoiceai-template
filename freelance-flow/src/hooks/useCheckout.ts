import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const PRICE_IDS = {
  starter: import.meta.env.VITE_STRIPE_PRICE_STARTER as string,
  pro: import.meta.env.VITE_STRIPE_PRICE_PRO as string,
  business: import.meta.env.VITE_STRIPE_PRICE_BUSINESS as string,
};

export function useCheckout() {
  const [loading, setLoading] = useState<string | null>(null);

  const startCheckout = async (plan: 'starter' | 'pro' | 'business') => {
    setLoading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = '/login?redirect=/pricing';
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: PRICE_IDS[plan],
          successUrl: `${window.location.origin}/dashboard?upgrade=success`,
          cancelUrl: `${window.location.origin}/#pricing`,
        },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('[useCheckout] error:', err);
    } finally {
      setLoading(null);
    }
  };

  return { startCheckout, loading };
}