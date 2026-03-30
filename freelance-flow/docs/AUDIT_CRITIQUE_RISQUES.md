# InvoiceAI — Audit Critique & Évolution Doctrinale
> Auteur : Flow (Solo Founder · InvoiceAI)  
> Date : 28 mars 2026  
> Statut : Document vivant — post-audit · pré-production  
> Branche active : `feat/sprint7-audit-logs-kpis-rgpd`

---

> **Ce document n'est pas un audit de plus.**
>
> C'est la trace écrite d'une évolution de pensée.
> Il documente comment InvoiceAI est passé d'un MVP bien construit
> à un système qui commence à penser comme un moteur de conformité financière.
>
> Le premier audit (`AUDIT_RISQUES.md`) a posé les constats.
> Ce document pose les **décisions d'architecture** qui en découlent.

---

## 1. Le constat de départ — Ce qu'on a réellement compris

### 1.1 L'illusion du MVP avancé

Au démarrage du Sprint 7, InvoiceAI avait tout l'air d'un produit mature :
- Stripe Checkout live à 19€
- Démo publique fonctionnelle
- Stack moderne cohérente
- Architecture documentée

**Ce qu'on a découvert en auditant sérieusement :**

Le produit était architecturalement solide mais légalement invendable.

Non pas parce que le code était mauvais — il était plutôt bon pour un MVP solo.
Mais parce que la distance entre ce que le produit *promettait* et ce qu'il *faisait réellement* était dangereuse dans un contexte fintech B2B.

Cette distance s'articulait autour de quatre vérités difficiles :

| Ce qui était promis | Ce qui existait réellement |
|---------------------|---------------------------|
| "Conforme Peppol 2026" | Check de présence sur le réseau, zéro émission UBL |
| Calculs financiers rigoureux | Deux moteurs coexistants (float JS + decimal.js) |
| Traçabilité complète | Table `audit_logs` vide en production |
| Droits RGPD respectés | Privacy Policy déployée, `anonymize_user_data()` absente |

### 1.2 La vraie nature du problème

L'erreur de cadrage initiale n'était pas technique. Elle était conceptuelle.

**InvoiceAI avait été conçu comme un générateur de PDF intelligent.**

Or, en Belgique en 2026, ce qu'on construit réellement c'est un **moteur de conformité financière avec interface utilisateur**. Ce renversement de perspective change tout :

- Un générateur de PDF peut avoir des bugs de calcul tolérable.
- Un moteur de conformité fiscale ne peut pas se permettre une seule divergence entre UI, DB, PDF et UBL.

- Un générateur de PDF peut logger de manière optionnelle.
- Un moteur de conformité doit journaliser chaque action légale irréversible.

- Un générateur de PDF peut laisser l'utilisateur corriger une facture directement.
- Un moteur de conformité doit imposer la note de crédit — sans exception.

**C'est ce changement de paradigme qui est documenté ici.**

---

## 2. Évolution de la doctrine — Avant / Après

### 2.1 Sur les calculs financiers

#### Avant l'audit

```
Problème perçu : "float JS peut donner 0.30000000000000004"
Solution perçue : "migrer vers decimal.js"
Statut : patch technique
```

#### Après l'audit

```
Problème réel : fragmentation de la source de vérité financière
                UI / DB / PDF / UBL peuvent diverger
Solution réelle : Single Source of Truth financière
                  Un seul calcul → une seule persistance → des renderers passifs
Doctrine retenue :
  UI = DB = PDF = UBL
  Toute divergence entre ces quatre couches = échec critique de conformité
```

**Ce qui a changé :**

`invoiceCalculations.ts` n'était pas "mal codé" — il calculait. Le problème était qu'il *recalculait* dans une couche où il n'aurait pas dû décider. La migration vers `decimal.js` était nécessaire mais insuffisante. La vraie correction était d'interdire à l'UI de recalculer ce que la DB a déjà validé.

**Résolution C2 — ✅ RÉSOLU le 26/03/2026**
- `src/lib/invoiceCalculations.ts` migré vers `decimal.js` (`precision: 20, ROUND_HALF_UP`)
- `computeLineTotal()` comme helper d'affichage temps réel
- Doctrine : les renderers (PDF, UBL) lisent les valeurs persistées — ils ne recalculent pas

---

### 2.1.b Sur la logique fiscale — VAT Scenario Engine

#### Avant l'audit

```
Problème perçu : "appliquer un taux de TVA correct"
Solution perçue : "laisser l'utilisateur choisir ou utiliser un taux par défaut"
Statut : logique implicite
```

#### Après l'audit

```
Problème réel : un taux de TVA n'a aucune valeur sans contexte fiscal
                Le même taux peut être valide ou illégal selon :
                - pays émetteur
                - pays client
                - statut TVA du client
                - nature de la transaction (B2B / B2C / intra / export)

Solution réelle : moteur de scénarios fiscaux déterministe
                  Chaque facture associée à un VAT scenario explicite

Doctrine retenue :
  TVA = fonction (contexte)
  Pas une constante.
  Le scénario fiscal détermine le taux — jamais l'inverse.
```

**Ce qui a changé :**

C5 n'est pas "le taux 12% qui pose problème". C'est l'absence d'un moteur qui qualifie chaque facture selon son contexte fiscal avant d'autoriser un taux. Sans ce moteur, deux factures avec le même taux peuvent l'une être légale et l'autre constituer une infraction fiscale.

