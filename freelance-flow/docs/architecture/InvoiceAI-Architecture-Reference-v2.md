# InvoiceAI — Architecture de Référence v2.0
> Business Project Flow · Mise à jour : 26 mars 2026  
> Stack : React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Supabase  
> Doctrine : **l'IA propose, le moteur décide, l'humain valide**  
> URL prod : https://invoiceai-template.vercel.app/demo

---

## ÉTAT DE PRODUCTION — 26 Mars 2026

| Module | Statut | Score |
|--------|--------|-------|
| Infrastructure Vercel | ✅ Variables corrigées, déployé | 100% |
| Stripe Checkout | ✅ 19€ Pro live, webhooks OK | 100% |
| Facturation core | ✅ Numérotation DB, snapshot, FIE bloquant | 100% |
| Sécurité SQL / RLS | ✅ 6 tables, multi-tenancy | 100% |
| BCE lookup | ✅ kbodata.be + fallback VIES + auto-fill | 100% |
| Peppol check | ✅ Edge Function + fallback EU directory | 100% |
| ClientVerificationCard | ✅ Intégrée dans InvoiceGenerator | 100% |
| Démo publique /demo | ✅ Sans auth, bêta-testeurs | 100% |
| Navbar mobile | ✅ Hamburger + Sheet | 100% |
| TVA i18n (12% BE) | ✅ 4 langues | 100% |
| UI/UX | ⚠️ Footer /privacy manquant | 95% |
| Email prod | ⚠️ Domaine à acheter, DNS Resend pending | 70% |
| Cockpit données réelles | ❌ RPC dashboard_kpis() non implémentée | 50% |
| audit_logs alimentés | ❌ Table créée, non peuplée | 15% |
| Relances J+7/J+15 | ❌ Non implémentées | 0% |
| Envoi UBL Peppol (Billit) | ❌ Post 10 clients | 0% |

---

## SPRINT 7 — Backlog Prioritaire

> Branche : `feat/sprint7-cockpit-kpis-audit-logs`

| # | Tâche | Impact | Temps | Prio |
|---|-------|--------|-------|------|
| 1 | Footer → lien /privacy | Légal obligatoire | 15 min | P0 |
| 2 | Anchor #pricing smooth scroll | UX landing page | 10 min | P0 |
| 3 | `decimal.js` dans `invoiceCalculations.ts` | Sécurité calculs financiers | 2h | P0 |
| 4 | RPC `dashboard_kpis()` Supabase | Cockpit données réelles | 2h | P1 |
| 5 | `audit_logs` alimentés (createInvoice + Edge Fn) | Conformité légale 7 ans | 2h | P1 |
| 6 | Resend DNS (domaine) | Email prod débloqué | 30 min | P1 |
| 7 | Relances auto J+7/J+15 (pg_cron + Resend) | Rétention critique | 4h | P2 |
| 8 | Cache `clients_cache` 30 jours | Performance BCE/Peppol | 1h | P2 |
| 9 | Persister `peppol_id` dans table `clients` | Évite rechargements réseau | 45 min | P2 |

---

## LES 3 PILIERS STRUCTURANTS

---

### PILIER 1 — Conformité Fiscale & Réseau Peppol

#### Justification Métier

Depuis janvier 2026, la Belgique impose le e-invoicing B2B via Peppol pour toutes les transactions entre assujettis TVA. Ce n'est pas une feature — c'est une **contrainte d'existence** : sans Peppol, un freelance IT belge expose ses clients à une TVA non déductible. Amendes : 1 500€ / 3 000€ / 5 000€. C'est le déclencheur d'urgence qui justifie l'abonnement Pro à 19€/mois sans friction.

#### Fichiers Clés

