# InvoiceAI — Facturation Intelligente BE/FR

<div align="center">

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Peppol](https://img.shields.io/badge/Peppol-Ready-orange)
![Security](https://img.shields.io/badge/Security-42%2F100-red)
![MVP](https://img.shields.io/badge/MVP-82%25-yellow)
![License](https://img.shields.io/badge/license-MIT-black)

**La première app de facturation belge pensée exclusivement pour les indépendants et TPE.**  
Tu décris ta prestation → l'IA génère ta facture conforme Peppol → elle part en 30 secondes.

[🚀 Demo live](#) · [📖 Docs](#installation) · [🐛 Issues](https://github.com/flow3flow/invoiceai-template/issues)

</div>

---

## Pourquoi InvoiceAI existe

> **Depuis le 1er janvier 2026, toutes les factures B2B entre assujettis TVA belges doivent être électroniques (format UBL) et transiter via le réseau Peppol.** Le PDF envoyé par email n'est plus légalement valable pour le B2B.

**Le problème :** 1,2 million d'indépendants belges concernés. La majorité utilisait encore Word + PDF. Les solutions existantes (Odoo, Billit, Falco) sont complexes, chères ou pensées pour des entreprises de 10 personnes minimum.

**Notre réponse :** Le scalpel laser face au couteau suisse Odoo.

| | Odoo | Billit / Falco | **InvoiceAI** | Word + PDF |
|---|---|---|---|---|
| Cible | PME 10-500p | Comptables / PME | **Freelances / TPE** | Tout le monde |
| Prix | 300€+/mois | Variable | **9–19€/mois** | 0€ (illégal B2B) |
| IA générative | ❌ | ❌ | **✅ Cœur produit** | ❌ |
| Peppol 2026 | ✅ | ✅ Natif | ✅ Via API *(Sprint 3)* | ❌ Illégal |
| BCE + Peppol check | ❌ | ❌ | **✅ Natif** | ❌ |
| Mentions légales auto | ❌ | ❌ | **✅ 14 scénarios** | ❌ |
| Onboarding | Semaines | Jours | **2 minutes** | Immédiat |
| UX moderne | Lourd | Fonctionnel | **✅ Premium** | N/A |

---

## Fonctionnalités livrées ✅ (MVP ~82%)

### Facturation complète
- Création factures, devis, bons de commande (`DocumentType`)
- Numérotation séquentielle DB sans trou (`generate_invoice_number()`)
- Calcul TVA automatique — 14 scénarios BE/FR (Art. 39bis, 21§2, 44, 56bis, 293B...)
- Snapshot émetteur immuable (`issuer_*`) — intégrité fiscale garantie
- Référence structurée belge `+++XXX/XXXX/XXXXX+++` (modulo 97)
- Note de crédit workflow légal (AR n°1 art. 54 BE / CGI art. 289 FR)

### Dashboard financier
- KPI : total facturé, payé, en attente, en retard
- Graphique CA 6 mois (Recharts) + donut statuts
- Recherche et filtre par statut en temps réel
- Téléchargement PDF depuis le dashboard

### Clients — BCE + Peppol
- Lookup Banque Carrefour des Entreprises (kbodata.be → fallback VIES)
- Vérification Peppol via directory officiel
- Toggle personne physique B2C / morale B2B
- Badge Peppol actif / non enregistré

### Onboarding
- Wizard 3 steps (profil → client → terminé)
- `OnboardingGuard` — redirect automatique anti-boucle

### SaaS & Auth
- Supabase Auth + RLS 6 tables — isolation multi-tenant
- Stripe plans Free / 9€ / 19€ / 39€ + webhooks
- Email Resend + PDF en pièce jointe
- 5 Edge Functions déployées

---

## 🔴 Failles critiques — À corriger avant 1er client payant

### 1. Trigger immuabilité SQL (LÉGAL — URGENT)
Une facture `sent` ou `paid` est actuellement modifiable. Illégal fiscalement.

```sql
CREATE OR REPLACE FUNCTION block_invoice_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('sent', 'paid') THEN
    RAISE EXCEPTION 'Facture immuable — créez une note de crédit (AR n°1 art. 54)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invoice_immutability
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION block_invoice_update();
```

### 2. Auth JWT manquante sur Edge Functions
`bce-lookup` et `peppol-check` déployées `--no-verify-jwt` → n'importe qui peut les appeler.

### 3. Score sécurité : 42/100
- ❌ CSP headers absents dans `vercel.json`
- ❌ Rate limiting Claude absent (risque DoS économique)
- ❌ `audit_logs` table non alimentée (obligation légale 7 ans)
- ❌ Bucket Storage à passer en privé + URL signées

### 4. Privacy Policy RGPD manquante
Page `/privacy` obligatoire avant tout utilisateur réel.

---

## Roadmap

### 🟠 Sprint 2 — Après 1er client
- [ ] Trigger immuabilité SQL ← **urgent légal**
- [ ] Relances auto J+7/J+15
- [ ] Decimal.js (remplace float natif — intégrité financière)
- [ ] `audit_logs` alimentés (qui/quoi/quand/IP)
- [ ] Privacy Policy RGPD
- [ ] Conversion Devis → Facture en 1 clic
- [ ] Statuts devis/BC (brouillon/envoyé/accepté/refusé)
- [ ] Dashboard empty state proactif ("3 factures en retard, relancer ?")
- [ ] Domaine Resend vérifié

### 🟡 Sprint 3 — Après 10 clients
- [ ] **Peppol émission UBL 2.1** via Billit API ← obligation légale B2B BE
- [ ] Réception Peppol entrante (onglet "Achats")
- [ ] Notes de frais OCR
- [ ] Rate limiting Claude (20 req/h/user)
- [ ] HITL checkbox obligatoire avant envoi Peppol
- [ ] `llm_invoice_logs` + `vat_warnings`

### 🔵 Sprint 4 — Croissance
- [ ] **IA génération facture** (bouton ✨ déjà visible en Dashboard)
- [ ] Connexion bancaire Isabel/Ponto (matching paiements automatique)
- [ ] Export comptable Winbooks/Horus/Octopus
- [ ] France e-facturation 2027 (PDP)
- [ ] Relances IA générées par Claude

---

## Flux d'une facture — Vision complète

```
1. L'utilisateur décrit sa prestation en langage naturel
         ↓
2. Claude API génère lignes + TVA correcte + mentions légales
         ↓
3. L'utilisateur valide (HITL obligatoire)
         ↓
4. Supabase stocke (snapshot immuable, archivage 7 ans)
         ↓
5. Billit API convertit en UBL → réseau Peppol
         ↓
6. Resend envoie confirmation email + PDF visuel
         ↓
7. Dashboard mis à jour — CA, statuts, analytics
```

---

## Stack technique

| Couche | Technologie | Statut |
|---|---|---|
| Frontend | React 18 + TypeScript strict + Vite | ✅ Prod |
| Styles | Tailwind CSS + shadcn/ui (Radix) | ✅ Prod |
| Backend & Auth | Supabase (PostgreSQL + RLS + Edge Functions) | ✅ Prod |
| PDF | @react-pdf/renderer | ✅ Prod |
| Email | Resend (Edge Function) | ✅ Sandbox |
| Paiements | Stripe (Edge Function webhook) | ✅ Prod |
| BCE lookup | kbodata.be → fallback VIES | ✅ Prod |
| Peppol check | directory.peppol.eu (Edge Function) | ✅ Prod |
| IA générative | Claude API (Anthropic) | 🔵 Sprint 4 |
| Peppol émission | Billit API (UBL 2.1) | 🟡 Sprint 3 |
| Banque | Isabel/Ponto API | 🔵 Sprint 4 |
| Déploiement | Vercel | ✅ Prod |

---

## Architecture

```
freelance-flow/
├── src/
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives
│   │   ├── invoice/
│   │   │   ├── InvoiceForm.tsx        # Formulaire (docType conditionnel)
│   │   │   ├── InvoicePreview.tsx     # Aperçu PDF (docType dynamique)
│   │   │   ├── VatScenarioSelector.tsx
│   │   │   └── ClientSelect.tsx
│   │   └── OnboardingGuard.tsx
│   ├── pages/
│   │   ├── Index.tsx                  # Landing page
│   │   ├── Dashboard.tsx
│   │   ├── InvoiceGenerator.tsx       # Facture / Devis / BC
│   │   ├── Clients.tsx                # BCE + Peppol
│   │   ├── Onboarding.tsx             # Wizard 3 steps
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useInvoices.ts
│   │   ├── useClients.ts              # is_company + peppol_id
│   │   └── useBusinessProfiles.ts
│   ├── lib/
│   │   ├── vatScenario.ts             # 14 scénarios TVA BE/FR
│   │   ├── structured-ref.ts          # Modulo 97
│   │   ├── bce-api.ts                 # BCE lookup
│   │   └── peppol-check.ts            # Peppol check
│   └── types/
│       └── invoice.ts                 # DocumentType + InvoiceData
└── supabase/
    └── functions/
        ├── send-invoice-email/        # ACTIVE v9
        ├── create-checkout/           # ACTIVE v2
        ├── stripe-webhook/            # ACTIVE v2
        ├── bce-lookup/                # ACTIVE v2
        └── peppol-check/              # ACTIVE v1
```

---

## Base de données

### Tables principales

```
business_profiles   id · user_id · company_name · vat_number · street · zip_code
                    city · country_code · email · iban · logo_path · is_default

clients             id · user_id · name · company · email · street · zip_code
                    city · country_code · vat_number · is_company
                    peppol_id · peppol_verified_at · bce_verified_at

invoices            id · user_id · client_id · business_profile_id
                    invoice_number · status · issue_date · due_date
                    subtotal · vat_amount · total · notes · vat_scenario
                    document_type · validity_days · valid_until · client_reference
                    structured_ref · issuer_* (snapshot immuable)

invoice_items       id · invoice_id · description · quantity · unit_price · vat_rate

profiles            id · user_id · onboarding_completed · stripe_customer_id · plan
```

### Migrations appliquées (session 21 mars 2026)

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_company BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS peppol_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS peppol_verified_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bce_verified_at TIMESTAMPTZ;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS structured_ref TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'invoice'
  CHECK (document_type IN ('invoice','quote','order'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS validity_days INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_reference TEXT;

-- ⚠️ À appliquer immédiatement
CREATE TRIGGER enforce_invoice_immutability
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION block_invoice_update();
```

---

## Business Model

| Plan | Prix | Factures/mois | Features |
|---|---|---|---|
| **Free** | 0€ | 3/mois | PDF, 1 profil |
| **Starter** | 9€/mois | 20/mois | PDF + email + Peppol émission |
| **Pro** | 19€/mois | Illimitées | Tout Starter + pièces jointes + notes de frais |
| **Business** | 39€/mois | Illimitées | Multi-entreprises + export comptable + IA |

> 💡 Déductible à **120%** en Belgique (2024-2027) — argument commercial fort.

### Projections MRR

| Scénario | Part marché | Clients | MRR |
|---|---|---|---|
| Conservateur | 0,1% | 1 200 | ~22 800€ |
| Réaliste | 0,5% | 6 000 | ~114 000€ |
| Optimiste | 1% | 12 000 | ~228 000€ |

*Marché adressable : 1,2M indépendants BE + 4,1M TPE FR*

---

## Règles d'or immuables

```
1. SNAPSHOT ÉMETTEUR     Toute facture utilise issuer_* — jamais le profil live
2. NOTE DE CRÉDIT        Une facture validée ne se modifie JAMAIS directement
3. NUMÉROTATION DB       generate_invoice_number() côté DB uniquement, jamais client
4. COUNTRY_CODE          Systématique sur toutes les entités (multi-pays)
5. PAS Intl.NumberFormat Instable PDF/Edge — formatage manuel uniquement
6. JAMAIS catch(e: any)  Typer PostgrestError, logger ET remonter à l'UI
```

---

## Git — Branches

```
main                        ✅ Production
feat/sprint2-dev            🟢 Branche active
feat/client-bce-peppol      ✅ Mergé
feat/vat-pdf-fix-save       ✅ Mergé
feat/client-placeholders-ux ✅ Mergé
```

---

## Installation

```bash
git clone https://github.com/flow3flow/invoiceai-template.git
cd invoiceai-template/freelance-flow
npm install
cp .env.example .env.local
# Remplir les valeurs
npm run dev
# → http://localhost:8080
```

### Variables d'environnement

```env
VITE_SUPABASE_URL=https://ztdovijptfjrydrpjwab.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_STARTER=price_...
VITE_STRIPE_PRICE_PRO=price_...
VITE_STRIPE_PRICE_BUSINESS=price_...
```

> ⚠️ Ne jamais committer `.env.local` — il est dans `.gitignore`.

### Déployer une Edge Function

```bash
cd freelance-flow
supabase functions deploy <nom> --no-verify-jwt
```

---

## Contribution

```bash
git checkout -b feat/ma-fonctionnalite
git commit -m "feat: description claire"
git push origin feat/ma-fonctionnalite
# → Pull Request vers main
```

---

## Pitch

> *"InvoiceAI, c'est la première app de facturation belge pensée pour les indépendants — tu décris ta prestation, l'IA génère ta facture conforme Peppol, et elle part en 30 secondes."*

---

## Licence

MIT — voir [LICENSE](./LICENSE)

---

<div align="center">
Fait avec ❤️ pour les freelances de Belgique & France · Business Project Flow · 2026<br>
<sub>Dernière mise à jour : 21 mars 2026</sub>
</div>