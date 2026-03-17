# InvoiceAI — Facturation Intelligente BE/FR

<div align="center">

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Peppol](https://img.shields.io/badge/Peppol-Ready-orange)
![License](https://img.shields.io/badge/license-MIT-black)

**La première app de facturation belge pensée exclusivement pour les indépendants et TPE.**  
Tu décris ta prestation → l'IA génère ta facture conforme Peppol → elle part en 30 secondes.

[🚀 Demo live](#) · [📖 Docs](#installation) · [🐛 Issues](https://github.com/flow3flow/freelance-flow/issues)

</div>

---

## Pourquoi InvoiceAI existe

> **Depuis le 1er janvier 2026, toutes les factures B2B entre assujettis TVA belges doivent être électroniques (format UBL) et transiter via le réseau Peppol.** Le PDF envoyé par email n'est plus légalement valable.

**Le problème :** 1,2 million d'indépendants belges concernés. La majorité utilisait encore Word + PDF par email → désormais illégal. Les solutions existantes (Odoo, Billit, Falco) sont complexes, chères ou pensées pour de grandes entreprises.

**Notre réponse :** Le scalpel laser face au couteau suisse Odoo.

| | Odoo | Billit / Falco | **InvoiceAI** | Word + PDF |
|---|---|---|---|---|
| Cible | PME 10-500p | Comptables / PME | **Freelances / TPE** | Tout le monde |
| Prix | 300€+/mois | Variable | **9–19€/mois** | 0€ (illégal) |
| IA générative | ❌ | ❌ | **✅ Cœur produit** | ❌ |
| Peppol 2026 | ✅ | ✅ Natif | ✅ Via API *(roadmap)* | ❌ Illégal |
| Bilingue FR/NL | Partiel | Partiel | **✅ Natif** | Manuel |
| Onboarding | Semaines | Jours | **2 minutes** | Immédiat |
| UX moderne | Lourd | Fonctionnel | **✅ Premium** | N/A |

---

## Aperçu

| Light mode | Dark mode |
|---|---|
| ![Landing light](docs/screenshots/landing-light.png) | ![Landing dark](docs/screenshots/landing-dark.png) |
| ![Dashboard light](docs/screenshots/dashboard-light.png) | ![Dashboard dark](docs/screenshots/dashboard-dark.png) |
| ![Generator light](docs/screenshots/generator-light.png) | ![Generator dark](docs/screenshots/generator-dark.png) |

---

## Fonctionnalités actuelles ✅

### Dashboard financier
- Vue synthétique : total facturé, payé, en attente, en retard
- Graphique d'évolution du CA sur 6 mois (Recharts)
- Répartition des statuts en donut chart
- Recherche et filtre par statut en temps réel

### Génération de factures
- Création de factures avec lignes de prestation
- Calcul automatique de la TVA (21% / 6% / 0%) — conforme BE & FR
- Sélection client avec auto-remplissage des champs
- Sélection du profil entreprise émetteur
- Aperçu en direct avant sauvegarde
- Téléchargement PDF directement depuis le dashboard

### Statuts disponibles
`draft` · `sent` · `paid` · `overdue` · `cancelled`

### Gestion des clients
Stockage complet : nom, entreprise, email, adresse, ville, code postal, pays, numéro de TVA.
Les clients sont réutilisables sur toutes les factures.

### Profils d'entreprise multi-entités
Un compte = plusieurs profils d'entreprise.
Idéal pour les freelances avec plusieurs activités, agences multi-marques, ou consultants multi-structures.
Chaque profil : nom, TVA, adresse complète, email, IBAN.

### Sécurité SaaS-grade
- Row Level Security (RLS) Supabase — isolation totale des données par utilisateur
- Snapshot émetteur immuable sur chaque facture (`issuer_*`) — intégrité fiscale garantie
- RPC sécurisés (`set_default_business_profile`) via `auth.uid()` côté serveur
- Soft-delete sur les profils avec protection si factures liées

---

## Vision produit complète — Roadmap

> Ce qui suit est la vision complète du produit. Certaines fonctionnalités sont en cours de développement, d'autres planifiées. C'est précisément cette vision qui positionne InvoiceAI comme un outil comptable professionnel et non un simple générateur de factures.

### Sprint 1 — Monétisation *(en cours)*
- [ ] **Stripe** — abonnements Starter 9€ / Pro 19€ / Business 39€
- [ ] **Resend** — envoi de factures par email avec confirmation de livraison
- [ ] **Génération automatique** du numéro de facture

### Sprint 2 — IA générative *(différenciant clé)*
- [ ] **Claude API (Anthropic)** — génération automatique des lignes de facture depuis une description en langage naturel
- [ ] Prompt engineering pour conformité TVA BE/FR automatique
- [ ] Génération des mentions légales obligatoires
- [ ] Suggestions intelligentes basées sur l'historique client

### Sprint 3 — Conformité Peppol / UBL *(obligation légale BE 2026)*
- [ ] **Intégration Billit API** — conversion UBL et envoi via réseau Peppol
- [ ] Génération format UBL 2.1 (standard européen e-invoicing)
- [ ] Archivage 7 ans conforme GDPR
- [ ] **API VIES (Europe)** — validation numéros TVA BE/FR en temps réel

### Sprint 4 — Analytics & Comptabilité
- [ ] Page de détail facture avec changement de statut
- [ ] Rappels automatiques pour factures en retard
- [ ] Export comptable CSV / Excel
- [ ] Intégrations comptables : WinBooks, BOB, Exact Online
- [ ] Multi-devises (€, CHF, GBP)

### Sprint 5 — Croissance
- [ ] Portail client — lien de paiement en ligne
- [ ] **Stripe Payment Links** — paiement facture directement depuis le PDF
- [ ] Bilingue FR/NL natif complet
- [ ] Application mobile (React Native ou PWA)
- [ ] API publique pour intégrations tierces

---

## Flux d'une facture — De l'idée à Peppol *(vision complète)*

```
1. L'utilisateur décrit sa prestation en langage naturel
         ↓
2. Claude API génère automatiquement les lignes, la TVA correcte (BE 21% / FR 20%), les mentions légales
         ↓
3. L'utilisateur valide en 1 clic
         ↓
4. Supabase stocke la facture (archivage 7 ans, snapshot immuable)
         ↓
5. Billit API convertit en UBL et envoie via Peppol au client ← réseau officiel
         ↓
6. Resend envoie une confirmation email + PDF visuel au client
         ↓
7. Dashboard mis à jour en temps réel — CA, statuts, analytics
```

---

## Business Model

### Pricing Freemium

| Plan | Prix | Factures/mois | IA incluse | Cible |
|---|---|---|---|---|
| **Free** | 0€ | 3/mois | Basique | Découverte |
| **Starter** | 9€/mois | 20/mois | ✅ Oui | Freelance débutant |
| **Pro** | 19€/mois | Illimité | ✅ Avancée | Freelance actif / TPE |
| **Business** | 39€/mois | Illimité | ✅ Premium | Multi-utilisateurs |

### Projection de revenus

- **Conservateur** (0,1% du marché BE+FR) : 1 200 clients Pro → ~22 800€/mois
- **Réaliste** (0,5%) : 6 000 clients → ~114 000€/mois
- **Optimiste** (1%) : 12 000 clients → ~228 000€/mois

*Marché adressable : 1,2M indépendants BE + 4,1M TPE/indépendants FR*

---

## Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend | React 18 + TypeScript | Interface utilisateur moderne |
| Build | Vite | Dev server + bundler |
| Styles | Tailwind CSS + shadcn/ui | Design system cohérent |
| Routing | React Router v6 | Navigation SPA |
| Backend & Auth | Supabase (PostgreSQL + RLS) | Auth, DB, stockage |
| Graphiques | Recharts | Dashboard analytics |
| PDF | @react-pdf/renderer | Génération PDF côté client |
| Notifications | Sonner | Toasts UX |
| IA générative | Claude API (Anthropic) | Génération factures *(roadmap)* |
| Conformité Peppol | Billit API / Falco API | Envoi UBL via réseau Peppol *(roadmap)* |
| Email | Resend | Envoi factures, relances *(roadmap)* |
| Paiements | Stripe | Abonnements SaaS *(roadmap)* |
| Validation TVA | API VIES (Europe) | Vérification TVA BE/FR *(roadmap)* |
| Déploiement | Vercel | CI/CD, hosting |

---

## Architecture

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── invoice/               # ClientSelect, BusinessProfileSelect, InvoiceForm, InvoicePreview
│   └── pdf/                   # InvoiceDocument.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── LanguageContext.tsx
├── hooks/
│   ├── useInvoices.ts         # CRUD + getInvoices + getInvoiceItems
│   ├── useClients.ts
│   └── useBusinessProfiles.ts
├── lib/
│   ├── supabase.ts
│   ├── invoiceCalculations.ts # Source unique calcul TVA
│   └── pdf/
│       └── generateInvoicePdf.ts
└── pages/
    ├── Dashboard.tsx
    ├── InvoiceGenerator.tsx
    ├── Clients.tsx
    └── Settings.tsx
```

---

## Base de données (Supabase)

### `business_profiles`
```
id · user_id · company_name · vat_number
street · zip_code · city · country_code
email · iban · logo_path
is_default · deleted_at · created_at · updated_at
```

### `clients`
```
id · user_id · name · company · email
street · zip_code · city · country_code · vat_number
created_at · updated_at
```

### `invoices`
```
id · user_id · client_id · business_profile_id
invoice_number · status · issue_date · due_date
subtotal · vat_amount · total · notes · pdf_path

-- Snapshot émetteur immuable (rempli par trigger DB à la création)
-- Garantit l'intégrité fiscale : une modif du profil n'altère pas les factures passées
issuer_company_name · issuer_vat_number
issuer_street · issuer_zip_code · issuer_city
issuer_country_code · issuer_email · issuer_iban · issuer_logo_path

created_at · updated_at
```

### `invoice_items`
```
id · invoice_id · description · quantity · unit_price · vat_rate
```

> **Sécurité :** RLS activé sur toutes les tables. Un utilisateur ne peut jamais lire ou modifier les données d'un autre. Trigger de protection sur les colonnes `issuer_*` — immuables après création.

---

## Prérequis

- Node.js >= 18
- Compte [Supabase](https://supabase.com) (projet créé)
- npm ou yarn

---

## Installation

```bash
# Cloner le projet
git clone https://github.com/flow3flow/freelance-flow.git
cd freelance-flow

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs ci-dessous

# Lancer le serveur de développement
npm run dev
```

---

## Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
# Supabase — disponible dans Project Settings → API
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_publique

# À venir (roadmap)
# VITE_ANTHROPIC_API_KEY=
# VITE_STRIPE_PUBLIC_KEY=
# VITE_BILLIT_API_KEY=
```

> ⚠️ Ne jamais committer `.env.local`. Il est dans `.gitignore`.

---

## Déploiement

Compatible avec :

- **[Vercel](https://vercel.com)** — recommandé (`npm run build`, output `dist/`)
- [Netlify](https://netlify.com)
- [Lovable](https://lovable.dev) — édition via prompts également possible

---

## Contribution

```bash
git checkout -b feat/ma-fonctionnalite
git commit -m "feat: description claire"
git push origin feat/ma-fonctionnalite
# → Pull Request
```

---

## Pitch

> *"InvoiceAI, c'est la première app de facturation belge pensée pour les indépendants — tu décris ta prestation, l'IA génère ta facture conforme Peppol, et elle part en 30 secondes."*

---

## Licence

MIT — voir [LICENSE](./LICENSE)

---

<div align="center">
Fait avec ❤️ pour les freelances de Belgique & France · Business Project Flow · 2026
</div>