```
src/lib/bce-api.ts                           — Lookup BCE (kbodata.be → fallback VIES)
src/lib/peppol-check.ts                      — checkPeppol(digits: string) — 10 chiffres sans BE
src/pages/InvoiceGenerator.tsx               — Orchestration BCE + Peppol + auto-fill
src/components/invoice/ClientVerificationCard — UI 2 colonnes BCE / Peppol inline
src/lib/engine/financialIntegrity.ts         — FIE : mentions légales obligatoires
supabase/functions/peppol-check              — Edge Function proxy (évite le CORS browser)
vercel.json                                  — CSP headers production
```

#### Flux Technique — Live

```
Utilisateur saisit TVA BE (ex: BE0202239951)
  ↓ useEffect watch [invoice.clientVat] — debounce 800ms
  ↓ normalization : strip "BE" + points → 10 chiffres
  ↓ checkPeppol(digits) → supabase.functions.invoke("peppol-check")
     body: { vatDigits: "0202239951" }  ← 10 chiffres SANS BE (important)
  ↓ Edge Function → directory.peppol.eu (server-side, pas de CORS)
  ↓ PeppolResult.isRegistered → badge UI vert / orange
  ↓ [clic BCE] → lookupBce("BE0202239951") → kbodata.be
     → auto-fill : clientName + clientAddress + clientVat
  ↓ FIE vérifie : adresse présente, TVA valide, IBAN présent
  ↓ Si FIE.isLegal = false → bouton "Enregistrer" bloqué (isSaveBlocked)
```

#### Chaîne de Liaisons

```
Supabase DB (invoices — colonnes issuer_* snapshot immuables)
  └── useInvoices.ts → createInvoice()
        └── InvoiceGenerator.tsx
              ├── ClientVerificationCard (BCE/Peppol 2 colonnes)
              ├── InvoiceForm (clientLocked si client DB sélectionné)
              └── FIEChecklist (audit conformité temps réel)

APIs externes
  ├── kbodata.be → bce-api.ts → updateInvoice({clientName, clientAddress, clientVat})
  └── directory.peppol.eu → peppol-check Edge Fn → PeppolResult.isRegistered → badge UI
```

#### Statut & Dette Technique

| Composant | Statut | Gap vers Grade Bancaire |
|-----------|--------|------------------------|
| BCE lookup | ✅ Live — kbodata.be + VIES | Cache 30j manquant (`clients_cache` non créée) |
| Peppol check | ✅ Live — Edge Fn déployée | Résultat non persisté → rechargement à chaque session |
| ClientVerificationCard | ✅ Live — intégrée InvoiceGenerator | — |
| Envoi UBL Peppol | ❌ Non implémenté | `ublMapping.ts` + Billit API + Schematron absents |
| FIE mentions légales | ✅ Live — bloquant save | `decimal.js` non utilisé — float JS sur montants |
| `audit_logs` | ⚠️ Table créée, non alimentée | **Dette critique** — obligation légale 7 ans |

> **Zone d'ombre** : le résultat du check Peppol n'est pas persisté dans la colonne `peppol_id` de la table `clients`. Chaque session refait l'appel réseau. Fix prévu Sprint 7.

---

### PILIER 2 — Financial Integrity Engine (FIE)

#### Justification Métier

Un LLM est **probabiliste** ; la comptabilité est **déterministe**. Cette collision est le risque central de tout produit IA financier. Une facture avec un total TVA incorrect envoyée sur Peppol est une faute légale engageant la responsabilité du freelance. Le FIE est le **firewall arithmétique et légal** entre la suggestion IA et la facture légalement opposable.

#### Fichiers Clés

```
src/lib/engine/financialIntegrity.ts  — Moteur validation mentions légales
src/lib/invoiceCalculations.ts        — Calculs HT/TVA/TTC (⚠️ float JS — à migrer decimal.js)
src/lib/vatScenario.ts               — Whitelist déterministe taux TVA (14 scénarios BE/FR)
src/lib/ai/sanitizer.ts              — Nettoyage output Claude avant FIE
src/lib/ai/prompts.ts               — Claude ne retourne JAMAIS de montants calculés
```

#### Les 12 Règles Doctrine

