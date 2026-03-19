# InvoiceAI — Documentation Complémentaire
> Business Project Flow · Version 1.0 · 16 mars 2026  
> Sections : Mentions légales BE/FR · Stripe · Backup/DR · UBL/Peppol  
> Confidentiel — Usage interne

---

# SECTION 1 — MENTIONS LÉGALES OBLIGATOIRES SUR LES FACTURES

---

## 1.1 Contexte légal

Une facture belge sans les mentions légales requises est **fiscalement invalide**, indépendamment de sa conformité Peppol. Le Code TVA belge (Art. 53 § 2) et la Directive européenne 2006/112/CE définissent la liste exhaustive des mentions obligatoires. Le `Financial Integrity Engine` doit valider leur présence **avant** toute émission.

---

## 1.2 Mentions obligatoires — Belgique (B2B)

| # | Mention | Champ Supabase | Obligatoire | Notes |
|---|---|---|---|---|
| 1 | Date d'émission | `invoices.issue_date` | ✅ | Format JJ/MM/AAAA |
| 2 | Numéro de facture séquentiel | `invoices.invoice_number` | ✅ | Unique, continu, sans rupture |
| 3 | Nom + adresse de l'émetteur | `issuer_company_name` + `issuer_street` + `issuer_zip_code` + `issuer_city` | ✅ | Snapshot immuable |
| 4 | Numéro de TVA de l'émetteur | `issuer_vat_number` | ✅ | Format BE + 10 chiffres |
| 5 | Nom + adresse du client | `clients.name` + adresse | ✅ | |
| 6 | Numéro de TVA du client | `clients.vat_number` | ✅ B2B | Obligatoire si client assujetti |
| 7 | Description des biens/services | `invoice_items.description` | ✅ | Suffisamment précise |
| 8 | Quantité et prix unitaire HT | `invoice_items.quantity` + `unit_price` | ✅ | |
| 9 | Taux de TVA appliqué | `invoice_items.vat_rate` | ✅ | Par ligne si taux différents |
| 10 | Montant TVA | `invoices.vat_amount` | ✅ | |
| 11 | Montant total HT | `invoices.subtotal` | ✅ | |
| 12 | Montant total TTC | `invoices.total` | ✅ | |
| 13 | Date d'échéance | `invoices.due_date` | ✅ | Ou "Payable à réception" |
| 14 | Conditions de paiement | `invoices.payment_terms` | ✅ | Ex: "30 jours date facture" |
| 15 | IBAN + BIC de l'émetteur | `issuer_iban` | ✅ pratique | Légalement recommandé |
| 16 | Devise | `invoices.currency` | ✅ | EUR pour BE |
| 17 | Numéro de commande client | `invoices.client_po_number` | 🟡 si fourni | Obligatoire si le client l'exige |

### Mentions spéciales selon le cas

| Situation | Mention à ajouter | Exemple |
|---|---|---|
| TVA 0% intracommunautaire | Référence légale | *"Exonération TVA — Art. 39bis Code TVA belge"* |
| Autoliquidation (reverse charge) | Mention obligatoire | *"TVA due par le cocontractant — Art. 51 § 2 CTVA"* |
| Franchise TVA (petite entreprise) | Mention obligatoire | *"Régime de franchise de la taxe — Art. 56bis CTVA"* |
| Prestation à un particulier (B2C) | Pas de TVA client requise | Règles différentes |

---

## 1.3 Mentions obligatoires — France (B2B)

| # | Mention | Spécificité FR vs BE |
|---|---|---|
| 1-12 | Identiques à la BE | — |
| 13 | Numéro SIRET de l'émetteur | En plus du numéro TVA intracommunautaire |
| 14 | Forme juridique + capital | Ex : *"SAS au capital de 1 000€"* |
| 15 | RCS + ville d'immatriculation | Ex : *"RCS Paris B 123 456 789"* |
| 16 | Taux de pénalités de retard | Obligatoire depuis 2013 — Ex : *"Taux BCE + 10 points"* |
| 17 | Indemnité forfaitaire recouvrement | *"40€ d'indemnité forfaitaire pour frais de recouvrement"* |
| 18 | Escompte pour paiement anticipé | *"Pas d'escompte pour paiement anticipé"* si non applicable |

---

## 1.4 Validation dans le Financial Integrity Engine

