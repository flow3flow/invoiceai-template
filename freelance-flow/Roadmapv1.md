# InvoiceAI — Roadmap & Vision Produit
> Business Project Flow · Flow · 25 mars 2026
> Stack : React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Supabase
> Marché : Freelances & indépendants belges et français
> URL prod : invoiceai-template.vercel.app

---

## 🟢 État actuel — MVP 100% livré en production

### ✅ Fonctionnalités livrées (sessions 20-25 mars 2026)

| Module | Détail | Statut |
|---|---|---|
| Auth & Sécurité | Supabase Auth, RLS 6 tables, multi-tenancy `business_profiles` | ✅ Prod |
| Facturation | Facture / Devis / BC / Note de crédit — 4 types de documents | ✅ Prod |
| Numérotation | Séquentielle atomique DB (`get_next_invoice_number`) INV/DEV/BC/NC | ✅ Prod |
| TVA BE/FR | 14 scénarios (Art. 39bis, Art. 21§2, Art. 44, Art. 56bis, Art. 293B...) | ✅ Prod |
| TVA belge complète | 4 taux : 21 %, 12 %, 6 %, 0 % | ✅ Prod |
| Immuabilité SQL | Triggers `tr_protect_invoices_update` + `tr_protect_invoices_delete` | ✅ Validé |
| Snapshot émetteur | Colonnes `issuer_*` — intégrité fiscale garantie | ✅ Prod |
| Référence structurée | `+++XXX/XXXX/XXXXX+++` modulo 97 — obligation légale BE | ✅ Prod |
| Note de crédit | Workflow légal complet (AR n°1 art. 54 BE / CGI art. 289 FR) | ✅ Prod |
| PDF | Mentions légales automatiques selon scénario TVA | ✅ Prod |
| Financial Integrity Engine | Decimal.js strict — zéro float natif — blocage si non conforme | ✅ Prod |
| FIE sur UI | Audit checklist temps réel + bouton bloquant si `!isLegal` | ✅ Prod |
| Dashboard Free | KPI réels Supabase, filtres, badges statuts, convertToInvoice | ✅ Prod |
| DashboardCockpit Pro | CA MTD vs Objectif, Encours LIVE, DSO, Alertes Relance, ClientSheet | ✅ Prod |
| Routing conditionnel | Free → Dashboard / Pro\|Business → Cockpit | ✅ Prod |
| IA Layer 1+2 | `sanitizer.ts` (PII) + `prompts.ts` (system prompt Claude) | ✅ Posé |
| Privacy Policy | RGPD v2.1 — double rôle Art.28 — doctrine IA — Schrems II | ✅ Prod |
| CSP Headers | `vercel.json` — XSS, HSTS, X-Frame-Options, Permissions-Policy | ✅ Prod |
| Stripe | Plans Free/9€/19€/39€, checkout fonctionnel, webhooks | ✅ Prod |
| Email | Resend + PDF en pièce jointe (sandbox — domaine à vérifier) | 🟠 Sandbox |
| Landing page | i18n 4 langues (FR/EN/NL/DE), pricing annuel/mensuel, testimonials | ✅ Prod |

---

## 🎯 Sprint 4 — En cours (branche `feat/sprint4-branding-dns-resend`)

### Priorité immédiate

| Tâche | Effort | Impact |
|---|---|---|
| Footer → lien `/privacy` | 15 min | Légal obligatoire |
| Anchor `#pricing` scroll smooth | 10 min | UX landing |
| Resend DNS (dès achat domaine) | 30 min | Emails délivrés |
| `audit_logs` alimentés | 2h | Conformité 7 ans |
| Relances auto J+7/J+15 | 4h | Rétention critique |

### RPC Supabase `dashboard_kpis()` — KPIs réels pour DashboardCockpit