```
1.  L'IA propose — ton code calcule. Claude ne retourne jamais de montants.
2.  Decimal.js pour tout calcul financier. ⚠️ NON ENCORE IMPLÉMENTÉ — DETTE P0.
3.  Whitelist déterministe pour les taux TVA — jamais confié au LLM.
4.  HITL obligatoire avant toute write action légale.
5.  Modèle épinglé, jamais "latest". MAJ modèle = rerun golden dataset.
6.  Asynchrone pour tout ce qui touche des dépendances externes.
7.  Idempotence sur toute opération financière critique.
8.  RLS comme dernier rempart — refuse accès cross-tenant.
9.  Aucune PII dans les prompts Claude.
10. Mode dégradé manuel toujours disponible.
11. Logs avec redaction automatique (IBAN, TVA, email → [REDACTED]).
12. La facture émise est immuable — correction = note de crédit.
```

#### Pipeline de Validation

```
Claude output (JSON brut — items[] sans montants calculés)
  ↓ sanitizer.ts — strip PII, valider structure Zod
  ↓ financialIntegrity.ts — validateLegalMentions()
      ├── CHECK: issuer_vat_number format BE/FR valide
      ├── CHECK: issuer_iban présent
      ├── CHECK: client_address présent (si B2B)
      └── CHECK: MATH_ERROR — recalcul indépendant vs total déclaré
  ↓ Si errors.length > 0 → isSaveBlocked = true
  ↓ Si isLegal = true → createInvoice() autorisé
```

#### Statut & Dette Technique

| Composant | Statut | Gap vers Grade Bancaire |
|-----------|--------|------------------------|
| Validation mentions légales | ✅ Live — bloquant save | — |
| Séparation IA / calcul | ✅ Architectural | — |
| `decimal.js` arithmétique | ❌ **Non implémenté** | **DETTE BLOQUANTE** — float JS = risque arrondi légal |
| Whitelist TVA | ✅ `vatScenario.ts` | TVA 12% BE hors scope V1 selon `vatRules.ts` |
| HITL avant Peppol | ❌ Non implémenté | Checkbox confirmation avant envoi UBL manquante |
| Golden dataset tests | ❌ Non implémenté | 50 cas documentés, aucun test automatisé |
| `llm_invoice_logs` | ❌ Non alimenté | Audit trail IA absent |

> **Zone d'ombre** : le lien `sanitizer.ts → prompts.ts → Claude API` n'est pas confirmé dans le code actuel. La génération IA via description texte libre (feature Sprint 4) n'est pas implémentée — seule la saisie manuelle est live.

---

### PILIER 3 — Intelligence Financière & DSO

#### Justification Métier

Le vrai problème du freelance IT n'est pas de créer une facture — c'est **d'être payé**. Le DSO moyen en Belgique pour les indépendants est de 42 jours (légal : 30 jours). Chaque jour de retard = trésorerie immobilisée. L'intelligence financière transforme InvoiceAI d'un outil de saisie en **copilote de trésorerie**. C'est le pilier qui justifie la rétention long terme et l'upgrade vers Pro.

#### Fichiers Clés

```
src/pages/DashboardCockpit.tsx    — Interface principale (KPIs + activité)
src/hooks/useInvoices.ts          — Source de données réelles (Supabase)
supabase/functions/dashboard_kpis — RPC Supabase (❌ non implémentée)
src/lib/planLimits.ts             — Enforcement limites par plan
```

#### Ce qui est Live vs Mocké

```
✅ LIVE    useInvoices.ts → liste factures réelles depuis Supabase
✅ LIVE    DashboardCockpit → affichage statuts réels
✅ LIVE    Stripe → plan Pro détecté et enforced (19€)

❌ MOCKÉ   KPIs (CA mois, taux recouvrement, DSO) → données hardcodées
❌ MOCKÉ   Relances J+7/J+15 → non implémentées
❌ MOCKÉ   Alertes factures en retard → non implémentées
```

#### Architecture Cible — RPC dashboard_kpis()