```typescript
// src/lib/legalMentionsValidator.ts

export interface LegalMentionsValidation {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
}

export function validateLegalMentions(
  invoice: VerifiedInvoice,
  profile: BusinessProfile,
  client: Client,
  countryCode: 'BE' | 'FR'
): LegalMentionsValidation {
  const missing: string[] = [];
  const warnings: string[] = [];

  // ── Champs universels ──────────────────────────────────────────────

  if (!invoice.issue_date) missing.push('Date d\'émission manquante');
  if (!invoice.invoice_number) missing.push('Numéro de facture manquant');
  if (!invoice.due_date && !invoice.payment_terms) {
    missing.push('Date d\'échéance ou conditions de paiement manquantes');
  }

  // Émetteur
  if (!profile.company_name) missing.push('Nom de l\'émetteur manquant');
  if (!profile.street || !profile.zip_code || !profile.city) {
    missing.push('Adresse de l\'émetteur incomplète');
  }
  if (!profile.vat_number) missing.push('Numéro TVA émetteur manquant');
  if (!validateVatFormat(profile.vat_number, countryCode)) {
    missing.push(`Format TVA émetteur invalide pour ${countryCode}`);
  }

  // Client
  if (!client.name) missing.push('Nom du client manquant');
  if (client.is_company && !client.vat_number) {
    warnings.push('Numéro TVA client absent — obligatoire pour B2B assujetti');
  }

  // Lignes
  if (!invoice.items || invoice.items.length === 0) {
    missing.push('Aucune ligne de facture');
  }
  invoice.items.forEach((item, idx) => {
    if (!item.description || item.description.trim().length < 3) {
      missing.push(`Description ligne ${idx + 1} insuffisante`);
    }
  });

  // ── Mentions spéciales ─────────────────────────────────────────────

  // TVA 0% intracommunautaire
  const hasZeroVat = invoice.items.some(i => i.vat_rate === 0);
  if (hasZeroVat && !invoice.legal_mentions?.includes('39bis')) {
    warnings.push('TVA 0% détectée — vérifier la mention légale d\'exonération');
  }

  // ── Spécificités France ────────────────────────────────────────────

  if (countryCode === 'FR') {
    if (!profile.siret) missing.push('SIRET manquant (obligatoire en France)');
    if (!profile.legal_form) warnings.push('Forme juridique recommandée sur factures françaises');
    if (!invoice.late_payment_penalty) {
      warnings.push('Taux de pénalités de retard manquant (obligatoire en France)');
    }
    if (!invoice.recovery_indemnity) {
      warnings.push('Indemnité forfaitaire de recouvrement manquante (obligatoire en France)');
    }
  }

  return {
    valid: missing.length === 0,
    missingFields: missing,
    warnings,
  };
}

// Validation format TVA
function validateVatFormat(vatNumber: string, country: 'BE' | 'FR'): boolean {
  const patterns = {
    BE: /^BE0[0-9]{9}$/,
    FR: /^FR[A-Z0-9]{2}[0-9]{9}$/,
  };
  return patterns[country].test(vatNumber?.replace(/\s/g, '') ?? '');
}
```

## 1.5 Templates de mentions légales par cas

```typescript
// src/lib/legalMentionsTemplates.ts

export const LEGAL_MENTIONS = {
  BE: {
    // Pied de page standard
    standard: (profile: BusinessProfile) =>
      `${profile.company_name} · TVA ${profile.vat_number} · ${profile.street}, ${profile.zip_code} ${profile.city}`,

    // Conditions de paiement par défaut
    payment_terms: 'Payable dans les 30 jours suivant la date de facturation.',

    // Pénalités de retard (recommandé en BE, obligatoire en FR)
    late_payment:
      'En cas de retard de paiement, des intérêts de retard au taux légal seront appliqués, ' +
      'majorés d\'une indemnité forfaitaire de 40€ pour frais de recouvrement.',

    // TVA 0% intracommunautaire
    vat_zero_intracom:
      'Opération exonérée de TVA en application de l\'article 39bis du Code TVA belge. ' +
      'TVA due par le preneur assujetti.',

    // Autoliquidation
    reverse_charge:
      'Autoliquidation — TVA due par le cocontractant (Art. 51 § 2 CTVA).',

    // Franchise TVA
    vat_exempt:
      'Régime de franchise de la taxe en vertu de l\'article 56bis du CTVA. ' +
      'TVA non applicable.',
  },

  FR: {
    standard: (profile: BusinessProfile) =>
      `${profile.company_name} · ${profile.legal_form} · Capital ${profile.capital}€ · ` +
      `SIRET ${profile.siret} · RCS ${profile.rcs_city} · TVA ${profile.vat_number}`,

    payment_terms: 'Payable à réception. Escompte pour paiement anticipé : néant.',

    late_payment:
      'En cas de retard de paiement : pénalités au taux BCE majoré de 10 points, ' +
      'exigibles le jour suivant la date d\'échéance, ' +
      'plus indemnité forfaitaire de recouvrement de 40€ (D. 2012-1115).',
  },
};
```

---

# SECTION 2 — STRIPE : ABONNEMENTS & ENFORCEMENT DES PLANS

---

## 2.1 Architecture Stripe pour InvoiceAI

