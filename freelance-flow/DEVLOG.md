# DEVLOG — InvoiceAI
## Journal de bord du projet · Mis à jour le 13 mars 2026

---

## C'est quoi ?

**InvoiceAI** est une application SaaS de facturation intelligente, pensée exclusivement pour les
freelances et indépendants belges et français.

L'idée de départ est simple et urgente : depuis le 1er janvier 2026, les factures B2B entre
assujettis TVA belges doivent transiter par le réseau Peppol au format UBL. Le PDF envoyé par
email est désormais illégal. 1,2 million d'indépendants belges sont concernés, et la grande
majorité n'a pas encore de solution simple et abordable.

InvoiceAI répond à cette urgence avec une interface moderne, une IA qui génère les lignes de
facture depuis une description en langage naturel, et une conformité Peppol intégrée via l'API
Billit.

---

## Pour qui ?

| Profil | Problème | Ce qu'InvoiceAI résout |
|---|---|---|
| Freelance / indépendant BE | Facture PDF illégale depuis jan 2026 | Facture Peppol conforme en 30 secondes |
| Consultant multi-activités | Plusieurs structures, outil trop lourd | Multi-profils entreprise natif |
| TPE belge ou française | Odoo trop cher (300€+/mois) | 9-19€/mois, onboarding 2 minutes |
| Comptable / fiduciaire | Clients perdus face à Peppol | Outil à recommander, programme partenaire |

---

## Qui l'a construit ?

**Flow** — développeuse web & IA, Belgique.
Projet lancé en 2026, construit en solo avec une stack moderne : React + TypeScript + Supabase +
Tailwind + shadcn/ui.
Frontend initial généré via Lovable, backend développé en Cursor.
Repository GitHub : `flow3flow/freelance-flow`

---

## Comment c'est construit ?

### Stack technique complète

| Couche | Technologie | État |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | ✅ En production |
| Styles | Tailwind CSS + shadcn/ui | ✅ En production |
| Routing | React Router v6 | ✅ En production |
| Backend & Auth | Supabase (PostgreSQL + RLS) | ✅ En production |
| Graphiques | Recharts | ✅ En production |
| PDF | @react-pdf/renderer | ⚠️ Installé, debug en cours |
| Notifications | Sonner | ✅ En production |
| Email | Resend | ❌ Non branché |
| Paiements | Stripe | ❌ Non intégré |
| IA générative | Claude API (Anthropic) | ❌ Roadmap Sprint 3 |
| Conformité Peppol | Billit API | ❌ Roadmap Sprint 3 |
| Validation TVA | API VIES (Europe) | ❌ Roadmap Sprint 4 |
| Déploiement | Vercel | ❌ À configurer |

### Architecture Supabase

```
business_profiles   → multi-entités par user, soft delete, RPC default
clients             → réutilisables sur toutes les factures
invoices            → snapshot émetteur immuable (issuer_*), statuts ENUM
invoice_items       → lignes de prestation par facture
profiles            → données utilisateur (trigger auth)
```

**Sécurité :** RLS activé sur toutes les tables. Trigger `snapshot_issuer_on_invoice_insert()`
garantit l'immuabilité fiscale des données émetteur sur chaque facture. Un utilisateur ne peut
jamais lire ou modifier les données d'un autre.

---

## Pourquoi ces choix techniques ?

- **Supabase** plutôt qu'un backend custom : auth, RLS, RPC et storage en un seul service managé.
  Idéal pour un SaaS solo en phase MVP.
- **Snapshot `issuer_*` immuable** : si le profil entreprise change après coup, les factures déjà
  émises conservent les données de l'émetteur au moment de la création. C'est une exigence fiscale,
  pas un choix de design.
- **@react-pdf/renderer** côté client : pas de serveur PDF, pas de coût infrastructure. La
  génération se passe dans le navigateur de l'utilisateur.
- **Lovable → Cursor** : Lovable a permis de construire les 4 interfaces rapidement sans backend.
  Cursor prend le relais pour tout ce qui est logique métier, hooks, intégrations API.

---

## Quand — Chronologie du projet

```
Janvier 2026  → Obligation Peppol effective en Belgique
Février 2026  → Décision de construire InvoiceAI
Mars 2026     → Phase 1 Auth + CRUD terminés
Mars 2026     → Phase 2 Dashboard + PDF + Business Profiles terminés (en cours debug)
À venir       → Phase 3 Email + Stripe
À venir       → Phase 4 Claude API + Peppol
```

---