#### Risque identifié

Un taux correct appliqué dans un mauvais scénario produit :
- une facture invalide sans erreur apparente
- un risque de redressement fiscal pour le client du freelance
- une responsabilité éditeur potentielle pour InvoiceAI

#### Décision d'architecture

Chaque facture doit stocker explicitement :

| Champ | Valeurs possibles |
|-------|------------------|
| `vat_scenario` | `domestic` · `intra_eu` · `reverse_charge` · `export` · `b2c` |
| `vat_rate` | Whitelist par `country_code` + `vat_scenario` |
| `vat_reason_code` | Code mention légale obligatoire (ex: `AE` pour autoliquidation) |

#### Règle critique

```
Une facture sans vat_scenario explicite est non conforme,
même si les montants sont mathématiquement corrects.

Le moteur TVA est déterministe et non délégable à l'IA.
```

**Statut C5 — 🔴 À TRAITER**  
Fichiers cibles : `src/lib/vatScenario.ts` · `src/contexts/LanguageContext.tsx`

---

### 2.2 Sur la numérotation des factures

#### Avant l'audit

```
Problème perçu : "le numéro de facture pouvait avoir des doublons en multi-profil"
Solution perçue : "ajouter un paramètre business_profile_id"
Statut : correction fonctionnelle
```

#### Après l'audit

```
Problème réel : la numérotation séquentielle sans trou est une OBLIGATION LÉGALE
                Math.random() ou une approche applicative sont illégaux
Solution réelle : RPC PostgreSQL avec verrou transactionnel (pg_advisory_xact_lock)
                  Le numéro est généré côté DB, pas côté applicatif
Doctrine retenue :
  Toute opération qui produit un effet légal irréversible
  doit être atomique, côté base, avec verrou.
```

**Ce qui a changé :**

On ne "corrige" plus un bug de numérotation. On établit que **toute séquence légale appartient à la base de données**, pas au frontend. Ce principe s'étend à la création de facture, à l'envoi Peppol, à l'anonymisation RGPD.

**Résolution L2 — ✅ RÉSOLU le 26/03/2026**
- RPC `get_next_invoice_number(p_business_profile_id, p_fiscal_year, p_prefix)` en production
- Double verrou : `pg_advisory_xact_lock(profil_id)` + `pg_advisory_xact_lock(user_id)`
- Plancher anti-doublon : `GREATEST(max_profil, max_global_user) + 1`

---

### 2.3 Sur l'immutabilité des factures

#### Avant l'audit

```
Règle connue : "une facture envoyée ne se modifie pas"
Application : comportement UI (pas de bouton edit sur une facture envoyée)
Statut : convention, pas contrainte
```

#### Après l'audit

```
Problème réel : une convention UI ne résiste pas à un appel API direct
                ou à une modification accidentelle via le dashboard Supabase
Solution réelle : triggers PostgreSQL de protection
                  UPDATE interdit sur les factures émises (`sent`) et les notes de crédit

                  Snapshot émetteur + snapshot client obligatoires à l'INSERT
Doctrine retenue :
  Facture émise = objet figé à vie.
  La note de crédit n'est pas une alternative — c'est la seule voie légale.
```

**Risque additionnel identifié :**

Le système figeait les données émetteur (`issuer_*`) mais **pas les données client**. En cas d'anonymisation RGPD ultérieure, les factures existantes seraient altérées rétroactivement — violation de l'intégrité fiscale.

---

### 2.3.b Le snapshot client — Doctrine autonome

> Cette règle est suffisamment importante pour ne pas rester un simple prérequis de C10.

#### Principe fondamental

```
Une facture émise ne doit dépendre d'aucune table externe
pour la validité de ses mentions légales.
```

Cela signifie que **au moment de l'INSERT**, les données suivantes doivent être copiées dans `invoices` de manière permanente et immuable :

| Champ source | Colonne snapshot cible | Obligatoire |
|--------------|----------------------|-------------|
| `clients.name` | `client_name` | ✅ |
| `clients.vat_number` | `client_vat` | ✅ si assujetti |
| `clients.address` | `client_address` | ✅ |
| `clients.city` / `country` | `client_city` · `client_country` | ✅ |
| `clients.email` | `client_email` | Recommandé |
| `clients.peppol_id` | `client_peppol_id` | Obligatoire pour UBL |

**Précision importante :** `client_email` n'est pas une mention légale obligatoire de la facture.  
Sa conservation dans le snapshot est donc **optionnelle** et ne doit être retenue que si un besoin opérationnel explicite le justifie.

#### Pourquoi c'est non négociable

Sans snapshot client :

1. **Modifier un client modifie toutes ses factures passées** — rétroactivement, silencieusement
2. **Anonymiser un client anonymise toutes ses factures passées** — violation de l'intégrité fiscale
3. **Supprimer un client casse les PDF et UBL** — données manquantes au rendu

#### Prérequis bloquant pour C10

```
Ordre d'exécution obligatoire :
  1. Migration : ajouter colonnes client_* dans invoices
  2. Backfill : copier les données clients dans les factures existantes
  3. Vérification : zéro facture avec client_name NULL
  4. Seulement ensuite : implémenter anonymize_user_data()

Règle absolue :
  anonymize_user_data() doit refuser de s'exécuter
  si des factures dépendent encore d'une table live.
```

