# InvoiceAI — Roadmap & Vision Produit
> Business Project Flow · Flow · 20 mars 2026
> Stack : React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Supabase
> Marché : Freelances & indépendants belges et français

---

## État actuel — MVP 95%

### ✅ Fonctionnalités livrées

| Module | Détail |
|---|---|
| Auth & Sécurité | Supabase Auth, RLS 6 tables, multi-tenancy business_profiles |
| Facturation | Création, numérotation séquentielle DB (sans trou), snapshot émetteur immuable |
| TVA BE/FR | 14 scénarios (Art. 39bis, Art. 21§2, Art. 44, Art. 56bis, Art. 293B...) |
| PDF | Mentions légales automatiques selon scénario TVA |
| Note de crédit | Workflow légal complet (AR n°1 art. 54 BE / CGI art. 289 FR) |
| Dashboard | Données réelles Supabase, KPI, charts, dropdown statuts, actions |
| Email | Resend + PDF en pièce jointe (domaine sandbox) |
| Stripe | Plans Free/9€/19€/39€, checkout, webhooks |

---

## 🔴 Sprint 1 — Avant 1er client (~1h)

### 1. Fix bug "Enregistrer en brouillon"
**Problème :** Le guard `!invoice.vatScenario` bloque la sauvegarde si l'utilisateur n'a pas sélectionné de régime TVA manuellement.
**Fix :** Mettre `BE_STANDARD_21` comme valeur par défaut dans `defaultInvoice` et dans `handleSaveDraft`.

### 2. Fix PDF depuis le générateur
**Problème :** Le bouton "Télécharger PDF" du générateur ne passe pas le `vatScenario` du form state au renderer — la mention légale n'apparaît pas sur le PDF.
**Fix :** Brancher `invoice.vatScenario` sur l'appel `generateInvoicePdf()` dans `InvoiceGenerator.tsx`.

### 3. Référence structurée belge `+++XXX/XXXX/XXXXX+++`
**Pourquoi :** Obligatoire légalement en Belgique pour les virements B2B. Permet le matching automatique paiement/facture côté banque client.
**Comment :** Calcul modulo 97 sur le numéro de facture — zéro API externe.
**Livraison :**
- Fonction `generateStructuredRef(invoiceNumber)` dans `src/lib/`
- Colonne `structured_ref` ajoutée en DB (migration SQL)
- Générée automatiquement à la création de chaque facture
- Affichée sur le PDF sous l'IBAN
- Stockée en DB avec la facture

---

## 🟠 Sprint 2 — Après 1er client

### 4. Bon de commande
**Pourquoi :** Beaucoup de grandes entreprises belges refusent de payer une facture sans bon de commande signé en amont. Pain point réel pour les freelances IT.
**Comment :**
- Même template que la facture, badge "BON DE COMMANDE"
- Numérotation dédiée : `BC-YYYY-XXXX`
- Bouton "Convertir en facture" → pré-remplit le générateur
- Statuts : brouillon / envoyé / accepté / refusé

### 5. Devis
**Pourquoi :** Nécessaire avant toute mission pour les consultants, designers, architectes. Permet de verrouiller le prix avant exécution.
**Comment :**
- Même template, badge "DEVIS"
- Numérotation : `DEV-YYYY-XXXX`
- Validité configurable (30/60/90 jours)
- Bouton "Convertir en facture" en 1 clic
- Statuts : brouillon / envoyé / accepté / refusé / expiré

### 6. Factures récurrentes
**Pourquoi :** Les freelances en mission longue durée (ex : mission IT 3000€/mois pendant 6 mois) veulent générer automatiquement leurs factures mensuelles.
**Comment :**
- Créer une facture modèle → définir fréquence (mensuelle, trimestrielle, annuelle)
- Génération automatique via Supabase Edge Function + cron
- Notification email avant envoi
- Possibilité de modifier avant envoi