## État actuel — Ce qui fonctionne

### ✅ Fonctionnel et validé

**Auth complète (Phase 1)**
- Signup / Login / Logout via Supabase Auth
- Table `profiles` avec trigger `handle_new_user()`
- `AuthContext` + `ProtectedRoute` + `.env.local` correctement configuré
- Correction du bug `ERR_NAME_NOT_RESOLVED` résolue (`.env.local` vide → remplir + Ctrl+Shift+R)

**Dashboard (Phase 2)**
- Stats temps réel : total facturé, payé, en attente, en retard
- Graphique CA mensuel sur 6 mois (AreaChart Recharts)
- Donut chart répartition des statuts
- Recherche client-side + filtre par statut
- Skeleton loading states + empty states

**Gestion des clients**
- CRUD complet avec tous les champs (nom, TVA, adresse, IBAN, etc.)
- Réutilisables sur toutes les factures

**Profils entreprise (Business Profiles)**
- Multi-profils par utilisateur
- Soft delete avec protection si factures liées
- RPC `set_default_business_profile` sécurisé côté serveur
- `BusinessProfileSelect` component avec auto-sélection du profil par défaut
- Section Settings fonctionnelle et confirmée en production

**Création de factures**
- `InvoiceGenerator` avec sélection client + profil entreprise
- Lignes de facturation avec calcul TVA automatique (21% / 6% / 0%)
- `computeTotals()` comme source unique de vérité
- Numérotation manuelle + dates + conditions de paiement

**Hooks validés**
- `useInvoices.ts` : `getInvoices()` avec join `clients` complet + colonnes `issuer_*` + `getInvoiceItems(invoiceId)` + `createInvoice()` avec rollback
- `useBusinessProfiles.ts` : fetch, create, update, setDefault, delete (soft)
- `useClients.ts` : CRUD complet

**PDF — Fichiers produits, debug en cours**
- `src/components/pdf/InvoiceDocument.tsx` — layout A4 complet
- `src/lib/pdf/generateInvoicePdf.ts` — download + blob Supabase Storage
- Bouton Download dans le Dashboard branché aux données `issuer_*` snapshot
- ⚠️ La génération ne fonctionne pas encore — diagnostic en attente

---

## État actuel — Ce qui est cassé ou manquant

### ❌ Bloquants MVP

| Problème | Impact | Action requise |
|---|---|---|
| **PDF ne génère pas** | Bouton Download silencieux ou erreur | Diagnostic console F12 + vérifier version `InvoiceDocument.tsx` |
| **Envoi email non branché** | Bouton "Envoyer par email" inactif | Intégration Resend (Edge Function Supabase) |
| **Stripe absent** | Aucune monétisation possible | Intégration abonnements 4 plans |

### ⚠️ Manquant mais non bloquant

| Manquant | Priorité |
|---|---|
| TVA France (20%, 10%, 5.5%, 2.1%) | Moyen terme — 2h de dev |
| Génération auto numéro de facture | Confort utilisateur |
| Déploiement Vercel | Avant lancement public |
| Rappels automatiques factures en retard | Sprint 4 |
| Export comptable CSV/Excel | Sprint 4 |

---

## Ce qui reste à faire — Plan complet

### 🔴 Sprint 2 — Débloquer le MVP (priorité absolue)

**Étape 1 — Fix PDF**

Diagnostic à faire dans l'ordre :
```bash
# 1. Vérifier que la dépendance est installée
cat package.json | grep react-pdf

# 2. Si absent :
npm install @react-pdf/renderer

# 3. Vérifier que InvoiceDocument.tsx est la version corrigée
#    (sans Font inutilisé, sans Intl.NumberFormat — utiliser toFixed(2))

# 4. Ouvrir F12 → Console au moment du clic Download
#    Copier l'erreur rouge exacte
```

Fichiers concernés :
- `src/components/pdf/InvoiceDocument.tsx` → utiliser la version corrigée (outputs)
- `src/lib/pdf/generateInvoicePdf.ts` → version validée ✅
- `src/pages/Dashboard.tsx` → bouton Download branché ✅ (outputs)
- `src/hooks/useInvoices.ts` → `getInvoiceItems` ajouté ✅ (outputs)

**Étape 2 — Resend (envoi email)**

Architecture :
```
Supabase Edge Function  →  POST /functions/v1/send-invoice
                        →  Resend API → email client avec PDF en pièce jointe
```