```
Utilisateur                  Frontend              Supabase              Stripe
────────────                 ────────              ────────              ──────
Choisit un plan         →    /pricing
Clique "S'abonner"      →    checkout session  →   Edge Function    →    Stripe Checkout
Paye                                                                 ←    Webhook: checkout.completed
                                                    Update profiles       
                                                    (plan, stripe_id)
Utilise le produit      →    Vérif plan         ←  profiles.plan
Annule                                                               ←    Webhook: subscription.deleted
                                                    Update profiles
                                                    (plan = 'free')
```

## 2.2 Schema Supabase — Champs Stripe

```sql
-- Ajout des champs Stripe dans profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  stripe_customer_id TEXT UNIQUE,          -- cus_xxx
  stripe_subscription_id TEXT UNIQUE,      -- sub_xxx
  stripe_price_id TEXT,                    -- price_xxx (plan actuel)
  plan TEXT DEFAULT 'free'                 -- 'free' | 'starter' | 'pro' | 'business'
    CHECK (plan IN ('free', 'starter', 'pro', 'business')),
  plan_expires_at TIMESTAMPTZ,             -- NULL = actif, date = expiré
  invoices_count_this_month INTEGER DEFAULT 0,  -- compteur mensuel
  invoices_count_reset_at TIMESTAMPTZ;     -- date du prochain reset

-- Reset mensuel du compteur via pg_cron
SELECT cron.schedule(
  'reset-invoice-counters',
  '0 0 1 * *',  -- 1er de chaque mois à minuit
  $$UPDATE profiles SET invoices_count_this_month = 0,
    invoices_count_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'$$
);
```

## 2.3 Limites par plan — Source de vérité

```typescript
// src/lib/planLimits.ts — Source de vérité unique pour les limites

export const PLAN_LIMITS = {
  free: {
    invoices_per_month: 3,
    ai_generation: true,          // basique
    peppol_send: false,           // pas d'envoi Peppol sur Free
    multi_company: false,         // 1 entreprise max
    pdf_download: true,
    price_eur: 0,
  },
  starter: {
    invoices_per_month: 20,
    ai_generation: true,
    peppol_send: true,
    multi_company: false,
    pdf_download: true,
    price_eur: 9,
  },
  pro: {
    invoices_per_month: Infinity,
    ai_generation: true,          // avancée
    peppol_send: true,
    multi_company: true,          // jusqu'à 3 entreprises
    pdf_download: true,
    price_eur: 19,
  },
  business: {
    invoices_per_month: Infinity,
    ai_generation: true,          // premium
    peppol_send: true,
    multi_company: true,          // illimité
    pdf_download: true,
    price_eur: 39,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

// Vérification avant chaque action — appelée dans les Edge Functions
export function canPerformAction(
  plan: Plan,
  action: 'create_invoice' | 'send_peppol' | 'add_company' | 'ai_generate',
  currentMonthCount?: number
): { allowed: boolean; reason?: string } {
  const limits = PLAN_LIMITS[plan];

  switch (action) {
    case 'create_invoice':
      if (
        limits.invoices_per_month !== Infinity &&
        (currentMonthCount ?? 0) >= limits.invoices_per_month
      ) {
        return {
          allowed: false,
          reason: `Limite de ${limits.invoices_per_month} factures/mois atteinte. Passez au plan supérieur.`,
        };
      }
      return { allowed: true };

    case 'send_peppol':
      if (!limits.peppol_send) {
        return {
          allowed: false,
          reason: 'L\'envoi Peppol nécessite le plan Starter ou supérieur.',
        };
      }
      return { allowed: true };

    case 'add_company':
      if (!limits.multi_company) {
        return {
          allowed: false,
          reason: 'Le multi-entreprises nécessite le plan Pro ou supérieur.',
        };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
}
```

## 2.4 Edge Function — Webhook Stripe

```typescript
// supabase/functions/stripe-webhook/index.ts

import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

// Mapping Stripe Price ID → Plan InvoiceAI
const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_STARTER')!]: 'starter',
  [Deno.env.get('STRIPE_PRICE_PRO')!]: 'pro',
  [Deno.env.get('STRIPE_PRICE_BUSINESS')!]: 'business',
};

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  // 1. Vérification signature Stripe — CRITIQUE
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

  const supabase = createServiceClient();

  switch (event.type) {

    // Abonnement créé ou mis à jour
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const plan = PRICE_TO_PLAN[priceId] ?? 'free';

      await supabase.from('profiles')
        .update({
          plan,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          plan_expires_at: null, // actif
        })
        .eq('stripe_customer_id', sub.customer);

      await logAction(supabase, sub.customer as string, 'subscription.updated', 'plan', sub.id, { plan });
      break;
    }

    // Abonnement annulé ou expiré
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;

      await supabase.from('profiles')
        .update({
          plan: 'free',
          stripe_subscription_id: null,
          plan_expires_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', sub.customer);
      break;
    }

    // Paiement échoué — downgrade après délai de grâce
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      // Stripe gère les retries automatiquement
      // On envoie juste une notification à l'utilisateur
      await enqueueJob(supabase, {
        userId: inv.customer as string,
        invoiceId: '',
        jobType: 'send_email',
        payload: {
          template: 'payment_failed',
          customer_id: inv.customer,
        },
      });
      break;
    }

    // Nouveau client créé dans Stripe — liaison avec le profil
    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer;
      if (customer.email) {
        await supabase.from('profiles')
          .update({ stripe_customer_id: customer.id })
          .eq('id', customer.metadata?.supabase_user_id);
      }
      break;
    }
  }

  return new Response('ok', { status: 200 });
});
```

