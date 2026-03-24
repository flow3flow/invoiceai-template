# InvoiceAI — Architecture IA & Doctrine LLMOps
> Business Project Flow · Mars 2026  
> Modèle : Claude (Anthropic) — Constitutional AI  
> Principe fondateur : **L'IA propose, le moteur déterministe décide, l'humain valide**

---

## 1. Philosophie — Crawl / Walk / Run

```
CRAWL (aujourd'hui)     L'IA structure uniquement — l'humain valide tout
WALK  (Sprint 3)        L'IA suggère + alerte — l'humain confirme les actions critiques
RUN   (Sprint 4)        L'IA agit en autonomie sur les tâches non-financières
```

> ⚠️ **Règle absolue** : aucune action financière irréversible (émission Peppol, archivage fiscal) sans validation humaine explicite tracée en `audit_logs`.

---

## 2. Pipeline génératif — Factures

```
Utilisateur saisit description en langage naturel
         ↓
[COUCHE 1] PII Sanitization (Regex + NER local)
         → masque IBAN, emails, noms propres → [CLIENT_NAME], [PHONE_NUMBER]
         ↓
[COUCHE 2] Claude Haiku (structuration rapide)
         → JSON minimaliste : { description, quantity, unit_price, vat_rate }
         → AUCUN calcul de total — données brutes uniquement
         → Forbidden words check : subordination, salaire, employeur, horaires
         ↓
[COUCHE 3] Financial Integrity Engine (Node.js déterministe)
         → Recalcule TOUS les montants (jamais faire confiance à l'IA pour les maths)
         → Applique le taux TVA légal depuis PostgreSQL (whitelist stricte)
         → Valide via Assertions de Modèle
         ↓
[COUCHE 4] PII Réinjection
         → [CLIENT_NAME] → "Jean Dupont" depuis le dictionnaire inversé
         ↓
[COUCHE 5] HITL — Affichage à l'utilisateur
         → Diff visuel : proposition IA vs correction utilisateur
         → L'utilisateur valide ou corrige
         ↓
[COUCHE 6] Log complet dans llm_invoice_logs
         → prompt_sent, ai_response, user_correction, vat_warnings, latency_ms
```

---

## 3. Financial Integrity Engine

> L'IA ne calcule jamais. Elle lit. Le moteur calcule.

```typescript
// src/lib/financialEngine.ts

import Decimal from 'decimal.js'; // OBLIGATOIRE — jamais float natif

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const VAT_WHITELIST_BE = [0, 0.06, 0.12, 0.21];
const VAT_WHITELIST_FR = [0, 0.055, 0.10, 0.20];

interface RawAIItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number; // brut depuis l'IA — à valider
}

interface ValidatedItem extends RawAIItem {
  line_total_ht:  Decimal;
  vat_amount:     Decimal;
  line_total_ttc: Decimal;
}

export function validateAndCompute(
  items: RawAIItem[],
  countryCode: 'BE' | 'FR'
): { items: ValidatedItem[]; subtotal: Decimal; vat_total: Decimal; total: Decimal; warnings: string[] } {
  const whitelist = countryCode === 'FR' ? VAT_WHITELIST_FR : VAT_WHITELIST_BE;
  const warnings: string[] = [];

  const validated = items.map((item) => {
    // Assertion : taux TVA dans la whitelist légale
    if (!whitelist.includes(item.vat_rate)) {
      warnings.push(`Taux TVA ${item.vat_rate * 100}% non reconnu — corrigé à 21%`);
      item.vat_rate = 0.21;
    }

    const qty        = new Decimal(item.quantity);
    const price      = new Decimal(item.unit_price);
    const vatRate    = new Decimal(item.vat_rate);
    const lineHT     = qty.mul(price);
    const vatAmount  = lineHT.mul(vatRate);

    return {
      ...item,
      line_total_ht:  lineHT,
      vat_amount:     vatAmount,
      line_total_ttc: lineHT.add(vatAmount),
    };
  });

  const subtotal  = validated.reduce((s, i) => s.add(i.line_total_ht), new Decimal(0));
  const vat_total = validated.reduce((s, i) => s.add(i.vat_amount),    new Decimal(0));
  const total     = subtotal.add(vat_total);

  return { items: validated, subtotal, vat_total, total, warnings };
}
```

---

## 4. PII Sanitization — Dictionnaire inversé

