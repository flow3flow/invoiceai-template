# InvoiceAI — Architecture de Référence & Guide d'Implémentation
> Complément au Document Consolidé V1 · Business Project Flow · 16 mars 2026  
> Stack : React / TypeScript / Supabase / Claude API / Vercel  
> Doctrine : **l'IA propose, le moteur décide, l'humain valide**

---

## Préambule

Ce document traduit le document de référence consolidé en **décisions techniques concrètes et code implémentable**. Il répond aux questions restantes identifiées en section 19 et comble les zones non couvertes par les documents Sécurité, Risques IA et Enterprise-Grade déjà produits.

---

# PARTIE 1 — DÉCISIONS ARCHITECTURALES TRANCHÉES

---

## 1.1 Segment cible V1 — Décision produit

**Décision retenue : Freelance IT belge**

| Critère | Freelance IT | Consultant | Créatif | Artisan |
|---|---|---|---|---|
| TVA 21% standard (cas simple) | ✅ Oui | ✅ Oui | 🟡 Variable | 🟡 Taux réduits |
| Peppol B2B urgent | ✅ Très exposé | ✅ Exposé | 🟡 Partiel | 🟡 Partiel |
| Factures récurrentes | ✅ Oui | ✅ Oui | 🟡 Projet | 🟡 Ponctuel |
| Litératie numérique | ✅ Élevée | ✅ Élevée | 🟡 Moyenne | 🔴 Faible |
| Taille du marché BE | 180 000 | 95 000 | 60 000 | 140 000 |

**Justification** : Le freelance IT est le segment où la promesse "2 minutes, conforme, IA" est la plus crédible, le moins d'exceptions TVA, et la plus forte pression Peppol.

**Cas TVA supportés en V1 (périmètre explicite)**

```typescript
// src/lib/vatRules.ts — Source de vérité déterministe

export const VAT_RULES_V1 = {
  BE: {
    standard: 0.21,      // ✅ supporté — conseil, IT, développement
    reduced: 0.06,       // ⚠️  hors périmètre V1 (alimentation, livres)
    intermediate: 0.12,  // ⚠️  hors périmètre V1 (restauration)
    zero_intracom: 0.00, // ✅ supporté — B2B intracommunautaire (UE)
    zero_export: 0.00,   // ⚠️  hors périmètre V1 (export hors UE)
  },
  FR: {
    standard: 0.20,      // ✅ supporté — phase 2
    reduced: 0.055,      // ⚠️  hors périmètre V2
    intermediate: 0.10,  // ⚠️  hors périmètre V2
    zero: 0.00,          // ✅ supporté — intracommunautaire
  },
} as const;

// Message affiché à l'utilisateur si cas hors périmètre détecté
export const OUT_OF_SCOPE_MESSAGE = `
  Ce taux de TVA n'est pas géré automatiquement par InvoiceAI en version actuelle.
  Veuillez saisir le taux manuellement et vérifier avec votre comptable.
`;
```

---

## 1.2 Synchrone vs Asynchrone — Découpage définitif

```
SYNCHRONE (réponse immédiate à l'utilisateur)         ASYNCHRONE (arrière-plan)
─────────────────────────────────────────────         ────────────────────────
✅ Appel Claude API (génération brouillon)            ✅ Génération PDF final
✅ Validation Zod + métier                            ✅ Envoi Peppol (Billit)
✅ Calcul Financial Integrity Engine                  ✅ Emails transactionnels (Resend)
✅ Affichage brouillon pour relecture                 ✅ Validation TVA VIES
✅ Sauvegarde brouillon en DB                        ✅ Webhooks Stripe
✅ Confirmation de réception du paiement             ✅ Notifications push
                                                      ✅ Export comptable CSV
```

**Règle de découpage** : tout ce qui touche à une dépendance externe avec latence variable (Billit, Resend, VIES) passe en asynchrone. L'utilisateur ne doit jamais attendre Peppol pour voir sa facture confirmée.