---

### 2.4 Sur les audit logs

#### Avant l'audit

```
État perçu : "la table existe, c'est bien"
Statut : infrastructure en place
```

#### Après l'audit

```
État réel : table créée, non alimentée en production
            Score Logs/Audit : 10/100
Problème : une table vide ne prouve rien
           En cas de contrôle fiscal, "la table existe" ne suffit pas
           Il faut des entrées horodatées, rattachées à un utilisateur,
           pour chaque action légalement significative
Doctrine retenue :
  Un log qui n'est pas écrit n'existe pas.
  La conformité légale 7 ans n'est pas une architecture — c'est une exécution.
```

**Actions à journaliser — liste définitive :**

| Événement | Niveau | Table |
|-----------|--------|-------|
| Création facture | BUSINESS | `audit_logs` |
| Changement de statut | BUSINESS | `audit_logs` |
| Création note de crédit | BUSINESS | `audit_logs` |
| Conversion devis → facture | BUSINESS | `audit_logs` |
| Génération UBL XML | BUSINESS | `audit_logs` |
| Envoi Peppol (succès / échec) | BUSINESS | `audit_logs` |
| Suppression / anonymisation compte | RGPD | `audit_logs` |
| Validation humaine explicite (HITL) | LEGAL | `audit_logs` |
| Erreur critique moteur financier | SECURITY | `audit_logs` |

**Statut C3 — 🔴 PROCHAINE CIBLE (Sprint 7 en cours)**

---

### 2.5 Sur le RGPD

#### Avant l'audit

```
État perçu : "Privacy Policy déployée = conformité RGPD"
Statut : documentaire
```

#### Après l'audit

```
État réel : la Privacy Policy crée une OBLIGATION CONTRACTUELLE
            pas une protection
            Droits annoncés mais non exécutables techniquement :
            - droit à l'effacement (Art. 17)
            - portabilité des données (Art. 20)
Doctrine retenue :
  Chaque droit annoncé à l'utilisateur doit avoir
  une implémentation technique réelle derrière.
  Un document sans code est une promesse non tenue.
```

**Le conflit structurel RGPD ↔ Comptabilité :**

InvoiceAI ne peut pas supprimer les données comptables. La loi belge impose 7 ans de conservation. Le RGPD impose le droit à l'effacement.

La résolution n'est pas un choix entre les deux — c'est une **stratégie de séparation** :

```
Données personnelles (profiles, clients live)
  → anonymisables via UPDATE irréversible

Données comptables (invoices, invoice_items, audit_logs)
  → intouchables tant que durée légale non expirée
  → neutralisées uniquement si elles reposent sur un snapshot autonome

Règle absolue :
  anonymize_user_data() ne doit jamais altérer une facture.
  Si une facture dépend encore d'une table live pour ses mentions légales,
  l'anonymisation est bloquée — pas sautée, bloquée.
```

**Statut C10 — 🔴 PROCHAINE CIBLE (Sprint 7 en cours)**

#### Limite terminologique importante

Dans plusieurs cas, la stratégie retenue n'est pas une anonymisation absolue au sens strict du RGPD, mais une **neutralisation fonctionnelle** ou une **pseudonymisation forte**.

Pourquoi cette limite est inévitable :
- certains identifiants techniques (`user_id`, `invoice_id`) doivent être conservés pour la traçabilité légale
- certaines données comptables doivent rester corrélables à une transaction
- certains logs doivent permettre l'audit sur 7 ans

```
Doctrine retenue :
  InvoiceAI vise la minimisation et la neutralisation irréversible
  des données personnelles non nécessaires,
  sans revendiquer une anonymisation absolue
  lorsqu'une obligation légale de traçabilité subsiste.

  Ce positionnement est assumé, documenté, et cohérent avec le droit comptable belge.
```

---

### 2.6 Sur les backups — Conflit RGPD vs conservation légale

#### Avant l'audit

```
État perçu : "Supabase gère les backups, c'est couvert"
Statut : délégué à l'infrastructure
```

#### Après l'audit

```
Problème réel : les backups introduisent un conflit structurel

  RGPD         → droit à l'effacement des données personnelles
  Backups      → duplication et persistance des données (PITR, exports, dumps)

  Un utilisateur supprimé en base peut réapparaître intégralement
  via une restauration de backup — sans que personne ne s'en aperçoive.

Doctrine retenue :
  Un backup est un outil de résilience technique.
  Ce n'est pas un mécanisme de conservation légale.
  Ce n'est pas un archivage RGPD-safe par défaut.
```

#### Risque identifié

```
Un système conforme en base principale peut redevenir non conforme
via ses sauvegardes.

La suppression ou l'anonymisation d'un compte n'est réellement effective
que si la politique de backup en tient compte.
```

#### Décision d'architecture

Séparation stricte entre deux types de persistance :

| Type | Objectif | Durée | Contenu |
|------|----------|-------|---------|
| Backup technique (PITR) | Résilience infra | 7 jours max | Snapshot complet |
| Archive légale | Conservation comptable | 7 ans | Tables fiscales uniquement |

#### Règles retenues