```sql
CREATE OR REPLACE FUNCTION dashboard_kpis(p_user_id uuid)
RETURNS json AS $$
SELECT json_build_object(
  'ca_mtd',      COALESCE(SUM(total) FILTER (WHERE date_trunc('month', issue_date) = date_trunc('month', NOW())), 0),
  'encours',     COALESCE(SUM(total) FILTER (WHERE status IN ('sent', 'overdue')), 0),
  'retards',     COUNT(*) FILTER (WHERE status = 'overdue'),
  'retards_montant', COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0),
  'peppol_ok',   0  -- Sprint 5 (Billit)
)
FROM invoices
WHERE user_id = p_user_id
  AND document_type = 'invoice';
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 🟠 Sprint 5 — Après 1er client payant

### Relances automatiques (impact MRR : très élevé)

Les freelances détestent réclamer leur argent. Automatiser justifie 100% l'abonnement Pro.

- Cron job Supabase Edge Function — scan quotidien des factures `sent` + `overdue`
- J+7 : email de relance douce (template Resend)
- J+15 : email de relance ferme + mention pénalités légales
- J+30 : alerte dans le Dashboard + suggestion note de crédit
- Log dans `audit_logs`

### Pièces jointes sur factures

- Upload : PDF, image, Excel → Supabase Storage bucket `invoice-attachments`
- Colonne `attachments JSONB` en DB
- Envoi automatique en PJ avec Resend
- Affiché dans Dashboard avec aperçu

### `audit_logs` alimentés

Table créée mais non alimentée. Obligation légale — conservation 7 ans.

Actions à tracer : création facture, changement statut, note de crédit, envoi email, modification profil, connexion.

---

## 🟡 Sprint 6 — Après 10 clients

### Peppol émission UBL 2.1 (Billit API)

Obligation légale belge depuis le 1er janvier 2026. Sans Peppol, le client B2B ne peut pas déduire sa TVA. Amendes : 1 500€ / 3 000€ / 5 000€.

- Génération XML UBL 2.1 (mapping EN16931)
- Envoi via Billit API (point d'accès Peppol certifié)
- Statut de transmission dans le Dashboard
- Webhook retour confirmation destinataire
- HITL obligatoire avant envoi (tracé `audit_logs`)
- Architecture `ublMapping.ts` + validation Schematron déjà documentée

### Validation BCE/VIES real-time

- API `kbodata.be` → fallback VIES pour numéros BE
- Whitelist TVA — rejet si taux non conforme
- Badge "BCE Vérifié" / "Peppol Actif" dans fiche client
- Impact : zéro rejet Peppol pour facture mal formée

### Factures récurrentes

- Modèle → fréquence mensuelle/trimestrielle/annuelle
- Génération auto via Edge Function cron
- Notification email avant envoi
- Cible : freelances IT avec retainers (3 000€/mois × 6 mois)

---

## 🔵 Sprint 7-12 — Croissance & Différenciation IA

### S7 — IA génération de facture (moat principal)

Le différenciateur absolu vs Billit/Accountable/Falco. Aucun concurrent ne fait ça.

```
Utilisateur : "Développement React 15j à 700€/j pour AnaDevConsulting mars 2026"
Claude Haiku → JSON structuré (description, quantité, prix, TVA)
FIE → recalcul déterministe (jamais faire confiance à l'IA pour les maths)
HITL → validation humaine obligatoire avant sauvegarde
```

Architecture posée : `sanitizer.ts` + `prompts.ts` + `financialIntegrity.ts` ✅

### S8 — Portail Client self-serve (viralité)

Le client du freelance reçoit un lien sécurisé pour voir sa facture.
Footer "Powered by InvoiceAI" → canal d'acquisition gratuit.
Paiement intégré sur le portail (Stripe/Mollie/Bancontact).

### S9 — Assistant RAG Fiscal

Architecture RAG — répond aux questions TVA sans halluciner.
"Mon client est en France, quelle TVA appliquer ?" → réponse légale précise.
Agit comme mini-comptable pour les cas standards.

### S10 — Insights IA Trésorerie

"Ce client paie avec 15j de retard en moyenne → demandez un acompte."
DSO prédictif par client.
Alerte préventive avant l'échéance.

### S11 — MLOps & Drift Detection

Suivi taux de correction manuelle LLM (`llm_invoice_logs`).
Si correction_rate > 30% sur un champ en 7 jours → drift détecté → révision prompt.
Table `ai_preference_data` pour RLHF futur.

### S12 — Boucle de Parrainage

"Offrez 1 mois, gagnez 1 mois."
Acquisition virale directe — coût acquisition = 0€.

---

## 💰 Plans tarifaires

| Plan | Prix | Factures/mois | Features clés |
|---|---|---|---|
| **Free** | 0€ | 3/mois | PDF, 1 profil entreprise |
| **Starter** | 9€/mois | 20/mois | PDF + email, Peppol émission |
| **Pro** | 19€/mois | Illimitées | Dashboard Cockpit, relances auto, pièces jointes, notes de frais |
| **Business** | 39€/mois | Illimitées | Multi-entreprises illimité, IA génération, export comptable, support prioritaire |

> 💡 **Argument commercial fort :** Déductible à **120%** en Belgique (2024-2027).
> À 19€/mois, le coût réel après déduction = **~8€/mois**.

### Mécanique d'upsell

La frustration est le meilleur levier.

```
Plan Free    → voit les 3 factures/mois atteintes → "Passer Starter"
Plan Starter → voit ses factures overdue en rouge → "Activer relances auto (Pro)"
Plan Pro     → voit ses 3 profils max → "Passer Business"
```

---

## 📊 KPIs à tracker

| KPI | Définition | Seuil alerte |
|---|---|---|
| **Time-to-Value** | Sign-up → 1ère facture Peppol créée | > 5 minutes |
| **DSO moyen** | Délai paiement clients des freelances | Hausse > 10% |
| **LLM Correction Rate** | Fréquence correction JSON Claude | > 30% sur 7j |
| **Churn Net mensuel** | % abonnés perdus / mois | > 3-4% |
| **MRR** | Monthly Recurring Revenue | Cible S6 : 2k€ / S12 : 8k€ |

---

## 🎯 Positionnement produit

### Versus concurrents

| | InvoiceAI | Accountable | Billit | Falco |
|---|---|---|---|---|
| Prix entrée | 0€ | 0€ | 7,5€ | 3,5€ |
| **IA génération** | ✅ S7 | ❌ | ❌ | ❌ |
| **BE + FR** | ✅ | ❌ | ❌ | ❌ |
| **FIE — calculs déterministes** | ✅ | ❌ | ❌ | ❌ |
| **Mentions légales auto 14 scénarios** | ✅ | ❌ | ❌ | ❌ |
| **Dashboard Cockpit DSO** | ✅ | ❌ | ❌ | ❌ |
| Peppol émission | 🟡 S6 | ✅ | ✅ | ✅ |
| Notes de frais | 🟡 S6 | ✅ | ✅ | ✅ |
| Comptabilité complète | ❌ | ✅ | 🟡 | 🟡 Horus |

### Forces actuelles vs concurrents

**vs Billit :** Interface lourde, pensée comptables. InvoiceAI = UX mobile-first, 30 secondes, pas de formation requise.

**vs FreshBooks :** Produit nord-américain générique. Zéro connaissance Peppol/BCE/mentions légales BE/FR.

**vs Accountable :** Domine la fiscalité et les déclarations. InvoiceAI doit rester le roi de la facturation B2B IA + trésorerie.

### Pitch

```
InvoiceAI = le seul outil de facturation BE+FR
avec IA générative + conformité Peppol + DSO tracking
pour freelances et indépendants.
9€/mois. Conforme. Prêt en 30 secondes.
```

### Cible V1

Freelance IT belge, numéro TVA actif, 5-20 factures/mois, pas de comptable ou comptable minimaliste. Cherche à facturer vite et conforme sans gérer une comptabilité complète.

---

## 🏗️ Architecture technique

```
Frontend    React 18 + TypeScript strict + Vite + Tailwind + shadcn/ui
Backend     Supabase (PostgreSQL + Auth + Storage + Edge Functions)
PDF         @react-pdf/renderer
Email       Resend (Edge Functions — domaine sandbox → prod dès domaine acheté)
Paiement    Stripe (webhooks via Edge Functions — test mode)
Peppol      Billit API (Sprint 6)
OCR         Sprint 6 (Mindee ou Google Vision)
IA          Claude API Anthropic (Sprint 7)
Banque      Isabel/Ponto API (Sprint 8)
Déploiement Vercel (prod — invoiceai-template.vercel.app)
```

### Règles d'or immuables

```
1. SNAPSHOT ÉMETTEUR     Toute facture utilise issuer_* — jamais le profil live
2. NOTE DE CRÉDIT        Facture validée = JAMAIS modifiable directement
3. NUMÉROTATION DB       get_next_invoice_number() côté DB uniquement, jamais client
4. COUNTRY_CODE          Systématique sur toutes les entités (multi-pays)
5. PAS Intl.NumberFormat Instable PDF/Edge — formatage manuel uniquement
6. JAMAIS catch(e: any)  Typer PostgrestError, logger ET remonter à l'UI
7. FIE OBLIGATOIRE       Aucune facture sauvegardée sans isLegal = true
8. DECIMAL.JS            Jamais float natif pour les calculs financiers
```

---

## 📁 Branches Git

```
main                              ✅ Production — deploiement auto Vercel
feat/sprint4-branding-dns-resend  🟢 Active
feat/sprint3-resend-csp-relances  ✅ Mergé
feat/sprint2-dev                  ✅ Mergé
```

---

## 📈 Projections MRR

| Scénario | Part marché | Clients | MRR estimé |
|---|---|---|---|
| Conservateur | 0,1% | 1 200 | ~22 800€ |
| Réaliste | 0,5% | 6 000 | ~114 000€ |
| Optimiste | 1% | 12 000 | ~228 000€ |

*Marché adressable : 1,2M indépendants BE + 4,1M TPE FR*

**Projection court terme :**
- S6 (3 mois) : 2 000€ MRR — 100 clients payants
- S12 (6 mois) : 8 000€ MRR — 400 clients payants (avec viralité portail client)

---

*Dernière mise à jour : 25 mars 2026*
*Branche active : feat/sprint4-branding-dns-resend*