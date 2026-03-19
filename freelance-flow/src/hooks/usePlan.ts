import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Plan } from '@/lib/planLimits';

interface PlanState {
  plan: Plan;
  invoicesCountThisMonth: number;
  loading: boolean;
}

export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>({
    plan: 'free',
    invoicesCountThisMonth: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchPlan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // ← Pas connecté → plan free par défaut, pas d'appel DB
      if (!session) {
        setState(s => ({ ...s, plan: 'free', loading: false }));
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('plan, invoices_count_this_month')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('[usePlan] fetch error:', error);
        setState(s => ({ ...s, loading: false }));
        return;
      }

      setState({
        plan: (data.plan as Plan) ?? 'free',
        invoicesCountThisMonth: data.invoices_count_this_month ?? 0,
        loading: false,
      });
    };

    fetchPlan();
  }, []);

  return state;
}