## 2.5 Enforcement côté Edge Function — Avant chaque opération

```typescript
// supabase/functions/_shared/planEnforcement.ts

export async function enforcePlanLimit(
  supabase: SupabaseClient,
  userId: string,
  action: 'create_invoice' | 'send_peppol' | 'add_company'
): Promise<void> {

  // Récupérer le plan et les compteurs actuels
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, invoices_count_this_month, plan_expires_at')
    .eq('id', userId)
    .single();

  if (!profile) throw new Response('Profile not found', { status: 404 });

  // Vérifier si le plan est expiré
  if (profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()) {
    await supabase.from('profiles')
      .update({ plan: 'free' })
      .eq('id', userId);
    profile.plan = 'free';
  }

  // Vérifier la limite
  const check = canPerformAction(
    profile.plan as Plan,
    action,
    profile.invoices_count_this_month
  );

  if (!check.allowed) {
    throw new Response(
      JSON.stringify({ error: 'plan_limit_exceeded', message: check.reason }),
      { status: 402 } // 402 Payment Required
    );
  }

  // Incrémenter le compteur si nécessaire
  if (action === 'create_invoice') {
    await supabase.from('profiles')
      .update({
        invoices_count_this_month: (profile.invoices_count_this_month ?? 0) + 1
      })
      .eq('id', userId);
  }
}
```

## 2.6 Flux de checkout — Création session Stripe

```typescript
// supabase/functions/create-checkout/index.ts

Deno.serve(async (req) => {
  const user = await getAuthenticatedUser(req);
  const { priceId, successUrl, cancelUrl } = await req.json();

  // Vérifier que le priceId est dans la whitelist
  const allowedPrices = [
    Deno.env.get('STRIPE_PRICE_STARTER')!,
    Deno.env.get('STRIPE_PRICE_PRO')!,
    Deno.env.get('STRIPE_PRICE_BUSINESS')!,
  ];
  if (!allowedPrices.includes(priceId)) {
    return new Response('Invalid price', { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: profile?.stripe_customer_id || undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { supabase_user_id: user.id },
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    // Facturation conforme RGPD — collecte des infos fiscales
    tax_id_collection: { enabled: true },
    customer_update: { address: 'auto', name: 'auto' },
  });

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
});
```

---

# SECTION 3 — BACKUP, DISASTER RECOVERY & SLA

---

## 3.1 SLA des composants tiers

| Service | SLA annoncé | Uptime cible | Statut page |
|---|---|---|---|
| Supabase (Pro plan) | 99.9% | 8.7h downtime/an max | status.supabase.com |
| Vercel Pro | 99.99% | 52min downtime/an max | vercel-status.com |
| Anthropic Claude API | Non garanti publiquement | Best effort | status.anthropic.com |
| Stripe | 99.9%+ | Historique > 99.99% | status.stripe.com |
| Billit | Non publié | À négocier dans le contrat | — |
| Resend | 99.9% | — | resend-status.com |

> ⚠️ **Claude API** n'a pas de SLA contractuel public. Le circuit breaker + mode dégradé manuel est la seule mitigation.

## 3.2 Objectifs RTO / RPO pour InvoiceAI

| Métrique | Définition | Objectif V1 | Objectif V2 |
|---|---|---|---|
| **RPO** (Recovery Point Objective) | Perte de données maximale acceptable | 24h | 1h |
| **RTO** (Recovery Time Objective) | Temps maximal de restauration du service | 4h | 1h |

> Justification RPO 24h en V1 : Supabase Pro inclut des backups quotidiens. Acceptable pour un MVP. Passer à PITR (Point-in-Time Recovery) pour le RPO 1h en V2.

## 3.3 Stratégie de backup Supabase

### Backups automatiques (inclus dans Supabase Pro)

| Type | Fréquence | Rétention | Activation |
|---|---|---|---|
| Daily backup | Quotidien à 00h00 UTC | 7 jours | Automatique sur Pro |
| Point-in-Time Recovery | Continu (WAL) | 7 jours | Pro plan → activer dans Dashboard |
| Manual backup | À la demande | Manuel | `supabase db dump` |