---

## 1.3 Queue — Choix et implémentation

**Décision** : Supabase `pg_net` + table de jobs maison pour la V1 — pas de Vercel Queues ni Kafka.

**Justification** : Vercel Queues est en bêta avec sémantique `at-least-once` (risque de double envoi Peppol sans idempotence parfaite). Pour la V1, une table de jobs PostgreSQL est plus prévisible, plus simple à auditer, et suffisante au volume anticipé.

```sql
-- Migration : table de jobs asynchrones
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'done', 'failed', 'dead');
CREATE TYPE job_type AS ENUM ('generate_pdf', 'send_peppol', 'send_email', 'validate_vat', 'export_csv');

CREATE TABLE async_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  invoice_id UUID REFERENCES invoices(id),

  -- Type et payload
  job_type job_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',

  -- Idempotence — clé unique pour éviter le double traitement
  idempotency_key TEXT UNIQUE NOT NULL,

  -- État
  status job_status DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,

  -- Scheduling
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour le polling efficace
CREATE INDEX idx_jobs_pending ON async_jobs(status, scheduled_at)
WHERE status IN ('pending', 'failed') AND attempts < max_attempts;

CREATE INDEX idx_jobs_user ON async_jobs(user_id, created_at DESC);

-- RLS
ALTER TABLE async_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_jobs" ON async_jobs FOR SELECT
USING (auth.uid() = user_id);
-- Les insertions et mises à jour passent par service role uniquement
```

```typescript
// src/lib/jobQueue.ts — Client de la queue

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function enqueueJob(
  serviceClient: SupabaseClient,
  params: {
    userId: string;
    invoiceId: string;
    jobType: 'generate_pdf' | 'send_peppol' | 'send_email' | 'validate_vat';
    payload: Record<string, unknown>;
    delaySeconds?: number;
  }
): Promise<string> {

  // Clé d'idempotence : userId + invoiceId + jobType → même job ne peut être créé deux fois
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${params.userId}:${params.invoiceId}:${params.jobType}`)
    .digest('hex');

  const scheduledAt = params.delaySeconds
    ? new Date(Date.now() + params.delaySeconds * 1000).toISOString()
    : new Date().toISOString();

  const { data, error } = await serviceClient
    .from('async_jobs')
    .upsert(
      {
        user_id: params.userId,
        invoice_id: params.invoiceId,
        job_type: params.jobType,
        payload: params.payload,
        idempotency_key: idempotencyKey,
        scheduled_at: scheduledAt,
        status: 'pending',
      },
      {
        onConflict: 'idempotency_key',
        ignoreDuplicates: true, // Si le job existe déjà, on ignore silencieusement
      }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
```

```typescript
// supabase/functions/job-worker/index.ts — Worker générique

Deno.serve(async (req) => {
  const supabase = createServiceClient();

  // Prendre le prochain job disponible (atomic select + update)
  const { data: job } = await supabase.rpc('claim_next_job');
  if (!job) return new Response('no_jobs', { status: 200 });

  try {
    switch (job.job_type) {
      case 'generate_pdf':
        await handleGeneratePdf(job, supabase);
        break;
      case 'send_peppol':
        await handleSendPeppol(job, supabase);
        break;
      case 'send_email':
        await handleSendEmail(job, supabase);
        break;
      case 'validate_vat':
        await handleValidateVat(job, supabase);
        break;
    }

    await supabase.from('async_jobs')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', job.id);

  } catch (error) {
    await handleJobFailure(job, error, supabase);
  }
});
```

```sql
-- Fonction atomique pour "claim" un job sans race condition
CREATE OR REPLACE FUNCTION claim_next_job()
RETURNS async_jobs
LANGUAGE sql
AS $$
  UPDATE async_jobs
  SET
    status = 'processing',
    started_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM async_jobs
    WHERE status IN ('pending', 'failed')
    AND attempts < max_attempts
    AND scheduled_at <= NOW()
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY scheduled_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED  -- Évite les race conditions avec plusieurs workers
  )
  RETURNING *;