- Les backups techniques ne sont pas utilisés comme archive légale
- Les données personnelles supprimées ne doivent pas être réinjectées via restore
- Les exports long terme doivent exclure les PII non nécessaires à la conformité fiscale
- L'archive légale cible uniquement : `invoices` · `invoice_items` · `audit_logs`

#### Limite assumée et documentée

```
Risque résiduel accepté : les données personnelles supprimées restent
présentes dans les backups PITR pendant leur durée de rétention (7 jours).

Ce risque est connu, documenté, et limité dans le temps.
Il n'est pas considéré comme une violation RGPD active
tant que les backups ne sont pas restaurés sans raison légale.
```

---

### 2.6.b Sur le storage — PDF, UBL, pièces jointes, exports temporaires

#### Problème réel

La conformité ne s'arrête pas aux tables SQL.

InvoiceAI manipule des objets stockés hors base qui contiennent des données personnelles ou fiscales :

- PDF de factures générés
- fichiers UBL XML
- pièces jointes factures (`invoice-attachments`)
- exports ZIP RGPD (Art. 20)
- futurs justificatifs de notes de frais (scan OCR)

Sans stratégie dédiée, ces objets constituent une surface de non-conformité invisible.

#### Doctrine retenue

```
Un document stocké dans un bucket a la même portée juridique
qu'une ligne en base s'il contient une donnée fiscale ou personnelle.

Il est soumis aux mêmes règles de conservation, d'accès et d'effacement.
```

#### Règles retenues

- bucket privé par défaut — aucun objet accessible publiquement sans autorisation explicite
- URLs signées temporaires uniquement (durée limitée, jamais de lien permanent)
- rétention explicite par type de document :

| Type d'objet | Rétention | Justification |
|--------------|-----------|---------------|
| PDF facture | 7 ans | Pièce justificative comptable |
| UBL XML | 7 ans | Source légale technique Peppol |
| Pièce jointe facture | 7 ans | Justificatif lié à la pièce |
| Export RGPD (ZIP) | Suppression après 48h | Export temporaire, usage unique |
| Justificatif note de frais | Durée légale selon usage | À définir par type |

- suppression / purge automatique des exports temporaires
- aucune pièce jointe ne doit contourner la stratégie RGPD documentée
- en cas d'anonymisation compte : purge des objets non fiscaux dans le bucket utilisateur

#### Règle fondamentale

```
La suppression d'un compte doit inclure
la purge des objets storage non soumis à conservation légale.

Les PDF et UBL de factures sont exemptés de cette purge.
```

---

### 2.7 Sur les logs — Observabilité vs RGPD

#### Avant l'audit

```
État perçu : "les logs sont des outils de debug"
Statut : infrastructure technique, hors périmètre RGPD
```

#### Après l'audit

```
Problème réel : les logs sont une surface d'attaque RGPD non maîtrisée

  Plusieurs couches génèrent des logs pouvant contenir des PII :
  - logs financiers (audit_logs)
  - logs IA (llm_invoice_logs)
  - logs techniques (Vercel, Edge Functions)
  - logs async (async_jobs)
  - logs sécurité (rate_limit_logs)

  Sans stratégie dédiée :
  - duplication non contrôlée de données personnelles
  - conservation excessive et hors politique
  - exposition en cas d'incident sécurité

Doctrine retenue :
  Les logs sont une surface d'attaque RGPD,
  pas seulement un outil de debug.
```

#### Règles de minimisation

Ne jamais logger directement :
- IBAN (même partiel — sauf 4 derniers chiffres si nécessaire)
- Numéros TVA complets dans les logs techniques
- Emails complets dans les payloads bruts
- Données client dans les traces IA

#### Redaction automatique

Logger centralisé avec substitution systématique :

```typescript
// Principe de redaction
{
  iban:  "BE62 5100 0754 7061"  →  "[IBAN-REDACTED]"
  vat:   "BE0883660134"         →  "BE****6134"
  email: "flow@invoiceai.be"    →  "f***@invoiceai.be"
}
```

#### Rétention différenciée par type de log

| Type | Rétention | Justification |
|------|-----------|---------------|
| `audit_logs` (financier) | 7 ans | Obligation légale comptable |
| `llm_invoice_logs` (IA) | 2 ans | Traçabilité IA raisonnable |
| Logs techniques (Vercel) | 30 jours | Debug opérationnel |
| `rate_limit_logs` | 90 jours | Sécurité anti-abus |

#### Limite assumée et documentée

```
Les logs sont pseudonymisés, pas totalement anonymisés.
La conservation de certains identifiants techniques
(user_id, invoice_id) est nécessaire à la traçabilité légale.
```

---

### 2.7.b Sur les services tiers — Chaîne de responsabilité

#### Problème réel

InvoiceAI ne s'exécute pas seul. Une partie de la conformité réelle dépend de services tiers qui traitent des données utilisateur en production :

| Service | Rôle | Données traitées |
|---------|------|-----------------|
| **Stripe** | Paiement | Données de facturation, email |
| **Resend** | Email transactionnel | Email, contenu facture |
| **Anthropic** | IA (Claude) | Contenu prompt (hors PII après redaction) |
| **Billit** | Réseau Peppol | Données UBL complètes |
| **Supabase** | DB + Auth + Storage | Toutes les données |
| **Vercel** | Infra frontend + logs | Logs techniques, headers |