```typescript
// supabase/functions/_shared/piiSanitizer.ts

interface PiiMap { [placeholder: string]: string }

const PII_PATTERNS = [
  { regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,  tag: 'EMAIL'  },
  { regex: /\bBE\d{10}\b/gi,                                 tag: 'VAT_BE' },
  { regex: /\bFR[A-Z0-9]{2}\d{9}\b/gi,                      tag: 'VAT_FR' },
  { regex: /\bBE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/gi,         tag: 'IBAN'   },
  { regex: /\+32[\s\d]{8,}/g,                                tag: 'PHONE'  },
];

export function sanitize(text: string): { clean: string; map: PiiMap } {
  let clean = text;
  const map: PiiMap = {};
  let counter = 0;

  for (const { regex, tag } of PII_PATTERNS) {
    clean = clean.replace(regex, (match) => {
      const placeholder = `[${tag}_${counter++}]`;
      map[placeholder] = match;
      return placeholder;
    });
  }

  return { clean, map };
}

export function rehydrate(text: string, map: PiiMap): string {
  return Object.entries(map).reduce(
    (t, [placeholder, value]) => t.replaceAll(placeholder, value),
    text
  );
}
```

---

## 5. Prompt système — Claude

```
Tu es un assistant de structuration de factures belges et françaises.
Ton unique rôle : extraire des données brutes depuis une description.
Tu ne calcules JAMAIS de totaux ou de TVA — le moteur le fait.
Tu renvoies UNIQUEMENT un JSON valide, sans texte autour.

LANGUE DE SORTIE (OBLIGATOIRE) :
- Réponds TOUJOURS dans la langue : {profile.language}
- fr → descriptions en français professionnel
- nl → beschrijvingen in professioneel Nederlands
- en → descriptions in professional English
- Peu importe la langue de saisie de l'utilisateur (FR/NL/EN/mix)
- INTERDIT : mélanger les langues dans un même JSON de sortie
- INTERDIT : traduire les noms propres (noms d'entreprise, noms de personnes)

INTERDITS ABSOLUS dans les descriptions générées :
- Termes de subordination : employeur, salarié, manager, hiérarchie, horaires
- Termes financiers calculés : total, TTC, sous-total, TVA calculée
- Toute donnée personnelle (les placeholders [TAG] sont déjà anonymisés)

FORMAT DE SORTIE OBLIGATOIRE :
{
  "items": [
    {
      "description": "string — description professionnelle dans {profile.language}",
      "quantity": number,
      "unit_price": number,
      "vat_rate": number (0, 0.06, 0.12, 0.21 pour BE — 0, 0.055, 0.10, 0.20 pour FR)
    }
  ],
  "confidence": number (0-1),
  "vat_warnings": ["string"],
  "language_used": "fr|nl|en"
}
```

---

## 6. Model Routing — Haiku / Sonnet

```
REQUÊTE SIMPLE (structuration texte clair)
  → Claude Haiku (rapide, économique)
  → max_tokens: 500, timeout: 5s

REQUÊTE COMPLEXE (OCR difficile, document non structuré, ambiguïté TVA)
  → Claude Sonnet (puissant, précis)
  → max_tokens: 1000, timeout: 10s

FALLBACK (timeout ou erreur)
  → Mode dégradé UI — formulaire manuel
  → Texte utilisateur conservé dans le presse-papiers
  → Message : "L'assistant IA est temporairement indisponible"
```

---

## 7. Circuit Breaker — Mode dégradé