$$;
```

---

# PARTIE 2 — RÉSILIENCE & MODES DÉGRADÉS

---

## 2.1 Circuit Breaker — Claude API

```typescript
// src/lib/circuitBreaker.ts

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;    // Nb d'échecs avant ouverture
  successThreshold: number;    // Nb de succès pour refermer
  timeout: number;             // Ms avant de passer en half-open
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30_000,    // 30s avant réessai
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime ?? 0) > this.config.timeout) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError(`Circuit ${this.name} is open`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'closed';
        this.successes = 0;
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  get isOpen() { return this.state === 'open'; }
}

export class CircuitOpenError extends Error {}

// Instance partagée pour Claude
export const claudeCircuitBreaker = new CircuitBreaker('claude-api');
```

```typescript
// supabase/functions/_shared/claudeClient.ts — Appel Claude avec résilience complète

import { claudeCircuitBreaker, CircuitOpenError } from './circuitBreaker.ts';

interface ClaudeCallOptions {
  maxRetries?: number;
  timeoutMs?: number;
}

export async function callClaude(
  prompt: string,
  options: ClaudeCallOptions = {}
): Promise<LLMSuggestion | null> {
  const { maxRetries = 2, timeoutMs = 8000 } = options;

  // 1. Vérifier le circuit breaker
  if (claudeCircuitBreaker.isOpen) {
    console.warn('[Claude] Circuit open — fallback to manual mode');
    return null; // Signal pour le frontend : basculer en mode manuel
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await claudeCircuitBreaker.execute(async () => {
        // Timeout absolu
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514', // version épinglée
              max_tokens: 1000,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (!response.ok) {
            throw new Error(`Claude HTTP ${response.status}`);
          }

          const data = await response.json();
          return parseLLMOutput(data.content[0].text);

        } finally {
          clearTimeout(timeoutId);
        }
      });

      return result;

    } catch (error) {
      if (error instanceof CircuitOpenError) return null;

      // Exponential backoff entre les tentatives
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
        await sleep(delay);
      }
    }
  }

  return null; // Après tous les retries : mode dégradé
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
```

## 2.2 Mode Dégradé — Frontend

```typescript
// src/hooks/useInvoiceGenerator.ts

export function useInvoiceGenerator() {
  const [mode, setMode] = useState<'ai' | 'manual' | 'degraded'>('ai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const generateFromDescription = async (description: string) => {
    setIsGenerating(true);

    try {
      const response = await supabase.functions.invoke('generate-invoice', {
        body: { description },
      });

      if (response.data?.fallback_to_manual) {
        // L'IA est indisponible — le backend nous le signale
        setAiUnavailable(true);
        setMode('degraded');
        // On conserve la description saisie — pas de perte de données
        return { mode: 'degraded', description };
      }

      setMode('ai');
      return { mode: 'ai', data: response.data };

    } catch {
      setAiUnavailable(true);
      setMode('degraded');
      return { mode: 'degraded', description };
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateFromDescription, mode, isGenerating, aiUnavailable };
}
```

```tsx
// Composant UI — mode dégradé transparent

const InvoiceGenerator = () => {
  const { generateFromDescription, mode, aiUnavailable } = useInvoiceGenerator();

  return (
    <div>
      {aiUnavailable && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>Assistance IA temporairement indisponible</AlertTitle>
          <p>
            La génération automatique est momentanément hors service.
            Vous pouvez continuer en saisie manuelle — vos données sont conservées.
          </p>
        </Alert>
      )}

      {mode === 'ai' && (
        <DescriptionInput onSubmit={generateFromDescription} />
      )}

      {/* Le formulaire manuel est TOUJOURS disponible */}
      <InvoiceManualForm
        collapsed={mode === 'ai' && !aiUnavailable}
        prefillDescription={description}
      />
    </div>
  );
};
```

## 2.3 Résilience Peppol (Billit indisponible)

```typescript
// supabase/functions/_shared/peppolSender.ts

