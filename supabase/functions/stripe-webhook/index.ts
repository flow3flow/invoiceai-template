import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_STARTER')!]: 'starter',
  [Deno.env.get('STRIPE_PRICE_PRO')!]: 'pro',
  [Deno.env.get('STRIPE_PRICE_BUSINESS')!]: 'business',
};

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const plan = PRICE_TO_PLAN[priceId] ?? 'free';
      await supabase.from('profiles')
        .update({ plan, stripe_subscription_id: sub.id, stripe_price_id: priceId, plan_expires_at: null })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('profiles')
        .update({ plan: 'free', stripe_subscription_id: null, plan_expires_at: new Date().toISOString() })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }
    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer;
      if (customer.metadata?.supabase_user_id) {
        await supabase.from('profiles')
          .update({ stripe_customer_id: customer.id })
          .eq('id', customer.metadata.supabase_user_id);
      }
      break;
    }
  }

  return new Response('ok', { status: 200 });
});