```sql
CREATE OR REPLACE FUNCTION dashboard_kpis(p_user_id UUID)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'ca_mois',      SUM(total) FILTER (
                      WHERE DATE_TRUNC('month', issue_date) = DATE_TRUNC('month', NOW())
                    ),
    'impayees',     COUNT(*) FILTER (
                      WHERE status = 'sent' AND due_date < NOW()
                    ),
    'dso_moyen',    AVG(EXTRACT(DAY FROM paid_at - issue_date)) FILTER (
                      WHERE status = 'paid'
                    ),
    'recouvrement', ROUND(
                      100.0 * COUNT(*) FILTER (WHERE status = 'paid')
                      / NULLIF(COUNT(*), 0), 1
                    )
  )
  FROM invoices
  WHERE user_id = p_user_id;
$$;
```

#### Architecture Cible — Relances J+7/J+15

```
pg_cron (quotidien 08h00)
  └── scan : invoices WHERE status='sent' AND due_date < NOW() - INTERVAL '7 days'
        └── async_jobs INSERT (job_type='send_email', template='relance_j7')
              └── Edge Function job-worker
                    └── Resend API → email relance client
                          └── audit_logs INSERT (action='invoice.relance_sent')
```

#### Statut & Dette Technique

| Composant | Statut | Gap vers Grade Bancaire |
|-----------|--------|------------------------|
| Liste factures réelles | ✅ Live | — |
| KPIs CA / DSO | ❌ **Mocké** | RPC `dashboard_kpis()` à écrire — Sprint 7 |
| Détection retards paiement | ❌ Non implémenté | Query `due_date < NOW() AND status='sent'` |
| Relances J+7/J+15 | ❌ Non implémenté | `pg_cron` + template Resend + `audit_logs` |
| Export CSV comptable | ❌ Non implémenté | Feature V3 |
| DSO prédictif par client | ❌ Non implémenté | Feature V2 — nécessite historique suffisant |
| `async_jobs` table | ⚠️ Définie en archi | Statut implémentation DB Supabase non confirmé |

> **Zone d'ombre** : la table `async_jobs` est définie dans l'architecture de référence mais son existence réelle dans la DB Supabase n'est pas confirmée. Sans elle, les relances et l'envoi Peppol asynchrone sont impossibles.

---

## MATRICE DE MATURITÉ GLOBALE

```
                    PILIER 1           PILIER 2           PILIER 3
                    Peppol / BCE       FIE / IA           Intelligence DSO
                    ─────────────      ─────────────      ─────────────
Fondations          ████████░░ 80%     ███████░░░ 70%     █████░░░░░ 50%
Sécurité / Légal    ███████░░░ 70%     ██████░░░░ 60%     ████░░░░░░ 40%
Grade Bancaire      ████░░░░░░ 40%     ███░░░░░░░ 30%     ██░░░░░░░░ 20%
```

### Les 3 Dettes Critiques à Solder en Sprint 7

```
DETTE 1 — decimal.js
  → src/lib/invoiceCalculations.ts
  → Risque légal immédiat : float JS sur montants financiers (arrondi non conforme)
  → Temps : 2h · Priorité : P0

DETTE 2 — audit_logs alimentés
  → createInvoice() + Edge Functions critiques (send-invoice-email, stripe-webhook)
  → Obligation légale : conservation 7 ans (contrôle fiscal belge)
  → Temps : 2h · Priorité : P1

DETTE 3 — RPC dashboard_kpis()
  → Supabase SQL + hook useKpis() + DashboardCockpit wiring
  → Cockpit données réelles (actuellement 50% mocké)
  → Temps : 2h · Priorité : P1
```

---

## DÉCOUPAGE SYNCHRONE / ASYNCHRONE