```bash
# Backup manuel avant chaque déploiement majeur
supabase db dump --db-url $SUPABASE_DB_URL > backup_$(date +%Y%m%d_%H%M).sql

# Stocker dans un bucket S3 externe (hors Supabase)
aws s3 cp backup_*.sql s3://invoiceai-backups/$(date +%Y/%m/)/
```

### Backup externe automatisé (recommandé)

```typescript
// supabase/functions/backup-export/index.ts
// À planifier via pg_cron — exécution quotidienne

Deno.serve(async () => {
  const supabase = createServiceClient();

  // Export des tables critiques en JSON
  const tables = ['invoices', 'invoice_items', 'clients', 'business_profiles'];

  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    // Uploader vers Supabase Storage (bucket privé dédié aux backups)
    const filename = `${table}_${new Date().toISOString().split('T')[0]}.json`;
    await supabase.storage
      .from('backups')                     // bucket privé, jamais public
      .upload(filename, JSON.stringify(data), {
        contentType: 'application/json',
        upsert: true,
      });
  }

  // Nettoyer les backups > 30 jours
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data: files } = await supabase.storage.from('backups').list();
  for (const file of files ?? []) {
    if (new Date(file.created_at) < thirtyDaysAgo) {
      await supabase.storage.from('backups').remove([file.name]);
    }
  }
});
```

## 3.4 Procédure de Disaster Recovery

### Scénario 1 — Corruption ou suppression accidentelle de données

```bash
# 1. Identifier le point de restauration (Supabase Dashboard → Backups)
# 2. Restaurer via PITR (Point-in-Time Recovery)
#    Dashboard → Settings → Backups → Restore to point in time

# 3. Si PITR indisponible : restaurer depuis le dernier dump quotidien
supabase db reset --db-url $SUPABASE_DB_URL
psql $SUPABASE_DB_URL < backup_YYYYMMDD.sql

# 4. Vérifier l'intégrité des données critiques
psql $SUPABASE_DB_URL -c "
  SELECT
    COUNT(*) as total_invoices,
    SUM(total) as total_revenue,
    MAX(created_at) as latest_invoice
  FROM invoices
  WHERE status NOT IN ('draft', 'cancelled');
"

# 5. Notifier les utilisateurs si perte de données confirmée (RGPD : 72h)
```

### Scénario 2 — Supabase complètement indisponible

```
DURÉE 0-30 min
├─ Vérifier status.supabase.com
├─ Activer la page de maintenance sur Vercel
├─ Notifier via status page InvoiceAI

DURÉE 30min-4h
├─ Les brouillons locaux (localStorage) permettent de continuer à rédiger
├─ Les PDF déjà générés sont accessibles depuis le cache navigateur
├─ Aucune nouvelle facture ne peut être émise (acceptable)

DURÉE > 4h (RTO dépassé)
├─ Contacter le support Supabase (Pro = support prioritaire)
├─ Évaluer migration vers instance de secours
├─ Communication proactive aux utilisateurs
```

### Scénario 3 — Vercel indisponible

```bash
# Déploiement de secours sur Netlify (build Vite identique)
# Les variables d'environnement doivent être pré-configurées dans Netlify

# Le domaine DNS doit pointer vers Netlify en cas de bascule
# TTL DNS : configurer à 300s (5min) pour une bascule rapide
```

## 3.5 Checklist de test DR (à effectuer trimestriellement)

```markdown
## Test DR — [Date]

- [ ] Backup quotidien Supabase vérifié (Dashboard → Backups)
- [ ] Restauration test sur environnement de staging
- [ ] Vérification intégrité des données restaurées
- [ ] Test du backup externe (Storage bucket)
- [ ] Simulation coupure Claude API → vérifier mode dégradé
- [ ] Simulation timeout Billit → vérifier queue + retry
- [ ] Vérification que les URLs de status pages sont bookmarkées
- [ ] Vérification des contacts d'escalade (Supabase support, etc.)

Résultat : ✅ / ❌
RTO mesuré : ___ minutes
RPO mesuré : ___ heures
Actions correctives : ___
```

---

# SECTION 4 — UBL/PEPPOL : CHAMPS REQUIS & FORMAT BILLIT

---

## 4.1 Standard applicable

InvoiceAI cible la norme **EN 16931** (norme européenne de facturation électronique), profil **PEPPOL BIS Billing 3.0**, format **UBL 2.1 XML**.

La validation Peppol exige le respect strict de cette structure. Une facture UBL mal formée est **rejetée silencieusement** par le réseau Peppol — sans notification à l'émetteur dans certains cas.

## 4.2 Mapping complet — Supabase → UBL 2.1