export async function sendToPeppol(
  invoiceId: string,
  ublPayload: string,
  serviceClient: SupabaseClient
): Promise<void> {

  try {
    // Tentative d'envoi direct
    const response = await fetch('https://api.billit.be/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BILLIT_API_KEY')}`,
        'Content-Type': 'application/xml',
      },
      body: ublPayload,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`Billit HTTP ${response.status}`);

    // Succès
    await serviceClient.from('invoices')
      .update({ status: 'sent', peppol_sent_at: new Date().toISOString() })
      .eq('id', invoiceId);

  } catch (error) {
    // Échec → mise en file d'attente avec retry automatique
    await serviceClient.from('async_jobs').insert({
      job_type: 'send_peppol',
      invoice_id: invoiceId,
      payload: { ubl_payload: ublPayload, attempt_count: 1 },
      idempotency_key: `peppol:${invoiceId}`,
      status: 'pending',
      // Retry dans 5 minutes
      scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      max_attempts: 5,
    });

    // L'utilisateur voit un statut intermédiaire — pas une erreur brutale
    await serviceClient.from('invoices')
      .update({ status: 'pending_peppol' })
      .eq('id', invoiceId);
  }
}
```

```sql
-- Gestion de l'exponential backoff dans les retries
CREATE OR REPLACE FUNCTION handle_job_failure(
  p_job_id UUID,
  p_error TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
  v_next_retry TIMESTAMPTZ;
BEGIN
  SELECT attempts, max_attempts
  INTO v_attempts, v_max_attempts
  FROM async_jobs WHERE id = p_job_id;

  IF v_attempts >= v_max_attempts THEN
    -- Dead Letter Queue
    UPDATE async_jobs
    SET status = 'dead', last_error = p_error, updated_at = NOW()
    WHERE id = p_job_id;

    -- Alerter l'équipe
    INSERT INTO system_alerts (type, message, severity, metadata)
    VALUES ('JOB_DEAD', 'Job moved to DLQ', 'HIGH', jsonb_build_object('job_id', p_job_id));

  ELSE
    -- Exponential backoff : 5min, 15min, 45min, 135min
    v_next_retry := NOW() + (INTERVAL '5 minutes' * POWER(3, v_attempts - 1));

    UPDATE async_jobs
    SET
      status = 'failed',
      last_error = p_error,
      next_retry_at = v_next_retry,
      updated_at = NOW()
    WHERE id = p_job_id;
  END IF;
END;
$$;
```

---

# PARTIE 3 — IDEMPOTENCE

---

## 3.1 Principe appliqué à InvoiceAI

```
RÈGLE : toute opération financière critique doit être idempotente.
Appeler deux fois la même opération avec le même ID doit produire le même résultat,
sans créer de doublon.
```

## 3.2 Numérotation des factures (séquentielle sans doublon)

```sql
-- Séquence par utilisateur — thread-safe
CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id UUID, p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence INTEGER;
  v_invoice_number TEXT;
BEGIN
  -- Lock au niveau de l'utilisateur pour éviter les race conditions
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE user_id = p_user_id
  AND EXTRACT(YEAR FROM issue_date) = p_year;

  v_invoice_number := FORMAT('INV-%s-%s', p_year, LPAD(v_sequence::TEXT, 4, '0'));

  RETURN v_invoice_number; -- Exemple : INV-2026-0042
END;
$$;
```

## 3.3 Protection contre la double soumission

```typescript
// Hook frontend — protection contre double-clic sur "Envoyer"
export function useSubmitOnce<T>(
  fn: () => Promise<T>
): [() => Promise<T | null>, boolean] {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmitted = useRef(false);

  const submit = async (): Promise<T | null> => {
    if (isSubmitting || hasSubmitted.current) return null;

    hasSubmitted.current = true;
    setIsSubmitting(true);

    try {
      return await fn();
    } finally {
      setIsSubmitting(false);
      // NE PAS reset hasSubmitted — intentionnel pour éviter le double envoi
    }
  };

  return [submit, isSubmitting];
}
```

```typescript
// Backend — vérification d'idempotence avant toute opération critique
async function createInvoiceIdempotent(
  userId: string,
  payload: InvoicePayload,
  idempotencyKey: string,    // fourni par le frontend
  serviceClient: SupabaseClient
) {
  // Vérifier si la facture a déjà été créée avec cette clé
  const { data: existing } = await serviceClient
    .from('invoices')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existing) {
    // Retourner la facture existante — pas de doublon
    return { invoice: existing, created: false };
  }

  // Créer la facture avec la clé d'idempotence
  const { data: invoice } = await serviceClient
    .from('invoices')
    .insert({ ...payload, idempotency_key: idempotencyKey })
    .select()
    .single();

  return { invoice, created: true };
}
```

---

# PARTIE 4 — GRANULARITÉ DES LOGS

---

## 4.1 Stratégie de logging — Minimisation + Séparation

```
LOGS TECHNIQUES           LOGS MÉTIER              LOGS SÉCURITÉ
─────────────────         ──────────────────        ──────────────────
Erreurs applicatives      Actions utilisateur       Tentatives auth
Stack traces              Factures créées           Accès ressources
Latences services         Factures envoyées         Modifications critiques
Status HTTP               Paiements reçus           Anomalies détectées
Circuit breaker events    Exports demandés          Rate limit hits
```

```typescript
// src/lib/logger.ts — Logger centralisé avec redaction automatique

const SENSITIVE_FIELDS = ['iban', 'vat_number', 'email', 'password', 'token', 'api_key'];

function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      result[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = redactSensitive(result[key] as Record<string, unknown>);
    }
  }
  return result;
}

export const logger = {
  technical: (event: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      type: 'TECHNICAL',
      event,
      data: data ? redactSensitive(data) : undefined,
      ts: new Date().toISOString(),
    }));
  },

  business: async (
    serviceClient: SupabaseClient,
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ) => {
    // Les logs métier vont en base — jamais de PII dans metadata
    await serviceClient.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata: metadata ? redactSensitive(metadata) : {},
    });
  },
};
```

## 4.2 Politique de rétention

| Type de log | Durée | Justification |
|---|---|---|
| `audit_logs` actions financières | 7 ans | Obligation légale comptable belge |
| `audit_logs` actions non-financières | 2 ans | Conformité RGPD + investigation |
| `llm_invoice_logs` | 2 ans | Audit IA + debugging |
| `rate_limit_logs` | 90 jours | Sécurité |
| `async_jobs` (done/dead) | 180 jours | Debugging + support |
| `login_attempts` | 30 jours | Sécurité |
| Logs techniques (console) | 30 jours | Vercel default |

---

# PARTIE 5 — ROADMAP D'IMPLÉMENTATION PRIORISÉE

---

## 5.1 Ce qu'il faut construire maintenant vs plus tard

```
V1 — CONSTRUIRE                          NE PAS CONSTRUIRE EN V1
──────────────────────────               ───────────────────────────────
✅ Financial Integrity Engine            ❌ Airflow / Kubeflow / Kafka
✅ RLS complet (5 tables)                ❌ LangGraph / agents multi-rôles
✅ Mode dégradé manuel                   ❌ RAG comme moteur de conformité
✅ Queue simple (table PG)               ❌ ERP features (stock, RH, CRM)
✅ Circuit breaker Claude                ❌ Multi-modèle / Model Gateway
✅ Idempotence factures                  ❌ Fine-tuning / RLHF
✅ HITL obligatoire avant Peppol         ❌ Analytics ML avancées
✅ Audit trail minimum viable            ❌ Vector DB / pgvector (V2)
✅ Mode Peppol asynchrone avec retry     ❌ Comptabilité analytique
✅ Numérotation séquentielle sécurisée   ❌ Workflow multi-approbateurs
```

## 5.2 Sprints détaillés

### Sprint 1 — Fondations sécurité (Semaine 1)
**Objectif** : fermer toutes les failles critiques identifiées dans l'audit

| Tâche | Priorité | Durée estimée |
|---|---|---|
| Activer RLS sur les 5 tables + tests d'isolation | P0 | 3h |
| Vérifier aucune clé secrète dans `VITE_*` | P0 | 1h |
| Passer le bucket Storage en privé + URL signées | P0 | 2h |
| Configurer headers sécurité dans `vercel.json` | P0 | 1h |
| Créer table `llm_invoice_logs` | P1 | 1h |
| Créer table `audit_logs` + logger les 5 actions clés | P1 | 2h |

### Sprint 2 — Financial Integrity Engine (Semaine 2)
**Objectif** : sécuriser la chaîne IA → calcul → validation

| Tâche | Priorité | Durée estimée |
|---|---|---|
| Installer `decimal.js` + remplacer les calculs float | P0 | 2h |
| Implémenter `financialEngine.ts` | P0 | 4h |
| Modifier le prompt Claude : items bruts uniquement, sans montants | P0 | 1h |
| Implémenter `businessRuleValidator.ts` | P1 | 3h |
| Ajouter HITL explicite dans l'UI (checkbox + confirmation) | P1 | 2h |
| Tests golden dataset (50 cas) | P1 | 4h |

### Sprint 3 — Résilience + Queue (Semaine 3)
**Objectif** : rendre le produit robuste aux pannes externes

| Tâche | Priorité | Durée estimée |
|---|---|---|
| Créer table `async_jobs` + function `claim_next_job` | P1 | 3h |
| Implémenter circuit breaker Claude | P1 | 2h |
| Mode dégradé UI (fallback formulaire manuel) | P1 | 3h |
| Envoi Peppol asynchrone avec retry + exponential backoff | P1 | 4h |
| Idempotence : `generate_invoice_number` + clé idempotence | P1 | 2h |

### Sprint 4 — Conformité RGPD + Go-Live (Semaine 4)
**Objectif** : être légalement prêt pour les premiers vrais utilisateurs

| Tâche | Priorité | Durée estimée |
|---|---|---|
| Rédiger et publier la Privacy Policy | P0 légal | 4h |
| Implémenter `anonymize_user_data()` | P0 légal | 2h |
| Configurer SPF/DKIM/DMARC sur le domaine email | P1 | 1h |
| Rate limiting sur endpoints sensibles | P1 | 2h |
| Activer `pg_cron` pour purge des données expirées | P2 | 1h |
| Recrutement 10 beta testeurs IT belges | P0 produit | — |

### Sprint 5 — Flux Devis → Facture (Semaine 5-6)
**Objectif** : capturer l'utilisateur plus tôt dans son cycle de travail

| Tâche | Priorité | Durée estimée |
|---|---|---|
| Table `quotes` (mirror de `invoices` avec statut) | P1 | 3h |
| Conversion Devis → Facture en 1 clic | P1 | 4h |
| UI Devis avec mêmes garde-fous que Facture | P1 | 4h |
| Email de devis (Resend) | P2 | 2h |

### Sprint 6 — Relances intelligentes (Semaine 7-8)
**Objectif** : résoudre le vrai problème du freelance — être payé

| Tâche | Priorité | Durée estimée |
|---|---|---|
| Cron de détection des factures impayées à échéance | P1 | 2h |
| Génération de relance par Claude (ton professionnel) | P1 | 3h |
| Envoi email de relance via Resend | P1 | 2h |
| Dashboard "à relancer" dans le UI | P1 | 3h |
| Historique des relances par facture | P2 | 2h |

---

# PARTIE 6 — QUESTIONS TRANCHÉES (Section 19 du doc consolidé)

---

## 6.1 Proposition de valeur dominante

**Décision** : **Conformité + Gain de temps** (les deux sont liés et inséparables pour ce segment)

La conformité Peppol est le déclencheur d'urgence (pression légale). Le gain de temps est la valeur différenciante durable. Le paiement intégré est la valeur V2 qui augmente la rétention.

## 6.2 Devis avant paiement intégré ?

**Décision : Oui**

```
V1 : Facture                   → Stripe abonnements
V1.5 : Devis → Facture         → Stripe abonnements
V2 : Relances                  → Stripe abonnements
V2.5 : Lien de paiement client → Stripe Connect
V3 : Export comptable CSV      → Intégrations WinBooks/BOB
```

Le paiement intégré (Stripe Connect) nécessite un onboarding KYC des freelances et des obligations légales supplémentaires. C'est une V2.5 minimum.

## 6.3 Structured outputs natifs ou validation locale ?

**Décision : Validation locale pour l'instant + structured outputs dès disponibilité stable**

```typescript
// Stratégie hybride — prête pour les deux modes
async function parseClaudeOutput(rawOutput: string): Promise<LLMSuggestion> {
  // 1. Essayer de parser comme JSON direct (structured output)
  try {
    const parsed = JSON.parse(rawOutput);
    return InvoiceSuggestionSchema.parse(parsed); // Zod
  } catch {
    // 2. Fallback : extraction JSON depuis du texte (legacy)
    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/) ||
                      rawOutput.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) throw new Error('No JSON found in LLM output');
    return InvoiceSuggestionSchema.parse(JSON.parse(jsonMatch[1]));
  }
}
```

## 6.4 Jusqu'où va l'automatisation sans dégrader la confiance ?

**Ligne de démarcation définitive** :

```
PEUT être automatisé sans confirmation                NÉCESSITE confirmation humaine
──────────────────────────────────────                ──────────────────────────────────
Génération du brouillon                              Envoi de la facture sur Peppol
Suggestion de TVA                                    Génération du PDF officiel
Détection de la langue                               Envoi d'un email au client
Pré-remplissage depuis l'historique                  Modification d'une facture émise
Calcul du total (affiché pour review)                Relance client
Sauvegarde du brouillon                              Annulation / avoir
Validation TVA VIES (background)                     Tout paiement
```

---

# PARTIE 7 — DOCTRINE TECHNIQUE RÉSUMÉE

---

## Les 12 règles InvoiceAI

```
1.  L'IA propose — ton code calcule.
    Claude ne retourne jamais de montants calculés.

2.  Decimal.js pour tout calcul financier.
    Aucun float natif JavaScript sur des montants.

3.  Whitelist déterministe pour les taux TVA.
    Jamais confier la fiscalité au LLM.

4.  HITL obligatoire avant toute write action légale.
    Envoi Peppol, PDF officiel, relance = confirmation humaine.

5.  Modèle épinglé, jamais "latest".
    Toute mise à jour modèle = rerun du golden dataset.

6.  Asynchrone pour tout ce qui touche des dépendances externes.
    Peppol, email, VIES, export = queue + retry.

7.  Idempotence sur toute opération financière critique.
    Même requête deux fois = même résultat, pas de doublon.

8.  RLS comme dernier rempart.
    La base refuse les accès cross-tenant, même si le code est faillible.

9.  Aucune PII dans les prompts Claude.
    Descriptions de prestations uniquement — jamais nom/email/IBAN.

10. Mode dégradé manuel toujours disponible.
    Si l'IA est down, le produit continue de fonctionner.

11. Logs avec redaction automatique.
    IBAN, TVA, email ne doivent jamais apparaître en clair dans les logs.

12. La facture émise est immuable.
    Correction = note de crédit + nouvelle facture.
    Jamais de UPDATE sur une facture envoyée.
```

---

*Business Project Flow · InvoiceAI · Architecture de Référence · Version 1.0 · 16 mars 2026*  
*Ce document est la référence d'implémentation — à maintenir à jour à chaque décision technique majeure*