#### Doctrine retenue

```
Un sous-traitant n'est pas une boîte noire.

Tout service tiers qui traite une donnée utilisateur d'InvoiceAI
fait partie du périmètre de responsabilité de l'éditeur.

La conformité d'InvoiceAI ne se juge pas uniquement sur son code source,
mais sur l'ensemble de sa chaîne de traitement.
```

#### Règles retenues

- aucun service tiers ne reçoit plus de données que nécessaire (principe de minimisation)
- tout sous-traitant critique doit avoir une base contractuelle explicite (DPA / SCC / TOS compatibles RGPD)
- les politiques de rétention et d'export des tiers doivent être auditées
- aucun flux légal critique ne doit dépendre d'un tiers sans plan de repli documenté

#### État contractuel actuel

| Service | DPA signé | Statut |
|---------|-----------|--------|
| Stripe | Inclus dans les TOS | ✅ Couvert |
| Supabase | DPA disponible | 🟠 À signer formellement |
| Resend | DPA disponible | 🔴 L1 — À traiter |
| Anthropic | DPA disponible | 🔴 L1 — À traiter |
| Billit | Contrat éditeur requis | 🟠 L3 — Post-10 clients |
| Vercel | DPA inclus Enterprise | 🟠 À vérifier plan actuel |

#### Conséquence directe

```
Tant que les DPA Anthropic et Resend ne sont pas signés,
InvoiceAI traite des données utilisateur via des sous-traitants
sans base contractuelle RGPD Art. 28 formalisée.

C'est la non-conformité L1 — à traiter avant tout premier client payant supplémentaire.
```

---

## 2.8 Workflow complet — Devis → Facture → Paiement → Audit Trail

> Cette section formalise le cycle de vie complet d'un document dans InvoiceAI.
>
> Elle illustre l'application concrète des règles fondamentales :
> - SSOT financière (UI = DB = PDF = UBL)
> - Dumb Renderers · Smart Backend
> - IA assistive, jamais décisionnelle
> - Immutabilité légale
> - Audit trail systématique

---

### Phase 1 — Devis (Entrée du cycle)

Le devis constitue le point d'entrée du flux commercial, sans portée fiscale tant qu'il n'est pas accepté.

**Architecture retenue**

- Les devis sont stockés dans la **même table `invoices`** avec `document_type = 'quote'`
- Même structure de données que les factures (lignes, montants, TVA, snapshot)
- Pas d'immutabilité stricte tant que statut = `draft`

**Règles**

- modifiable ou supprimable si non accepté
- aucun numéro fiscal définitif attribué
- les calculs passent déjà par le FIE (même moteur que pour les factures)

```
Risque évité :
  Divergence entre logique devis et logique facture
  → incohérence lors de la conversion → erreur fiscale invisible
```

---

### Phase 2 — Génération (IA assistive + moteur déterministe)

```
Principe fondamental :
  L'IA propose.
  Le moteur décide.
  L'humain valide.
```

**Rôle de l'IA (Claude)**

| Autorisé | Interdit |
|----------|----------|
| Structuration de texte libre | Calcul de montants |
| Suggestion de lignes (description, quantité indicative) | Application d'un taux TVA |
| Reformulation de descriptions | Choix du scénario fiscal |
| | Toute décision impactant la conformité |

**Financial Integrity Engine (FIE)**

- `decimal.js` obligatoire
- calcule : totaux ligne · sous-total · TVA selon `vat_scenario` · total TTC
- applique : whitelist de taux TVA · règles fiscales déterministes par `country_code`
- bloque : toute facture sans `vat_scenario` explicite

```
Doctrine :
  Aucun montant affiché à l'utilisateur
  n'existe sans avoir été calculé et validé par le backend.
```

---

### Phase 3 — Conversion Devis → Facture (Opération irréversible)

**Étapes atomiques (RPC PostgreSQL)**

1. Nouvelle entrée `document_type = 'invoice'`
2. Numéro fiscal généré via `get_next_invoice_number()` avec `pg_advisory_xact_lock`
3. Devis source → statut `cancelled`
4. Lien conservé via `linked_invoice_id`
5. Écriture `audit_logs` dans la même transaction

```
Règle :
  Une facture ne peut jamais redevenir un devis.
  L'opération est irréversible dès la création.
```

---

### Phase 4 — Émission (HITL + snapshot + atomicité)

**Validation humaine (HITL)**

- confirmation explicite côté **serveur** (pas uniquement UI)
- flag `human_validated = true` vérifié dans la RPC avant toute persistance
- action enregistrée dans `audit_logs` avec `user_id` et `timestamp`

**Transaction atomique — tout ou rien**

```
RPC create_invoice() :
  INSERT invoices          (avec snapshot émetteur + client)
  INSERT invoice_items
  INSERT audit_logs
  → commit ou rollback total
  → aucun état partiel possible
```

**Snapshot obligatoire à l'INSERT**

- données émetteur → colonnes `issuer_*` (9 colonnes)
- données client → colonnes `client_*` (6 colonnes minimum)

```
Le snapshot émetteur et client doit être figé avant toute émission PDF ou UBL.
Aucun document ne doit être généré à partir de tables live.
```