```typescript
// src/lib/ublMapper.ts

export function invoiceToUBL(
  invoice: VerifiedInvoice,
  profile: BusinessProfile,
  client: Client
): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

  <!-- ── EN-TÊTE ─────────────────────────────────────────────────── -->

  <!-- [BT-24] Profil Peppol — obligatoire -->
  <cbc:CustomizationID>
    urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0
  </cbc:CustomizationID>

  <!-- [BT-23] Process — obligatoire -->
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>

  <!-- [BT-1] Numéro de facture — obligatoire, unique -->
  <cbc:ID>${escapeXml(invoice.invoice_number)}</cbc:ID>

  <!-- [BT-2] Date d'émission — obligatoire, format YYYY-MM-DD -->
  <cbc:IssueDate>${formatDate(invoice.issue_date)}</cbc:IssueDate>

  <!-- [BT-9] Date d'échéance -->
  <cbc:DueDate>${formatDate(invoice.due_date)}</cbc:DueDate>

  <!-- [BT-3] Type de document — 380 = facture commerciale standard -->
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>

  <!-- [BT-22] Note libre (optionnel) -->
  ${invoice.notes ? `<cbc:Note>${escapeXml(invoice.notes)}</cbc:Note>` : ''}

  <!-- [BT-5] Devise — obligatoire -->
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>

  <!-- [BT-19] Référence acheteur (optionnel) -->
  ${invoice.client_po_number
    ? `<cbc:BuyerReference>${escapeXml(invoice.client_po_number)}</cbc:BuyerReference>`
    : '<cbc:BuyerReference>N/A</cbc:BuyerReference>'}

  <!-- ── VENDEUR (ÉMETTEUR) ───────────────────────────────────────── -->

  <cac:AccountingSupplierParty>
    <cac:Party>

      <!-- [BT-29] Identifiant électronique Peppol du vendeur -->
      <cbc:EndpointID schemeID="0208">
        ${profile.vat_number.replace('BE', '')}
      </cbc:EndpointID>

      <cac:PartyName>
        <!-- [BT-27] Nom du vendeur — obligatoire -->
        <cbc:Name>${escapeXml(profile.company_name)}</cbc:Name>
      </cac:PartyName>

      <cac:PostalAddress>
        <!-- [BT-35] Rue -->
        <cbc:StreetName>${escapeXml(profile.street)}</cbc:StreetName>
        <!-- [BT-37] Ville -->
        <cbc:CityName>${escapeXml(profile.city)}</cbc:CityName>
        <!-- [BT-38] Code postal -->
        <cbc:PostalZone>${escapeXml(profile.zip_code)}</cbc:PostalZone>
        <!-- [BT-40] Pays — obligatoire, code ISO 3166-1 alpha-2 -->
        <cac:Country>
          <cbc:IdentificationCode>${profile.country_code}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>

      <cac:PartyTaxScheme>
        <!-- [BT-31] Numéro TVA du vendeur — obligatoire -->
        <cbc:CompanyID>${escapeXml(profile.vat_number)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>

      <cac:PartyLegalEntity>
        <!-- [BT-27] Raison sociale légale -->
        <cbc:RegistrationName>${escapeXml(profile.company_name)}</cbc:RegistrationName>
        <!-- [BT-30] Numéro d'enregistrement légal -->
        <cbc:CompanyID>${escapeXml(profile.vat_number)}</cbc:CompanyID>
      </cac:PartyLegalEntity>

      <cac:Contact>
        <cbc:ElectronicMail>${escapeXml(profile.email)}</cbc:ElectronicMail>
      </cac:Contact>

    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- ── ACHETEUR (CLIENT) ────────────────────────────────────────── -->

  <cac:AccountingCustomerParty>
    <cac:Party>

      <!-- [BT-49] Identifiant électronique Peppol de l'acheteur (si connu) -->
      ${client.peppol_id
        ? `<cbc:EndpointID schemeID="0208">${client.peppol_id}</cbc:EndpointID>`
        : `<cbc:EndpointID schemeID="0088">${client.vat_number?.replace('BE', '') ?? ''}</cbc:EndpointID>`}

      <cac:PartyName>
        <!-- [BT-44] Nom de l'acheteur — obligatoire -->
        <cbc:Name>${escapeXml(client.name)}</cbc:Name>
      </cac:PartyName>

      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(client.street ?? '')}</cbc:StreetName>
        <cbc:CityName>${escapeXml(client.city ?? '')}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(client.zip_code ?? '')}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${client.country_code ?? 'BE'}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>

      ${client.vat_number ? `
      <cac:PartyTaxScheme>
        <!-- [BT-48] Numéro TVA de l'acheteur -->
        <cbc:CompanyID>${escapeXml(client.vat_number)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}

      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(client.company ?? client.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>

    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- ── PAIEMENT ─────────────────────────────────────────────────── -->

  <cac:PaymentMeans>
    <!-- [BT-81] Code moyen de paiement — 58 = virement SEPA -->
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <!-- [BT-84] IBAN -->
      <cbc:ID>${escapeXml(profile.iban)}</cbc:ID>
      <!-- [BT-86] Nom du compte -->
      <cac:FinancialInstitutionBranch>
        <cbc:ID>${profile.bic ?? ''}</cbc:ID>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>

  <!-- ── TVA ──────────────────────────────────────────────────────── -->

  ${generateVatBreakdown(invoice)}

  <!-- ── TOTAUX ────────────────────────────────────────────────────── -->

  <cac:LegalMonetaryTotal>
    <!-- [BT-106] Total HT -->
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">
      ${invoice.subtotal.toFixed(2)}
    </cbc:LineExtensionAmount>
    <!-- [BT-109] Base d'imposition (= HT pour cas standard) -->
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">
      ${invoice.subtotal.toFixed(2)}
    </cbc:TaxExclusiveAmount>
    <!-- [BT-112] Total TTC -->
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">
      ${invoice.total.toFixed(2)}
    </cbc:TaxInclusiveAmount>
    <!-- [BT-115] Montant dû -->
    <cbc:PayableAmount currencyID="${invoice.currency}">
      ${invoice.total.toFixed(2)}
    </cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- ── LIGNES ────────────────────────────────────────────────────── -->

  ${invoice.items.map((item, idx) => generateInvoiceLine(item, idx + 1, invoice.currency)).join('\n')}

</Invoice>`;

  return xml;
}

// Génération d'une ligne de facture UBL
function generateInvoiceLine(item: InvoiceItem, lineNum: number, currency: string): string {
  return `
  <cac:InvoiceLine>
    <!-- [BT-126] Identifiant de ligne -->
    <cbc:ID>${lineNum}</cbc:ID>
    <!-- [BT-129] Quantité facturée -->
    <cbc:InvoicedQuantity unitCode="DAY">${item.quantity}</cbc:InvoicedQuantity>
    <!-- [BT-131] Montant HT de la ligne -->
    <cbc:LineExtensionAmount currencyID="${currency}">
      ${item.line_total_ht.toFixed(2)}
    </cbc:LineExtensionAmount>

    <cac:Item>
      <!-- [BT-153] Description de l'article/service -->
      <cbc:Description>${escapeXml(item.description)}</cbc:Description>
      <cbc:Name>${escapeXml(item.description.substring(0, 100))}</cbc:Name>

      <cac:ClassifiedTaxCategory>
        <!-- [BT-152] Catégorie TVA — S=standard, Z=zéro, E=exonéré -->
        <cbc:ID>${item.vat_rate > 0 ? 'S' : 'Z'}</cbc:ID>
        <cbc:Percent>${(item.vat_rate * 100).toFixed(0)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>

    <cac:Price>
      <!-- [BT-146] Prix unitaire HT -->
      <cbc:PriceAmount currencyID="${currency}">
        ${item.unit_price.toFixed(2)}
      </cbc:PriceAmount>
    </cac:Price>

  </cac:InvoiceLine>`;
}

// Ventilation TVA (regroupée par taux)
function generateVatBreakdown(invoice: VerifiedInvoice): string {
  const vatGroups = invoice.items.reduce((groups, item) => {
    const key = item.vat_rate.toString();
    if (!groups[key]) groups[key] = { base: 0, vat: 0, rate: item.vat_rate };
    groups[key].base += item.line_total_ht;
    groups[key].vat += item.line_vat;
    return groups;
  }, {} as Record<string, { base: number; vat: number; rate: number }>);

  return Object.values(vatGroups).map(group => `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.vat_amount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${group.base.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${group.vat.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${group.rate > 0 ? 'S' : 'Z'}</cbc:ID>
        <cbc:Percent>${(group.rate * 100).toFixed(0)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`).join('\n');
}

// Helpers
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: string | Date): string {
  return new Date(date).toISOString().split('T')[0];
}
```

## 4.3 Intégration API Billit — Edge Function

```typescript
// supabase/functions/send-peppol/index.ts

Deno.serve(async (req) => {
  const user = await getAuthenticatedUser(req);
  const { invoiceId } = await req.json();
  const supabase = createServiceClient();

  // 1. Récupérer la facture + profil + client
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`*, clients(*), business_profiles(*)`)
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single();

  if (!invoice) return new Response('Not found', { status: 404 });
  if (invoice.status !== 'draft') {
    return new Response('Invoice already sent', { status: 409 });
  }

  // 2. Générer l'UBL XML
  const ublXml = invoiceToUBL(invoice, invoice.business_profiles, invoice.clients);

  // 3. Valider l'UBL avant envoi (validation locale)
  const validationResult = validateUBLRequiredFields(invoice);
  if (!validationResult.valid) {
    return new Response(
      JSON.stringify({ error: 'UBL_VALIDATION_FAILED', fields: validationResult.missing }),
      { status: 422 }
    );
  }

  // 4. Envoi à Billit
  const billitResponse = await fetch(
    `${Deno.env.get('BILLIT_API_URL')}/v2/documents`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BILLIT_API_KEY')}`,
        'Content-Type': 'application/xml',
        'X-Peppol-Sender-ID': invoice.business_profiles.vat_number.replace('BE', ''),
        'X-Peppol-Receiver-ID': invoice.clients.vat_number?.replace('BE', '') ?? '',
      },
      body: ublXml,
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!billitResponse.ok) {
    const error = await billitResponse.text();
    // Mise en queue pour retry
    await enqueueJob(supabase, {
      userId: user.id,
      invoiceId,
      jobType: 'send_peppol',
      payload: { ubl_xml: ublXml, error },
    });
    return new Response(
      JSON.stringify({ status: 'queued', message: 'Envoi Peppol programmé' }),
      { status: 202 }
    );
  }

  const billitData = await billitResponse.json();

  // 5. Mise à jour du statut
  await supabase.from('invoices').update({
    status: 'sent',
    peppol_sent_at: new Date().toISOString(),
    peppol_document_id: billitData.documentId,
  }).eq('id', invoiceId);

  // 6. Logger l'action
  await logAction(supabase, user.id, 'invoice.sent_peppol', 'invoice', invoiceId, {
    billit_document_id: billitData.documentId,
    recipient_vat: invoice.clients.vat_number,
  });

  return new Response(JSON.stringify({ success: true, peppol_id: billitData.documentId }));
});
```

## 4.4 Champs UBL obligatoires — Checklist de validation

```typescript
// src/lib/ublValidator.ts

export function validateUBLRequiredFields(invoice: any): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  // Champs BT (Business Terms) obligatoires selon EN 16931
  const checks: [string, boolean][] = [
    ['BT-1 Invoice number',     !!invoice.invoice_number],
    ['BT-2 Issue date',         !!invoice.issue_date],
    ['BT-3 Invoice type code',  true], // toujours 380
    ['BT-5 Currency',           invoice.currency === 'EUR'],
    ['BT-27 Seller name',       !!invoice.issuer_company_name],
    ['BT-31 Seller VAT',        !!invoice.issuer_vat_number],
    ['BT-35 Seller street',     !!invoice.issuer_street],
    ['BT-37 Seller city',       !!invoice.issuer_city],
    ['BT-38 Seller postal',     !!invoice.issuer_zip_code],
    ['BT-40 Seller country',    !!invoice.issuer_country_code],
    ['BT-44 Buyer name',        !!invoice.clients?.name],
    ['BT-84 IBAN',              !!invoice.issuer_iban],
    ['BT-106 Line total',       invoice.subtotal > 0],
    ['BT-112 Total incl VAT',   invoice.total > 0],
    ['BT-115 Amount due',       invoice.total > 0],
    ['BT-126 Line ID',          invoice.invoice_items?.length > 0],
    ['BT-153 Item description', invoice.invoice_items?.every((i: any) => !!i.description)],
  ];

  for (const [field, condition] of checks) {
    if (!condition) missing.push(field);
  }

  return { valid: missing.length === 0, missing };
}
```

## 4.5 Test en sandbox Billit

```typescript
// Configuration environnements
const BILLIT_CONFIG = {
  sandbox: {
    url: 'https://api-sandbox.billit.be',
    // Utiliser les credentials sandbox fournis lors de l'inscription Billit
  },
  production: {
    url: 'https://api.billit.be',
  },
};

// Numéros de TVA de test Billit (sandbox)
const BILLIT_TEST_RECEIVERS = {
  success: 'BE0123456789',    // Toujours accepté en sandbox
  failure: 'BE9999999999',    // Simule un rejet Peppol
};
```

---

## Récapitulatif — Ce qui change dans le code

| Document | Action immédiate requise |
|---|---|
| **Mentions légales** | Ajouter `validateLegalMentions()` dans le `Financial Integrity Engine` avant émission |
| **Stripe** | Créer la table avec les champs `stripe_*` + implémenter le webhook + `enforcePlanLimit()` dans chaque Edge Function |
| **Backup/DR** | Activer PITR dans Supabase Dashboard (Pro) + créer le bucket `backups` + planifier la Edge Function de backup quotidien |
| **UBL/Peppol** | Implémenter `ublMapper.ts` + `validateUBLRequiredFields()` + tester avec les credentials sandbox Billit |

---

*Business Project Flow · InvoiceAI · Documentation Complémentaire · Version 1.0 · 16 mars 2026*