### 7. Pièces jointes sur factures
**Pourquoi :** Les clients B2B exigent souvent le bon de commande signé ou le timesheet en pièce jointe de la facture pour valider le paiement. Sans ça, le paiement est bloqué.
**Comment :**
- Upload depuis le formulaire : PDF, image, Excel
- Stockage dans Supabase Storage (bucket `invoice-attachments`)
- Lié à la facture via colonne `attachments JSONB` en DB
- Envoyé automatiquement en PJ avec l'email Resend
- Affiché dans le Dashboard avec aperçu

### 8. audit_logs alimentés
**Pourquoi :** Table déjà créée en DB mais pas encore alimentée. Obligatoire pour la conformité légale et la traçabilité en cas de contrôle fiscal belge (conservation 7 ans).
**Actions à tracer :** création facture, changement statut, note de crédit, envoi email, modification profil, connexion.

### 9. Domaine Resend vérifié
**Pourquoi :** Les emails partent actuellement depuis un domaine sandbox Resend → arrivent en spam chez les clients.
**Fix :** Vérifier le domaine dans Resend → emails envoyés depuis `noreply@invoiceai.be` → délivrabilité normale.

---

## 🟡 Sprint 3 — Après 10 clients

### 10. Peppol émission (Billit API)
**Pourquoi :** Obligation légale belge depuis le 1er janvier 2026 pour TOUTES les factures B2B entre assujettis TVA belges. Sans Peppol, le client ne peut pas déduire sa TVA. Amendes : 1 500€ / 3 000€ / 5 000€.
**Comment :**
- Génération XML UBL 2.1 depuis les données de la facture (mapping EN16931)
- Envoi via Billit API (point d'accès Peppol certifié)
- Statut de transmission dans le Dashboard
- Confirmation de réception côté destinataire
- Le bouton "Peppol Bêta" est déjà visible dans le Dashboard

### 11. Boîte de réception Peppol (factures fournisseurs)
**Pourquoi :** Les indépendants reçoivent leurs factures fournisseurs via Peppol mais n'ont nulle part où les centraliser et gérer. Pain point identifié : actuellement juste un portail sans gestion.
**Comment :**
- Onglet "Achats" dans le Dashboard
- Réception automatique des factures entrantes via Peppol
- Stockage dans Supabase Storage
- Statuts : reçue / à payer / payée
- Lien futur avec connexion bancaire pour matching automatique
- Archivage légal 7 ans

### 12. Notes de frais avec scan OCR
**Pourquoi :** Les indépendants ont des tickets de frais (repas, transport, matériel, téléphone) qu'ils doivent conserver 7 ans légalement et communiquer à leur comptable. Actuellement perdus dans des tiroirs ou des boîtes mail.
**Comment :**
- Photo du ticket depuis mobile (PWA ou app)
- OCR extraction automatique : montant, date, TVA, fournisseur
- Catégorisation : transport, repas, matériel, télécommunications, autres
- Stockage Supabase Storage
- Vue liste avec filtres (période, catégorie, statut)
- Export CSV/PDF pour le comptable

---

## 🔵 Sprint 4 — Croissance

### 13. IA génération de facture
**Pourquoi :** Le différenciateur principal vs Falco/Billit/Accountable. Aucun concurrent ne fait ça. C'est l'âme du produit.
**Comment :**
- L'utilisateur décrit sa mission en langage naturel : "Développement React 15 jours à 700€/jour pour AnaDevConsulting mars 2026"
- L'IA génère automatiquement toutes les lignes, détecte le scénario TVA, calcule les montants
- Validation humaine obligatoire avant sauvegarde (HITL — Human in the Loop)
- Bouton "✨ Générer avec l'IA" déjà visible dans le Dashboard

### 14. Connexion bancaire
**Pourquoi :** Évite de changer manuellement le statut des factures. Gain de temps majeur.
**Comment :**
- API Isabel/Ponto pour connexion compte bancaire belge
- Matching automatique paiement reçu ↔ facture
- Passage automatique en statut "Payé"
- Vue trésorerie en temps réel (7 jours / 14 jours / fin du mois)

### 15. Export comptable
**Pourquoi :** Le comptable du freelance utilise Winbooks, Horus ou Octopus. Actuellement il faut tout lui envoyer manuellement.
**Comment :**
- Export au format compatible Winbooks / Horus / Octopus
- Synchronisation automatique si le comptable utilise un de ces logiciels
- Réduit le coût comptable pour l'utilisateur (argument commercial fort)

### 16. France e-facturation 2027
**Pourquoi :** Obligation d'émission pour les PME/micro-entreprises françaises en septembre 2027. L'architecture `country_code` est déjà prête.
**Comment :**
- Intégration avec les Plateformes de Dématérialisation Partenaires (PDP) françaises
- E-reporting pour les transactions B2C et internationales
- Module TVA France complet (déclarations CA3)

---

## 💰 Plans tarifaires

| Plan | Prix | Inclus |
|---|---|---|
| **Free** | 0€ | 3 factures/mois, PDF, 1 profil entreprise |
| **Starter** | 9€/mois | 20 factures, PDF + email, Peppol émission |
| **Pro** | 19€/mois | Factures illimitées, réception Peppol, pièces jointes, notes de frais |
| **Business** | 39€/mois | Multi-entreprises illimité, export comptable, IA génération, support prioritaire |

> ⚠️ Déductible à 120% en Belgique (2024-2027) — argument commercial à mettre en avant.

---

## 🎯 Positionnement produit

### Versus concurrents

| | InvoiceAI | Accountable | Billit | Falco |
|---|---|---|---|---|
| Prix entrée | 0€ | 0€ | 7,5€ | 3,5€ |
| IA génération | ✅ | ❌ | ❌ | ❌ |
| BE + FR | ✅ | ❌ | ❌ | ❌ |
| Mentions légales auto | ✅ | ❌ | ❌ | ❌ |
| Réception Peppol | 🟡 Sprint 3 | ✅ | ✅ | ✅ |
| Notes de frais | 🟡 Sprint 3 | ✅ | ✅ | ✅ |
| Comptabilité complète | ❌ | ✅ | 🟡 | 🟡 Horus |

### Pitch

```
InvoiceAI = le seul hub de facturation BE+FR
qui gère émission + réception Peppol + dépenses + IA
pour freelances et indépendants.
9€/mois. Conforme Peppol. Prêt en 30 secondes.
```

### Cible V1

Freelance IT belge, 5-20 factures/mois, numéro TVA actif, pas de comptable ou comptable minimaliste. Cherche à facturer vite et conforme sans gérer une comptabilité complète.

---

## 🏗️ Architecture technique

```
Frontend    React 18 + TypeScript + Vite + Tailwind + shadcn/ui
Backend     Supabase (PostgreSQL + Auth + Storage + Edge Functions)
PDF         @react-pdf/renderer
Email       Resend (via Edge Functions)
Paiement    Stripe (webhooks via Edge Functions)
Peppol      Billit API (Sprint 3)
OCR         Sprint 3 (à définir : Mindee ou Google Vision)
Banque      Isabel/Ponto API (Sprint 4)
```

### Règles d'or immuables

1. **Snapshot émetteur** — toute facture générée DOIT utiliser les colonnes `issuer_*` pour garantir l'intégrité fiscale. Jamais recharger depuis le profil live.
2. **Note de crédit obligatoire** — une facture validée ne peut JAMAIS être modifiée directement.
3. **Numérotation séquentielle** — générée côté DB uniquement (`generate_invoice_number()`), jamais côté client.
4. **country_code systématique** — sur toutes les entités pour l'architecture multi-pays.

---

*Dernière mise à jour : 20 mars 2026*