```
Résultat :
  La facture devient immuable, autosuffisante,
  indépendante de toute table live.

Interdiction absolue :
  UPDATE sur facture émise → BLOQUÉ (trigger PostgreSQL)
  Toute correction → note de crédit uniquement
```

---

### Phase 5 — Génération documentaire (PDF + UBL)

**Distinction critique**

```
UBL XML  = source légale technique (Peppol)
PDF      = projection lisible du snapshot
```

**Règle fondamentale**

```
PDF et UBL dérivent de la même source persistée.
Ils doivent être strictement cohérents.
Toute divergence entre les deux est un échec de conformité.
```

**Doctrine renderers**

- aucun recalcul dans le renderer PDF
- aucun recalcul dans le mapper UBL
- lecture uniquement des valeurs persistées et validées par le FIE

---

### Phase 6 — Transmission (Asynchrone + résiliente)

```
Principe :
  Aucune dépendance externe ne doit bloquer l'utilisateur.
```

**Mécanisme via `async_jobs`**

```
Flux :
  1. Génération UBL XML
  2. Envoi vers Billit → réseau Peppol
  3. Envoi email via Resend

Résilience :
  - retry avec exponential backoff
  - statut traqué : pending / processing / done / failed / dead_letter
  - aucune perte silencieuse possible
```

---

### Phase 7 — Paiement

**Intégration Stripe**

- lien de paiement intégré à la facture
- mise à jour du statut via **webhook sécurisé** uniquement

**Règle**

```
Le statut financier d'une facture est déterminé
par des événements backend (webhooks),
jamais par le frontend.
```

**États possibles** : `sent` · `paid` · `overdue` · `disputed`

---

### Phase 8 — Relance

**Approche retenue**

- règles déterministes (J+7 / J+15 / J+30)
- templates contrôlés et auditables

**IA — rôle optionnel et encadré**

```
Autorisé : améliorer le ton de la relance
Interdit  : modifier les montants, les obligations légales, le statut

Doctrine :
  L'IA optimise la communication.
  Elle ne pilote pas la logique financière.

  Les relances IA restent une amélioration ultérieure
  conditionnée à : DPA signés · logs IA en place · templates auditables.
```

---

### Phase 9 — Audit Trail (Traçabilité légale)

```
Principe fondamental :
  Un événement non loggé n'existe pas.
```

**Événements journalisés obligatoirement**

| Événement | Code |
|-----------|------|
| Création document | `invoice.created` |
| Conversion devis → facture | `invoice.converted` |
| Émission | `invoice.sent` |
| Envoi Peppol | `invoice.sent_peppol` |
| Paiement reçu | `payment.received` |
| Passage en retard | `invoice.overdue` |
| Note de crédit créée | `credit_note.created` |
| Anonymisation compte | `user.anonymized` |

**Caractéristiques techniques**