```typescript
// supabase/functions/generate-invoice/index.ts

const CLAUDE_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

async function callClaudeWithBreaker(prompt: string): Promise<object | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': Deno.env.get('CLAUDE_API_KEY')! },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Claude ${response.status}`);
      return await response.json();

    } catch (err) {
      if (attempt === MAX_RETRIES) {
        // Circuit ouvert → mode dégradé
        console.error('[CircuitBreaker] Claude indisponible:', err);
        return null; // null = formulaire manuel côté UI
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // backoff exponentiel
    }
  }
  return null;
}
```

---

## 8. Rate Limiting — Protection DoS

```typescript
// supabase/functions/_shared/rateLimit.ts

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  maxPerHour = 20
): Promise<void> {
  const windowStart = new Date(Date.now() - 3600 * 1000).toISOString();

  const { count } = await supabase
    .from('llm_invoice_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);

  if ((count ?? 0) >= maxPerHour) {
    throw new Response(
      JSON.stringify({ error: `Limite IA atteinte (${maxPerHour} req/h). Réessayez dans 1h.` }),
      { status: 429 }
    );
  }
}
```

---

## 9. HITL — Human-in-the-Loop tracé

```typescript
// À appeler dans la Edge Function APRÈS validation utilisateur

await supabase.from('audit_logs').insert({
  user_id:       userId,
  action:        'INVOICE_AI_VALIDATED',
  resource_type: 'invoice',
  resource_id:   invoiceId,
  metadata: {
    ai_model:          'claude-haiku-4-5-20251001',
    fields_corrected:  correctedFields,   // champs modifiés par l'utilisateur
    confidence_score:  aiResponse.confidence,
    vat_warnings:      aiResponse.vat_warnings,
    latency_ms:        latencyMs,
    peppol_ready:      peppolReady,
  },
  ip_address:    req.headers.get('x-forwarded-for'),
  created_at:    new Date().toISOString(),
});
```

---

## 10. LLMOps — Observabilité & Drift Detection

### Table `llm_invoice_logs`

```sql
CREATE TABLE IF NOT EXISTS llm_invoice_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id),
  invoice_id        UUID REFERENCES invoices(id),
  model_used        TEXT NOT NULL,               -- 'claude-haiku' | 'claude-sonnet'
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  latency_ms        INTEGER,
  confidence_score  DECIMAL(3,2),
  ai_json_raw       JSONB,                       -- proposition brute de l'IA
  user_json_final   JSONB,                       -- après correction utilisateur
  fields_corrected  TEXT[],                      -- champs modifiés (drift signal)
  vat_warnings      TEXT[],
  pii_sanitized     BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la détection de dérive
CREATE INDEX idx_llm_logs_drift ON llm_invoice_logs(created_at, fields_corrected);
```

### Métriques de drift à surveiller

```sql
-- Taux de correction par champ (signal de dérive)
SELECT
  unnest(fields_corrected) AS field,
  COUNT(*) AS corrections,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM llm_invoice_logs), 2) AS correction_rate_pct
FROM llm_invoice_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY field
ORDER BY corrections DESC;

-- Latence moyenne par modèle
SELECT model_used, AVG(latency_ms), PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)
FROM llm_invoice_logs
GROUP BY model_used;
```

> 🚨 **Alerte automatique** : si `correction_rate_pct` > 30% sur un champ en 7 jours → drift détecté → réviser le prompt.

---

## 11. Pipeline OCR — Notes de frais (Sprint 3)

```
Photo ticket (mobile/PWA)
         ↓
[ÉTAPE 1] OCR classique (AWS Textract ou Google Document AI)
         → Extraction texte brut (peu de tokens, économique)
         ↓
[ÉTAPE 2] Claude Haiku
         → Structuration JSON : montant, date, TVA, fournisseur, catégorie
         ↓
[ÉTAPE 3] Financial Integrity Engine
         → Recalcul + assertion : Total_calculé vs Total_lu sur le ticket
         → Si écart > 0.01€ → HITL obligatoire (afficher diff visuel)
         ↓
[ÉTAPE 4 — FALLBACK] Claude Sonnet Vision
         → Uniquement si Haiku échoue (ticket froissé, illisible)
         → Coût élevé → usage exceptionnel uniquement
```

---

## 12. Guardrails — Forbidden Words

```typescript
// src/lib/aiGuardrails.ts

const FORBIDDEN_SUBORDINATION = [
  'employeur', 'salarié', 'manager', 'hiérarchie', 'horaires imposés',
  'congés payés', 'fiche de paie', 'contrat de travail', 'lien de subordination',
];

const FORBIDDEN_FINANCIAL = [
  'total TTC calculé', 'sous-total calculé', 'TVA = ',
];

export function checkOutputGuardrails(aiOutput: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const lower = aiOutput.toLowerCase();

  for (const word of [...FORBIDDEN_SUBORDINATION, ...FORBIDDEN_FINANCIAL]) {
    if (lower.includes(word.toLowerCase())) {
      violations.push(`Terme interdit détecté : "${word}"`);
    }
  }

  return { valid: violations.length === 0, violations };
}
```

---

## 13. Résumé des tables IA à créer

```sql
-- Logs IA complets (observabilité + drift)
CREATE TABLE llm_invoice_logs ( ... ); -- voir §10