Variables à ajouter dans Supabase Dashboard → Edge Functions → Secrets :
```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

**Étape 3 — Stripe (monétisation)**

Plans à créer dans le dashboard Stripe :
```
Free     → 0€    · 3 factures/mois
Starter  → 9€    · 20 factures/mois
Pro      → 19€   · Illimité + IA
Business → 39€   · Illimité + Multi-users + API
```

Mécaniques de conversion :
- Pop-up upgrade après la 3e facture du mois
- Email automatique J+7 post-inscription
- Code promo lancement : `BETA2026` → 1er mois à moitié prix

---

### 🟡 Sprint 3 — Différenciation IA (après MVP fonctionnel)

**Claude API — Génération IA de factures**

Flux :
```
Utilisateur décrit sa prestation en langage naturel
      ↓
Claude API génère les lignes (description, quantité, prix, TVA)
      ↓
Utilisateur valide en 1 clic
      ↓
Facture créée dans Supabase
```

Fichiers à créer :
- `supabase/functions/generate-invoice/index.ts`
- `src/hooks/useInvoiceAI.ts`
- Composant `AIInvoiceInput` dans `InvoiceGenerator.tsx`

**Billit API — Conformité Peppol BE**

```
Facture créée dans Supabase
      ↓
Billit API → conversion UBL 2.1
      ↓
Envoi réseau Peppol → client B2B belge
      ↓
Archivage 7 ans
```

---

### 🟢 Sprint 4 — Scale (marché FR + analytics)

- TVA France dans `invoiceCalculations.ts` (chargé automatiquement selon `country_code`)
- Mentions légales FR sur le PDF (SIRET, "TVA non applicable art. 293 B CGI")
- API VIES — validation numéros TVA BE/FR en temps réel
- Intégrations comptables : WinBooks, BOB, Exact Online
- Export CSV/Excel
- Rappels automatiques pour factures en retard
- Portail client avec lien de paiement Stripe

---

### 🔵 Sprint 5 — Vision long terme

- Application mobile (PWA ou React Native)
- API publique pour intégrations tierces
- Multi-devises (€, CHF, GBP)
- PDP France (Billit/Chorus Pro) pour l'obligation FR septembre 2026 (GE/ETI)
  et TPE/PME en 2027
- Programme partenaire comptables avec dashboard commissions

---

## Décision stratégique marché

**Belgique d'abord. France ensuite.**

L'obligation Peppol est active en Belgique depuis janvier 2026. La France n'a pas d'obligation
B2B avant septembre 2026 (grandes entreprises), et 2027 pour les TPE/PME.

La fenêtre de marché belge est ouverte maintenant. Billit API couvre la conformité Peppol BE.
L'architecture `country_code` existante dans `business_profiles` permettra d'étendre au marché
français sans migration DB — juste un ajout des taux TVA FR dans `invoiceCalculations.ts`.

---

## Documents de référence dans ce repo

| Fichier | Contenu |
|---|---|
| `README.md` | Présentation produit + stack + installation |
| `MARKETING.md` | Playbook marketing complet + post LinkedIn + emails + speech |
| `DEVLOG.md` | Ce fichier — journal de bord technique et produit |

---

## Ressources externes

| Ressource | URL |
|---|---|
| Supabase Dashboard | https://supabase.com/dashboard/project/ztdovijptfjyrdrpjwab |
| GitHub Repository | https://github.com/flow3flow/freelance-flow |
| Billit API Docs | https://docs.billit.be |
| Resend Dashboard | https://resend.com/dashboard |
| Stripe Dashboard | https://dashboard.stripe.com |
| Lovable App | https://lovable.dev |

---

## Règles de développement à respecter

```
1. Ne jamais modifier les colonnes issuer_* après création d'une facture
   → Trigger protect_invoice_issuer_snapshot() le bloque côté DB

2. Toujours utiliser computeTotals() pour les calculs TVA
   → Source unique de vérité dans invoiceCalculations.ts

3. Mapping camelCase → snake_case dans les items
   → unitPrice → unit_price / vatRate → vat_rate

4. getInvoiceItems() est lazy — appelé au clic, pas au chargement
   → Évite de charger toutes les lignes de toutes les factures au montage

5. Le join Supabase retourne la clé "clients" (nom de la table)
   → inv.clients et non inv.client

6. .env.local à la racine de freelance-flow/
   → Jamais .env tout seul avec Vite
   → Toujours hard refresh Ctrl+Shift+R après modification
```

---

*InvoiceAI · DEVLOG v1.0 · Business Project Flow · Mars 2026 · Confidentiel*