- horodatage précis (timezone UTC)
- `user_id` + `resource_id` systématiques
- données sensibles redactées avant insertion
- insertion backend uniquement (RLS en lecture pour l'utilisateur)
- conservation : **7 ans** (obligation légale)

---

### Synthèse du workflow

Ce pipeline garantit :

```
Cohérence     → SSOT (UI = DB = PDF = UBL)
Conformité    → immutabilité + snapshot + FIE déterministe
RGPD          → minimisation + pseudonymisation + séparation comptable
Résilience    → async_jobs + retry + dead letter
Traçabilité   → audit_logs systématique sur chaque événement légal

InvoiceAI n'est pas un générateur de documents.
Il exécute un pipeline de conformité financière.
```

---

## 3. Carte des dépendances inter-fixes

> Section critique. L'ordre d'exécution des corrections n'est pas libre.
> Certains fixes sont des prérequis bloquants pour d'autres.

```
ARBRE DE DÉPENDANCES — Sprint 7+

C3 — audit_logs alimentés
  └── prérequis : aucun (peut démarrer maintenant)

C10 — anonymize_user_data()
  └── prérequis 1 : colonnes client_* snapshot dans invoices [MIGRATION]
  └── prérequis 2 : backfill des factures existantes
  └── prérequis 3 : C3 résolu (l'anonymisation doit elle-même être loggée)

C7 — peppol_id persisté dans clients
  └── prérequis : aucun (peut démarrer maintenant)

C1 — Peppol / émission UBL réelle
  └── prérequis 1 : C7 résolu (peppol_id disponible)
  └── prérequis 2 : async_jobs opérationnel (C9)
  └── prérequis 3 : HITL serveur (C6)
  └── prérequis 4 : numéro TVA émetteur disponible (hors code)

C9 — async_jobs / queue résiliente
  └── prérequis : migration DB confirmée + pg_cron activé

C6 — HITL serveur
  └── prérequis : C3 résolu (le HITL doit être loggé)

C4 — Sécurité 42/100
  └── prérequis : aucun (audit RLS peut démarrer maintenant)
  └── inclut : rate limiting · headers CSP · secrets rotation

C8 — useInvoiceGenerator / feature IA
  └── prérequis : C3, C4, C6 résolus (pas de feature IA sans conformité de base)
```

---

## 4. État au 28 mars 2026 — Registre consolidé

### Conflits (10)

| ID | Titre | Statut | Date résolution |
|----|-------|--------|-----------------|
| C1 | Peppol sans émission UBL | 🔴 À TRAITER | — |
| C2 | Double moteur float/decimal.js | 🟢 RÉSOLU | 26/03/2026 |
| C3 | audit_logs non alimentés | 🟠 EN COURS | — |
| C4 | Score sécurité 42/100 en prod | 🔴 À TRAITER | — |
| C5 | Deux sources de vérité TVA (12% BE) | 🔴 À TRAITER | — |
| C6 | HITL absent | 🔴 À TRAITER | — |
| C7 | peppol_id jamais persisté | 🔴 À TRAITER | — |
| C8 | useInvoiceGenerator inexistant | 🟡 DIFFÉRÉ | post-conformité |
| C9 | async_jobs non confirmée | 🔴 À TRAITER | — |
| C10 | anonymize_user_data() absente | 🟠 EN COURS — snapshot client prérequis planifié | — |

### Lacunes (5)

| ID | Titre | Statut | Date résolution |
|----|-------|--------|-----------------|
| L1 | DPA Anthropic + Resend | 🔴 À TRAITER | — |
| L2 | Numérotation multi-profil | 🟢 RÉSOLU | 26/03/2026 |
| L3 | Contrat Billit éditeur | 🟠 EN ATTENTE | post-10 clients |
| L4 | Export RGPD Art. 20 | 🔴 À TRAITER | — |
| L5 | Localisation NL | 🟡 DIFFÉRÉ | post-FR |

---

## 5. Ce qui reste — Prochaines cibles Sprint 7

### P0 — Bloquants légaux immédiats

#### C3 — audit_logs alimentés
**Pourquoi maintenant :** Tout ce qui suit (HITL, RGPD, Peppol) doit pouvoir être loggé.  
**Fichiers cibles :** `src/hooks/useInvoices.ts` · `supabase/functions/create-invoice/`  
**Temps estimé :** 2h  
**Critère de validation :** Chaque création de facture produit une entrée dans `audit_logs` avec `user_id`, `action`, `resource_id`, `timestamp`, PII redactée.

#### C10 — anonymize_user_data() + snapshot client
**Pourquoi maintenant :** Privacy Policy déployée = obligation contractuelle active.  
**Ordre d'exécution :**
1. Migration : ajouter `client_name`, `client_vat`, `client_address`, `client_email` dans `invoices`
2. Backfill depuis `clients` sur les factures existantes
3. Implémenter `anonymize_user_data()` dans une transaction ACID
4. Implémenter Edge Function `delete-account`
5. Logger l'opération dans `audit_logs`

**Temps estimé :** 3h  
**Critère de validation :** Un appel à `anonymize_user_data(user_id)` neutralise `profiles` + `clients` + `business_profiles` sans toucher à une seule ligne de `invoices`.

#### L1 — DPA Anthropic + Resend
**Pourquoi maintenant :** Tout sous-traitant qui traite des données personnelles d'utilisateurs EU doit avoir un DPA signé. Anthropic et Resend traitent des données pour InvoiceAI.  
**Action :** Signer les DPA disponibles sur les portails respectifs + documenter dans le registre des traitements.  
**Temps estimé :** 1h

---

### P1 — Fondations techniques critiques

#### RPC `dashboard_kpis()`
**Objectif :** Remplacer les données mock dans `DashboardCockpit` par des KPIs réels.  
**Données requises :** CA mensuel · factures émises/payées/en retard · taux de conversion devis · revenu moyen par client  
**Temps estimé :** 2h

#### C7 — peppol_id persisté
**Objectif :** Le résultat de `checkPeppol()` doit être sauvegardé dans `clients.peppol_id`.  
**Temps estimé :** 45 min

---

## 6. La doctrine consolidée — 12 règles d'architecture

> **Positionnement légal du produit**
>
> InvoiceAI produit des documents fiscalement opposables.
> Toute divergence, erreur de conformité ou donnée incorrecte dans ces documents
> engage potentiellement la responsabilité de l'éditeur vis-à-vis de ses utilisateurs.
>
> Ce n'est pas une nuance juridique — c'est la raison d'existence de chacune des règles ci-dessous.

```
Règle 1  — L'IA propose · le moteur décide · l'humain valide
           Aucun montant, aucune décision fiscale ne sort d'un LLM.

Règle 2  — decimal.js obligatoire sur tout calcul financier           ✅ IMPLÉMENTÉ
           Zéro float natif sur les montants critiques.

Règle 3  — UI = DB = PDF = UBL
           Toute divergence entre ces quatre couches est un échec de conformité.

Règle 4  — Numérotation = opération DB exclusive                      ✅ IMPLÉMENTÉ
           Jamais côté applicatif. pg_advisory_xact_lock obligatoire.

Règle 5  — Toute opération légale irréversible est atomique
           RPC PostgreSQL avec transaction. Rollback total si erreur.

Règle 6  — Tout événement légalement significatif est loggé           🔴 EN COURS
           Pas de conformité sans audit trail. La table vide ne prouve rien.

Règle 7  — Facture émise = objet figé à vie
           Correction = note de crédit uniquement. Pas de raccourci.

Règle 8  — Snapshot émetteur + snapshot client obligatoires à l'INSERT
           Une facture ne dépend d'aucune table externe pour ses mentions légales.

Règle 9  — HITL obligatoire avant toute write action légale irréversible
           Confirmation humaine tracée côté serveur. Pas de checkbox cosmétique.

Règle 10 — Mode dégradé manuel toujours disponible
           Si l'IA tombe, le système continue de fonctionner.

Règle 11 — Zéro PII dans les prompts Claude
           Redaction automatique avant tout appel LLM.

Règle 12 — RLS comme dernier rempart, pas comme seule défense
           Chaque couche (Edge Function, RPC, UI) valide l'ownership indépendamment.
```

---

## 6.b Gestion des documents — Cycle de vie différencié

### Problème

InvoiceAI traite plusieurs types de documents, mais la doctrine d'immutabilité et de conservation a été pensée uniquement pour les factures. Or chaque type de document a des obligations légales distinctes.

### Avant l'audit

```
Traitement : tous les documents traités de manière homogène
Risque : sur-conservation (RGPD) sur certains types
         sous-conservation (fiscal) sur d'autres
```

### Après l'audit

```
Doctrine retenue :
  Tous les documents ne sont pas des factures.
  Leur cycle de vie doit être différencié.
  Appliquer les règles de la facture à un devis est une sur-contrainte.
  Ne pas les appliquer à une facture est une infraction.
```

### Tableau des obligations par type

| Type | `document_type` | Immutabilité | Conservation | Supprimable |
|------|----------------|--------------|--------------|-------------|
| Facture | `invoice` | ✅ Stricte | 7 ans obligatoire | ❌ Jamais |
| Note de crédit | `credit_note` | ✅ Stricte | 7 ans obligatoire | ❌ Jamais |
| Devis | `quote` | ❌ Modifiable si brouillon | — | ✅ Si non accepté |
| Bon de commande | `order` | ⚠️ Figé si confirmé | Durée contractuelle | ⚠️ Selon statut |

### Règle de conversion

```
Devis → Facture : opération irréversible
  - nouveau numéro INV- généré
  - source marquée "cancelled"
  - lien via linked_invoice_id
  - audit log obligatoire

Une facture ne peut jamais redevenir un devis.
```

### Ce qui est déjà implémenté

- Contrainte DB `invoices_document_type_check` : `invoice` · `credit_note` · `quote` · `order` ✅
- `convertToInvoice()` avec statut `cancelled` + badge "Converti" ✅
- Isolation par `document_type` dans les listes ✅

### Ce qui reste à formaliser

- Politique de suppression des devis non acceptés (RGPD + nettoyage DB)
- Durée de conservation des bons de commande confirmés
- Export RGPD Art. 20 : inclure devis ou pas ?

---

## 7. Historique des décisions majeures

| Date | Décision | Impact |
|------|----------|--------|
| 26/03/2026 | Audit initial : 10 conflits identifiés, tous 🔴 | Blocage feature development |
| 26/03/2026 | C2 résolu : migration decimal.js complète | Calculs financiers fiables |
| 26/03/2026 | L2 résolu : numérotation RPC + pg_advisory_xact_lock | Légalité de la numérotation |
| 28/03/2026 | Doctrine SSOT financière formalisée | UI = DB = PDF = UBL |
| 28/03/2026 | VAT Scenario Engine formalisé comme bloc autonome | TVA = fonction(contexte), pas une constante |
| 28/03/2026 | Snapshot client élevé au rang de mini-doctrine | Prérequis bloquant pour C10 documenté + table de champs |
| 28/03/2026 | Conflit Backups vs RGPD documenté, risque résiduel assumé | Politique rétention PITR 7 jours |
| 28/03/2026 | Logs & observabilité intégrés au périmètre RGPD | Rétention différenciée · redaction automatique |
| 28/03/2026 | Cycle de vie documentaire différencié formalisé | Facture ≠ Devis ≠ Bon de commande |
| 28/03/2026 | Storage bucket intégré au périmètre RGPD | Rétention par type · purge exports temporaires |
| 28/03/2026 | Chaîne de responsabilité tiers formalisée | DPA Anthropic + Resend = L1 bloquant |
| 28/03/2026 | Pseudonymisation ≠ anonymisation absolue — doctrine assumée | Positionnement légal défendable |
| 28/03/2026 | Workflow complet Devis→Facture→Paiement→Audit Trail intégré | Pipeline de conformité bout-en-bout |

---

## 8. Règle de mise à jour de ce document

```
Ce document retrace une évolution de pensée.
Il ne remplace pas AUDIT_RISQUES.md (registre opérationnel des statuts).
Il le complète.

Quand mettre à jour ce document :
  - Quand une décision d'architecture est prise (pas juste implémentée)
  - Quand une doctrine évolue suite à une résolution
  - Quand une nouvelle dépendance inter-fixes est découverte
  - Jamais pour corriger rétroactivement un constat — les erreurs de pensée
    passées ont autant de valeur documentaire que les bonnes décisions

Format des mises à jour :
  Ajouter dans la section concernée + ligne dans l'Historique (Section 7)
  Ne jamais supprimer — archiver si nécessaire avec mention [ARCHIVÉ]
```

---

*InvoiceAI · `docs/AUDIT_CRITIQUE_RISQUES.md`*  
*Créé le 28 mars 2026 · Branche : `feat/sprint7-audit-logs-kpis-rgpd`*