-- Données de préférence (RLHF futur)
CREATE TABLE ai_preference_data (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id         UUID REFERENCES llm_invoice_logs(id),
  prompt         TEXT NOT NULL,
  ai_response    JSONB NOT NULL,   -- réponse "perdante"
  human_response JSONB NOT NULL,   -- réponse "gagnante" = vérité terrain
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Alertes drift système
CREATE TABLE system_alerts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type        TEXT NOT NULL,     -- 'DRIFT_DETECTED' | 'RATE_LIMIT' | 'CIRCUIT_OPEN'
  field       TEXT,
  metric      DECIMAL,
  threshold   DECIMAL,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 14. Checklist avant activation IA en production

```
□ Financial Integrity Engine activé (Decimal.js)
□ PII Sanitization en place (Regex + dictionnaire inversé)
□ Forbidden words guardrail dans le prompt système
□ Rate limiting 20 req/h/user dans la Edge Function
□ Circuit breaker + mode dégradé UI opérationnel
□ llm_invoice_logs table créée et alimentée
□ HITL tracé dans audit_logs (UUID + timestamp + user_id + IP)
□ DPA signé avec Anthropic (Data Processing Agreement)
□ Mention dans Privacy Policy : "Données anonymisées avant envoi à l'IA"
□ Test golden dataset 50 cas TVA BE/FR sans erreur
```

---

## 15. Golden Dataset — Boucle de rétroaction & tests de non-régression

### Alimentation automatique depuis les corrections utilisateur

```
Utilisateur corrige une proposition IA
         ↓
Système capture le triplet (prompt, réponse_perdante, réponse_gagnante)
         ↓
INSERT INTO ai_preference_data
         ↓
Golden Dataset s'enrichit automatiquement
         ↓
Tests de non-régression sur chaque mise à jour de modèle
```

```sql
-- Requête pour extraire le Golden Dataset
SELECT
  llm.id,
  llm.prompt_tokens,
  llm.ai_json_raw      AS response_losing,   -- réponse "perdante" de l'IA
  llm.user_json_final  AS response_winning,  -- vérité terrain validée par l'humain
  llm.fields_corrected,
  llm.model_used,
  llm.created_at
FROM llm_invoice_logs llm
WHERE llm.fields_corrected IS NOT NULL
  AND array_length(llm.fields_corrected, 1) > 0  -- uniquement les cas corrigés
ORDER BY llm.created_at DESC;
```

### Test de non-régression — Changement de modèle Claude

```typescript
// scripts/regressionTest.ts
// À exécuter AVANT tout changement de modèle (ex: Haiku → Sonnet 4)

import { createClient } from '@supabase/supabase-js';

interface GoldenCase {
  id: string;
  prompt: string;
  expected: object; // user_json_final = vérité terrain
  model_used: string;
}

async function runRegressionTest(newModel: string, threshold = 0.85) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  const { data: cases } = await supabase
    .from('ai_preference_data')
    .select('*')
    .limit(50); // Top 50 cas du golden dataset

  let passed = 0;
  const failures: string[] = [];

  for (const c of cases as GoldenCase[]) {
    const response = await callClaude(c.prompt, newModel);
    const score = compareJsonSimilarity(response, c.expected);

    if (score >= threshold) {
      passed++;
    } else {
      failures.push(`Case ${c.id} — score: ${score.toFixed(2)} < ${threshold}`);
    }
  }

  const passRate = passed / cases!.length;
  console.log(`✅ Pass rate: ${(passRate * 100).toFixed(1)}%`);

  if (passRate < threshold) {
    console.error('🚨 RÉGRESSION DÉTECTÉE — Déploiement bloqué');
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log(`✅ Nouveau modèle ${newModel} validé — déploiement autorisé`);
}

// Déclencher avant chaque changement de modèle
runRegressionTest('claude-sonnet-4-6');
```

### Seuil d'alerte drift (pg_cron — Sprint 3)

```sql
-- Alerte automatique si taux de correction > 30% en 7 jours
INSERT INTO system_alerts (type, field, metric, threshold)
SELECT
  'DRIFT_DETECTED',
  unnest(fields_corrected),
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM llm_invoice_logs WHERE created_at > NOW() - INTERVAL '7 days'),
  30.0
FROM llm_invoice_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY unnest(fields_corrected)
HAVING COUNT(*) * 100.0 / (SELECT COUNT(*) FROM llm_invoice_logs WHERE created_at > NOW() - INTERVAL '7 days') > 30;
```

---

## 16. Économie OCR — Protection des marges (9€/mois)

### Coût estimé par opération

```
OCR classique (Textract/Google)    ~0.0015$/page    → économique
Claude Haiku (texte brut)          ~0.0003$/1k tok  → très économique
Claude Sonnet Vision (image)       ~0.003$/image    → 10x plus cher

100 tickets/mois × Sonnet Vision = ~0.30$/user/mois → inacceptable à 9€/mois
100 tickets/mois × pipeline OCR + Haiku = ~0.05$/user/mois → OK
```

### Pipeline économique avec routage

```typescript
// supabase/functions/ocr-expense/index.ts

const QUOTA_OCR_FREE    = 10;   // scans/mois plan Free
const QUOTA_OCR_STARTER = 50;   // scans/mois plan Starter (9€)
const QUOTA_OCR_PRO     = 200;  // scans/mois plan Pro (19€)

async function processExpenseReceipt(
  imageBase64: string,
  userId: string,
  plan: 'free' | 'starter' | 'pro' | 'business'
): Promise<object> {

  // 1. Vérifier le quota mensuel
  const quota = { free: QUOTA_OCR_FREE, starter: QUOTA_OCR_STARTER, pro: QUOTA_OCR_PRO, business: 999 }[plan];
  await checkOcrQuota(userId, quota);

  // 2. Compression côté serveur avant envoi (réduit ~60% des tokens)
  const compressed = await compressImage(imageBase64, { maxWidth: 1200, quality: 0.75 });

  // 3. ÉTAPE 1 — OCR classique (économique)
  let rawText: string | null = null;
  try {
    rawText = await callTextract(compressed); // AWS Textract ~0.0015$/page
  } catch {
    rawText = null;
  }

  // 4. ÉTAPE 2 — Haiku sur texte brut (très économique)
  if (rawText && rawText.length > 20) {
    const structured = await callClaude(rawText, 'claude-haiku-4-5-20251001');
    if (isValidExpenseJson(structured)) return structured;
  }

  // 5. FALLBACK — Claude Sonnet Vision (coûteux, usage exceptionnel)
  console.warn('[OCR] Fallback Sonnet Vision déclenché pour user:', userId);
  return await callClaudeVision(compressed, 'claude-sonnet-4-6');
}
```

### Pré-compression navigateur (avant upload)

```typescript
// src/lib/imageCompressor.ts — exécuté côté client, AVANT envoi serveur

export async function compressReceiptImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img    = new Image();

    img.onload = () => {
      // Règle du "Proxy Humain" : résolution lisible par un humain = lisible par l'IA
      const maxWidth  = 1200;
      const maxHeight = 1600;
      let { width, height } = img;

      if (width > maxWidth)  { height = (height * maxWidth)  / width;  width = maxWidth;  }
      if (height > maxHeight){ width  = (width  * maxHeight) / height; height = maxHeight; }

      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      // Conversion en niveaux de gris — réduit encore les tokens
      ctx.filter = 'grayscale(100%) contrast(120%)';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.75).split(',')[1]);
    };

    img.src = URL.createObjectURL(file);
  });
}
```

---

## 17. Forbidden Words — Soft Block avec friction responsable

### Principe : jamais de Hard Block, toujours un Soft Block pédagogique

```
HARD BLOCK ❌   → L'utilisateur ne peut pas émettre — frustration → churn
SOFT BLOCK ✅   → Avertissement + suggestion + override possible → responsabilisation
```

### Implémentation — 3 niveaux de risque

```typescript
// src/lib/aiGuardrails.ts

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface GuardrailResult {
  level:       RiskLevel;
  violations:  string[];
  suggestions: string[];
  canOverride: boolean;
}

const RISK_HIGH: { term: string; suggestion: string }[] = [
  { term: 'lien de subordination', suggestion: '"prestation de service indépendante"' },
  { term: 'contrat de travail',     suggestion: '"contrat de prestation"' },
  { term: 'fiche de paie',          suggestion: '"facture de prestation"' },
  { term: 'congés payés',           suggestion: 'Supprimer — non applicable aux indépendants' },
];

const RISK_MEDIUM: { term: string; suggestion: string }[] = [
  { term: 'manager',   suggestion: '"chef de projet client"' },
  { term: 'employeur', suggestion: '"client"' },
  { term: 'salaire',   suggestion: '"honoraires"' },
  { term: 'horaires',  suggestion: '"planning de mission"' },
];

export function checkGuardrails(text: string): GuardrailResult {
  const lower = text.toLowerCase();
  const violations: string[] = [];
  const suggestions: string[] = [];
  let level: RiskLevel = 'LOW';

  for (const { term, suggestion } of RISK_HIGH) {
    if (lower.includes(term)) {
      violations.push(term);
      suggestions.push(`"${term}" → ${suggestion}`);
      level = 'HIGH';
    }
  }

  for (const { term, suggestion } of RISK_MEDIUM) {
    if (lower.includes(term)) {
      violations.push(term);
      suggestions.push(`"${term}" → ${suggestion}`);
      if (level !== 'HIGH') level = 'MEDIUM';
    }
  }

  return {
    level,
    violations,
    suggestions,
    canOverride: true, // TOUJOURS true — l'utilisateur a le dernier mot
  };
}
```

### UI — Message d'avertissement selon le niveau

```typescript
// src/components/invoice/GuardrailAlert.tsx

const MESSAGES: Record<RiskLevel, { title: string; color: string; icon: string }> = {
  LOW:    { title: '',                                                                    color: '',       icon: '' },
  MEDIUM: { title: '⚠️ Termes ambigus détectés',                                         color: 'amber',  icon: '⚠️' },
  HIGH:   { title: '🚨 Risque de requalification fiscale',                                color: 'red',    icon: '🚨' },
};

// Message affiché à l'utilisateur :
// "L'utilisation de [terme] peut suggérer un lien de subordination et augmenter
//  vos risques de requalification en salarié par l'ONSS/URSSAF."
//
// Suggestion : [alternative proposée]
//
// [Appliquer la suggestion]   [Je comprends les risques — conserver]
//
// Si l'utilisateur clique "Je comprends les risques" :
// → override_acknowledged = true enregistré dans audit_logs
// → responsabilité légale transférée à l'utilisateur
```

```typescript
// Tracer l'override dans audit_logs
if (userOverride) {
  await supabase.from('audit_logs').insert({
    user_id:       userId,
    action:        'GUARDRAIL_OVERRIDE',
    resource_type: 'invoice',
    metadata: {
      violations,
      risk_level: 'HIGH',
      user_acknowledged: true,
      disclaimer: 'L\'utilisateur a explicitement accepté les risques fiscaux',
    },
  });
}
```

---

## 18. Contexte Multi-Profil — Isolation stricte par `business_profile_id`

### Règle d'or : l'IA ne voit que le profil actif

```
INTERDIT ❌   Contexte global → mélange TVA BE/FR, historiques croisés
OBLIGATOIRE ✅ Contexte isolé → filtrage strict par profile_id avant tout appel IA
```

### Prompt Template dynamique par profil

```typescript
// supabase/functions/generate-invoice/index.ts

function buildSystemPrompt(profile: BusinessProfile): string {
  const vatRates = profile.country_code === 'FR'
    ? '0%, 5,5%, 10%, 20%'
    : '0%, 6%, 12%, 21%';

  const vatLaw = profile.country_code === 'FR'
    ? 'CGI art. 256 à 283 bis'
    : 'Code TVA belge — AR n°1';

  const reverseCharge = profile.country_code === 'BE'
    ? 'Art. 21§2 CTVA | Art. 196 Directive 2006/112/CE'
    : 'Art. 283 bis CGI';

  // Injection dynamique — recréé à CHAQUE appel avec le profil actif
  return `
Tu es un assistant de facturation pour l'entité "${profile.company_name}".

RÈGLES TVA APPLICABLES (${profile.country_code}) :
- Taux autorisés : ${vatRates}
- Cadre légal : ${vatLaw}
- Autoliquidation : ${reverseCharge}
- Numéro TVA émetteur : ${profile.vat_number}
- Pays d'établissement : ${profile.country_code}

HISTORIQUE : Tu n'as accès qu'aux factures du profil "${profile.company_name}" (ID: ${profile.id}).
Ne jamais croiser avec d'autres profils ou entités du même compte.

LANGUE DE SORTIE : ${languageInstruction}
INTERDIT : mélanger les langues ou traduire les noms propres.

FORMAT : JSON minimaliste uniquement. Aucun calcul. Aucune phrase de politesse.
  `.trim();
}

// Mapping langue → instruction Claude
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  fr: 'Réponds en français professionnel — même si la saisie est en NL ou EN',
  nl: 'Antwoord in professioneel Nederlands — ook als de invoer in FR of EN is',
  en: 'Reply in professional English — regardless of input language',
};

function getLanguageInstruction(language: string): string {
  return LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS['fr'];
}
```

### Filtrage strict en base — Jamais de contexte croisé

```typescript
// Récupération historique IA — toujours filtré par profile_id
const { data: history } = await supabase
  .from('llm_invoice_logs')
  .select('ai_json_raw, user_json_final')
  .eq('user_id', userId)
  // ⚠️ CRITIQUE — filtrage strict par profil actif
  .eq('business_profile_id', activeProfileId)
  .order('created_at', { ascending: false })
  .limit(5); // Contexte limité aux 5 dernières factures du profil actif
```

### Gestion des sessions — Reset au changement de profil

```typescript
// src/pages/InvoiceGenerator.tsx

const handleProfileChange = (newProfile: BusinessProfile) => {
  setSelectedBusinessProfile(newProfile);

  // RESET OBLIGATOIRE du contexte IA au changement de profil
  // Évite que le contexte TVA FR "contamime" une facture BE
  setAiSessionId(crypto.randomUUID()); // nouveau session_id → contexte vierge
  setAiHistory([]);                    // vider l'historique conversationnel
  updateInvoice({
    vatScenario: (newProfile.country_code === 'FR'
      ? 'FR_STANDARD_20'
      : 'BE_STANDARD_21') as VatScenario,
  });
};
```

### Migration SQL — Ajout colonne `language`

```sql
-- Nécessaire pour le multilinguisme BE (FR/NL) et FR (FR/EN)
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr'
  CHECK (language IN ('fr', 'nl', 'en'));
```

### Checklist isolation multi-profil

```
□ System Prompt généré dynamiquement à chaque appel (pas statique)
□ Filtrage business_profile_id sur TOUS les appels Supabase liés à l'IA
□ session_id réinitialisé au changement de profil actif
□ llm_invoice_logs stocke toujours le business_profile_id
□ profile.language injecté dans le prompt (fr/nl/en)
□ Tests d'isolation : profil BE NL → descriptions en néerlandais uniquement
□ Tests d'isolation : profil BE FR → descriptions en français uniquement
□ Tests d'isolation : profil BE ne génère jamais TVA FR et vice versa
```

---

## 19. Checklist complète avant activation IA en production

```
FINANCIER
□ Financial Integrity Engine activé (Decimal.js — jamais float natif)
□ Whitelist TVA stricte (BE: 0/6/12/21 — FR: 0/5.5/10/20)
□ Assertions de modèle : recalcul systématique côté serveur

SÉCURITÉ / RGPD
□ PII Sanitization en place (Regex + dictionnaire inversé)
□ DPA signé avec Anthropic
□ Mention Privacy Policy : "Données anonymisées avant envoi à l'IA"
□ Rate limiting 20 req/h/user dans Edge Function

GUARDRAILS
□ Forbidden words : SOFT block avec override tracé dans audit_logs
□ Contexte multi-profil : filtrage strict business_profile_id
□ Prompt Template dynamique (re-généré à chaque appel)

RÉSILIENCE
□ Circuit breaker + backoff exponentiel (2 retries, timeout 8s)
□ Mode dégradé UI opérationnel (formulaire manuel + texte conservé)
□ OCR pipeline économique (Textract → Haiku → Sonnet fallback)

OBSERVABILITÉ
□ llm_invoice_logs alimenté (prompt, réponse IA, correction user, latence)
□ ai_preference_data alimenté (triplets pour Golden Dataset)
□ Golden Dataset ≥ 50 cas TVA BE/FR validés
□ Test de non-régression automatisé avant tout changement de modèle
□ Seuil drift 30% → system_alerts déclenché

LÉGAL / HITL
□ HITL tracé dans audit_logs (UUID + timestamp + user_id + IP + fields_corrected)
□ Override guardrail tracé avec disclaimer explicite
□ Trigger SQL immuabilité sur invoices (status sent/paid)
□ Quota OCR par plan (Free: 10 — Starter: 50 — Pro: 200 scans/mois)
```

---

*Dernière mise à jour : 21 mars 2026*  
*Références : Anthropic Constitutional AI · OWASP LLM Top 10 · RGPD Art. 25 (Privacy by Design) · LLMOps Best Practices 2026*

---

## 20. PII Sanitization — Architecture hybride Client + Serveur

### Principe : défense en profondeur, latence < 30s garantie

```
CÔTÉ CLIENT (navigateur)     → Regex + NER local TensorFlow.js (0ms réseau)
         ↓ texte anonymisé
CÔTÉ SERVEUR (Edge Function) → Regex déterministes (filet de sécurité, ~2ms)
         ↓ texte doublement nettoyé
CLAUDE API                   → Zéro PII transmis
```

**Couche 1 — Client (latence ~0ms) :**
- Regex rapides : IBAN, TVA, email, téléphone → placeholders `[IBAN_0]`, `[EMAIL_1]`
- NER TFJS (modèle ~2MB) : noms propres → `[PERSON_0]`
- UX : surligner les PII masqués pour montrer la protection active à l'utilisateur

**Couche 2 — Serveur Edge Function (filet, ~2ms) :**
- Double vérification Regex si client manipulé
- Si une PII complexe passe : responsabilité de l'utilisateur (Privacy by Design — RGPD Art. 25)

**Analyse de menace :** un utilisateur qui désactive TFJS compromet ses propres données. InvoiceAI fournit un système sécurisé par défaut — l'auto-sabotage délibéré n'est pas couvert.

---

## 21. Circuit Breaker — UX exacte en mode dégradé

### Les 4 règles UX (failing gracefully)

```
1. ZERO PERTE       → texte conservé dans l'état React + localStorage
2. ZERO ERREUR TECH → message humain compréhensible, pas de stack trace
3. CHEMIN CLAIR     → formulaire manuel pré-rempli automatiquement
4. CONTINUITE       → texte original collé dans champ "Description" + presse-papiers
```

**Message affiché à l'utilisateur :**
```
⚠️ L'assistant IA est temporairement indisponible.
Votre texte a été conservé et pré-rempli dans le formulaire.
Continuez manuellement — l'IA sera de retour dans quelques minutes.

[Continuer manuellement →]   [Réessayer l'IA]
```

**Implémentation clé :**
```typescript
if (!claudeResult) {
  // Règle 1 + 4 : texte JAMAIS perdu
  updateInvoice({
    notes: userText,    // texte original conservé dans Notes
    lineItems: [{ description: userText, quantity: 1, unitPrice: 0, vatRate: 21 }],
  });
  await navigator.clipboard.writeText(userText).catch(() => null);
  setAiStatus('degraded');
}
```

---

## 22. Politique de conservation des logs LLM (RGPD)

### Durées de conservation

| Donnée | Durée | Justification |
|---|---|---|
| Prompt complet + réponse IA brute | **30 jours** | Opérationnel → effacé |
| Correction utilisateur (golden dataset) | **30 jours** | Drift detection → anonymisé |
| Métriques agrégées (latence, confidence) | **2 ans** | LLMOps sans PII |
| `audit_logs` actions financières | **7 ans** | Obligation légale comptable BE |
| Données sur demande Art. 17 RGPD | **Immédiat** | Droit à l'effacement |

### Anonymisation automatique pg_cron (chaque nuit à 2h)

```sql
-- Active pg_cron dans Supabase Dashboard → Extensions
SELECT cron.schedule('anonymize-llm-logs', '0 2 * * *', $$
  UPDATE llm_invoice_logs
  SET
    ai_json_raw     = jsonb_build_object('anonymized', true,
                        'item_count', jsonb_array_length(ai_json_raw->'items')),
    user_json_final = jsonb_build_object('anonymized', true,
                        'corrected_fields', fields_corrected),
    anonymized_at   = NOW()
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND anonymized_at IS NULL;

  DELETE FROM llm_invoice_logs WHERE created_at < NOW() - INTERVAL '2 years';
$$);
```

### Droit à l'effacement — Art. 17 RGPD

```typescript
// Sur demande utilisateur → anonymisation immédiate (pas d'attente 30j)
await supabase.from('llm_invoice_logs')
  .update({ ai_json_raw: { anonymized: true, gdpr_request: true }, anonymized_at: new Date().toISOString() })
  .eq('user_id', userId);

// Traçabilité obligatoire
await supabase.from('audit_logs').insert({
  user_id: userId, action: 'GDPR_ERASURE_REQUEST',
  metadata: { legal_basis: 'RGPD Art. 17', executed_at: new Date().toISOString() },
});
```

---

*Sections 20-22 ajoutées le 21 mars 2026 — Architecture hybride PII, UX dégradé, RGPD purge*