```
SYNCHRONE (réponse immédiate)              ASYNCHRONE (arrière-plan)
──────────────────────────────             ──────────────────────────
✅ Validation FIE + Zod                   ✅ Génération PDF final
✅ Calcul Financial Integrity Engine       ❌ Envoi Peppol via Billit (non impl.)
✅ Appel Claude API (génération brouillon) ✅ Emails transactionnels (Resend)
✅ Sauvegarde brouillon en DB             ⚠️ Validation TVA VIES (semi-live)
✅ Affichage brouillon pour relecture      ✅ Webhooks Stripe
✅ Stripe checkout (redirect)             ❌ Relances J+7/J+15 (non impl.)
✅ BCE lookup (synchrone UX)              ❌ Export CSV comptable (V3)
✅ Peppol check (synchrone UX)
```

> **Règle absolue** : tout ce qui touche Billit, Resend, VIES, export passe en asynchrone. L'utilisateur ne doit jamais attendre Peppol pour voir sa facture confirmée.

---

## ROADMAP PRODUIT

| Version | Features | Détail | Statut |
|---------|----------|--------|--------|
| V1 | Facturation core | Création, PDF, FIE, snapshot, numérotation DB | ✅ Livré |
| V1 | Auth + RLS | Supabase Auth, 6 tables, multi-tenancy | ✅ Livré |
| V1 | BCE + Peppol check | Auto-fill + badge conformité inline | ✅ Sprint 6 |
| V1 | Stripe | Plans 0/9/19/39€, checkout, webhooks | ✅ Livré |
| V1.5 | Cockpit données réelles | RPC `dashboard_kpis()` + hook | 🟠 Sprint 7 |
| V1.5 | audit_logs | Conformité légale 7 ans | 🟠 Sprint 7 |
| V1.5 | decimal.js | Sécurité calculs financiers | 🟠 Sprint 7 |
| V1.5 | Relances J+7/J+15 | Claude + Resend | 🟠 Sprint 7 |
| V2 | Envoi UBL Peppol | Billit API + mapping EN16931 | 🔵 Post 10 clients |
| V2 | IA génération facture | Claude description → items structurés | 🔵 Post 10 clients |
| V2.5 | Portail client | Lien sécurisé + paiement Stripe | 🔵 V2.5 |
| V2.5 | Boîte réception Peppol | Factures fournisseurs centralisées | 🔵 V2.5 |
| V3 | Assistant RAG Fiscal | Réponses TVA sans hallucination | 🔵 V3 |
| V3 | Export comptable | WinBooks / Horus / Octopus | 🔵 V3 |
| V4 | France e-facturation | PDP français, e-reporting 2027 | 🔵 V4 |

---

## PLANS TARIFAIRES

| Plan | Prix | Inclus |
|------|------|--------|
| **Free** | 0€ | 3 factures/mois, PDF, 1 profil entreprise |
| **Starter** | 9€/mois | 20 factures, PDF + email, Peppol émission |
| **Pro** | 19€/mois | Factures illimitées, réception Peppol, pièces jointes |
| **Business** | 39€/mois | Multi-entreprises, export comptable, IA génération, support |

> ⚠️ Déductible à 120% en Belgique (2024–2027) — argument commercial prioritaire.

---

## RÈGLES D'OR IMMUABLES

```
1. Snapshot émetteur
   Toute facture générée DOIT utiliser les colonnes issuer_* (snapshot immuable).
   Jamais recharger depuis le profil live pour une facture existante.

2. Note de crédit obligatoire
   Une facture validée ne peut JAMAIS être modifiée directement.
   Correction = note de crédit + nouvelle facture.

3. Numérotation séquentielle
   Générée côté DB uniquement (generate_invoice_number()), jamais côté client.
   Sans trou, par année fiscale — obligatoire légalement.

4. country_code systématique
   Sur toutes les entités pour l'architecture multi-pays BE/FR.

5. RLS comme dernier rempart
   La base refuse les accès cross-tenant même si le code applicatif est faillible.

6. Aucune PII dans les prompts Claude
   Descriptions de prestations uniquement — jamais nom/email/IBAN/TVA.
```

---

*Business Project Flow · InvoiceAI · Architecture de Référence v2.0 · 26 mars 2026*  
*Ce document remplace la v1.0 du 16 mars 2026 — à maintenir à chaque décision technique majeure*