# InvoiceAI — Audit des Conflits d'Exécution
> Business Project Flow · 26 mars 2026  
> Auditeur : Claude (Architecte SI Senior + Expert Fintech)  
> Sources : Architecture-Reference-v2.md · Security-Audit.md · AI-Risks-Financial-Integrity-v1_1.md · Complement-Legal-Stripe-DR-UBL.md

---

# RÉSUMÉ EXÉCUTIF : L'ÉTAT DE VÉRITÉ

**1. Ce qui a été prouvé**

InvoiceAI peut créer une facture professionnelle, la vérifier automatiquement pour s'assurer qu'elle est légalement correcte, et encaisser un abonnement de 19€ en ligne — le tout fonctionne en production aujourd'hui. L'outil vérifie aussi instantanément si le client d'un freelance est enregistré sur le réseau officiel de facturation électronique belge, et remplit son adresse automatiquement depuis les registres officiels.

**2. Ce qui reste inconnu**

Le produit promet la conformité à la loi belge de janvier 2026, mais il ne peut pas encore envoyer une facture via le réseau officiel obligatoire — cette fonctionnalité n'est pas construite, et le contrat avec le prestataire qui permettrait de le faire n'est pas signé. On ne sait pas ce que cela coûtera par transaction à grande échelle, ni si ce coût rend le modèle économique viable.

**3. Pourquoi ça compte**

Depuis janvier 2026, tout freelance belge qui envoie une facture B2B par email au lieu du réseau officiel expose son client à une pénalité fiscale pouvant atteindre 5 000€ par an. InvoiceAI vend aujourd'hui une promesse de conformité à 19€/mois qu'il ne peut pas encore tenir techniquement — ce qui signifie que les premiers clients payants prennent un risque légal réel en croyant être couverts.

---

> ⛔ **DIRECTIVE SPRINT 7 — PRIORITÉ ABSOLUE**
>
> Ce document est la priorité absolue du Sprint 7.  
> **Aucune nouvelle fonctionnalité ne doit être développée tant que les points BLOQUANTS LÉGAUX (C1, C3, C4, C10) ne sont pas passés au vert.**
>
> Rappel : un premier client payant sur une infrastructure avec ces 4 risques actifs expose le projet à des amendes RGPD (4% du CA), des infractions fiscales belges (contrôle sans audit trail), et une potentielle responsabilité civile sur les données fiscales d'autrui.

---

## Tableau des 10 Conflits Identifiés

| # | Conflit identifié | Position A — Business / Loi | Position B — Technique réelle | Cause Racine | Statut |
|---|---|---|---|---|---|
| **C1** | **Peppol "conforme 2026" sans envoi UBL** | Le produit se commercialise comme "conforme Peppol 2026" à 19€/mois. La loi belge rend l'e-invoicing B2B obligatoire depuis janvier 2026. Sans envoi Peppol, le client B2B du freelance ne peut pas déduire sa TVA. Amende : jusqu'à 5 000€/an. | L'envoi UBL réel via Billit est planifié "post 10 clients". Aujourd'hui : `ublMapper.ts` documenté mais absent du codebase. `peppolSender.ts` inexistant. Seul le **check de présence** sur le réseau est implémenté — pas l'émission. | **Risque de Conformité** | 🔴 À TRAITER |
| **C2** | **Deux moteurs de calcul avec arithmétiques différentes** | L'architecture (Règle 2) et le document `financialEngine.ts` imposent `decimal.js` pour tout calcul financier. Un float JS qui produit `0.1 + 0.2 = 0.30000000000000004` sur une facture B2B est une faute légale. | `supabase/functions/_shared/financialEngine.ts` utilise bien `decimal.js`. Mais `src/lib/invoiceCalculations.ts` (frontend, utilisé en production par `InvoiceGenerator.tsx`) utilise le **float JS natif**. Deux moteurs coexistent avec des résultats potentiellement divergents sur les arrondis. | **Dette Technique** | 🔴 À TRAITER |
| **C3** | **`audit_logs` : obligation légale 7 ans, zéro alimentation** | Le droit comptable belge impose la conservation des pièces justificatives pendant 7 ans. En cas de contrôle fiscal, l'absence de traçabilité des actions (création, modification statut, envoi) est une infraction. Score Logs/Audit : **10/100** dans l'audit sécurité. | La table `audit_logs` est créée en DB. `logger.business()` est documenté avec redaction PII. Mais **aucune Edge Function ni aucun hook** n'appelle `logger.business()` en production. `createInvoice()`, `stripe-webhook`, `send-invoice-email` — tous silencieux. | **Risque de Conformité** | 🔴 À TRAITER |
| **C4** | **Score sécurité 42/100 "non production-ready" vs Stripe en prod** | L'audit sécurité interne établit un score global de **42/100** et conclut explicitement : "Non production-ready". RLS : 40/100 (critique). RGPD : 30/100 (non conforme). Protection abus : 20/100 (inexistant). | Le Stripe Checkout à 19€/mois est **live et testé** sur `invoiceai-template.vercel.app`. Des utilisateurs réels peuvent s'abonner et confier leurs données fiscales (TVA, IBAN, adresse entreprise) à un système dont l'isolation multi-tenant et la protection RGPD sont critiquées par le propre audit du projet. | **Risque de Conformité** | 🔴 À TRAITER |
| **C5** | **TVA 12% : ajoutée dans le code, hors scope dans la doctrine** | `vatRules.ts` (source de vérité déterministe documentée) classe `0.12` comme hors périmètre V1. La doctrine exige une whitelist stricte — jamais confier la fiscalité au LLM, jamais ajouter un taux non validé. | `LanguageContext.tsx` a ajouté le taux **12% BE** dans les 4 langues lors du Sprint 6. Ce taux est donc sélectionnable par l'utilisateur dans l'UI et persisté sur les factures, sans que `vatRules.ts` ait été mis à jour. Deux sources de vérité contradictoires. | **Contradiction IA** | 🔴 À TRAITER |
| **C6** | **HITL obligatoire avant envoi Peppol : règle absolue non implémentée** | La Règle 4 de la doctrine est sans ambiguïté : "HITL obligatoire avant toute write action légale. Envoi Peppol, PDF officiel, relance = confirmation humaine." C'est le garde-fou entre l'automatisation et la responsabilité légale du freelance. | Il n'existe **aucune checkbox, aucun dialog de confirmation** avant sauvegarde ou envoi dans `InvoiceGenerator.tsx`. Le bouton "Enregistrer en brouillon" déclenche `createInvoice()` directement après validation FIE. Le HITL explicite (Sprint 2, archi) n'a jamais été implémenté. | **Lacune de Design** | 🔴 À TRAITER |
| **C7** | **`peppol_id` référencé dans l'UBL mapper, jamais persisté** | `ublMapper.ts` génère le XML UBL en lisant `client.peppol_id` pour construire le `<cbc:EndpointID>` de l'acheteur — champ **obligatoire** pour le routage Peppol. Sans lui, la facture est non routable. | `peppol-check.ts` ne persiste jamais le résultat dans la colonne `peppol_id` de la table `clients`. La colonne existe en DB mais est toujours `null`. Quand Billit sera implémenté, **toutes les factures B2B auront un EndpointID vide**. | **Dette Technique** | 🔴 À TRAITER |
| **C8** | **`useInvoiceGenerator` hook mode dégradé : documenté, absent** | L'architecture décrit précisément `src/hooks/useInvoiceGenerator.ts` avec states `'ai' / 'manual' / 'degraded'`, circuit breaker Claude, et alerte UI de fallback. La Règle 10 : "Mode dégradé manuel toujours disponible." | Ce hook **n'existe pas** dans le codebase. La génération IA via description texte libre n'est pas implémentée. L'`InvoiceGenerator.tsx` réel est un formulaire manuel sans aucun appel Claude. La promesse IA (Sprint 4 roadmap et pitch commercial) est un **feature gap complet**. | **Lacune de Design** | 🔴 À TRAITER |
| **C9** | **`async_jobs` : architecture résilience critique, existence DB non confirmée** | L'architecture V2 est entièrement construite autour d'une table `async_jobs` avec `claim_next_job()`, exponential backoff, Dead Letter Queue. Sans elle : pas de retry Peppol, pas de relances, pas d'envoi email asynchrone fiable. | La table est définie dans les docs avec le SQL complet. Mais aucune migration confirmée dans le projet, aucun `job-worker` déployé, `pg_cron` non activé. Si Billit est implémenté sans cette queue, **un timeout Billit provoque une perte silencieuse de facture**. | **Dette Technique** | 🔴 À TRAITER |
| **C10** | **RGPD : Privacy Policy déployée, mais `anonymize_user_data()` absente** | Le RGPD (Art. 17) impose le droit à l'effacement. La roadmap Sprint 4 liste `anonymize_user_data()` comme P0 légal. La Privacy Policy sur `/privacy` crée une obligation légale contractuelle envers les utilisateurs. | `anonymize_user_data()` n'est **pas implémentée**. Un utilisateur qui demande l'effacement de son compte ne peut pas être honoré. Les données (TVA, IBAN, adresses) resteraient en base — violation RGPD exposant à une amende APD/CNIL jusqu'à 4% du CA. | **Risque de Conformité** | 🔴 À TRAITER |

---

## Classement par Criticité Immédiate

### 🔴 BLOQUANTS LÉGAUX — à traiter avant tout nouveau développement

| Conflit | Risque concret | Action requise | Fichier(s) cible |
|---------|----------------|----------------|-----------------|
| **C1** — Peppol sans envoi UBL | Amende jusqu'à 5 000€/client/an | Implémenter `ublMapper.ts` + `peppolSender.ts` + Billit API | `src/lib/ublMapper.ts` · `supabase/functions/send-peppol/` |
| **C3** — audit_logs vides | Contrôle fiscal sans défense | Brancher `logger.business()` sur 5 actions clés | `src/hooks/useInvoices.ts` · Edge Functions |
| **C4** — Sécurité 42/100 en prod | IDOR potentiel sur données fiscales | Auditer RLS + rate limiting + headers CSP | Supabase Dashboard · `vercel.json` |
| **C10** — anonymize_user_data absente | Violation RGPD Art. 17 (4% CA) | Implémenter la fonction SQL + endpoint de suppression | `supabase/functions/delete-account/` |

### 🟠 DETTES BLOQUANTES TECHNIQUES — à traiter avant activation Billit

| Conflit | Risque concret | Action requise | Fichier(s) cible |
|---------|----------------|----------------|-----------------|
| **C2** — Double moteur float/decimal.js | Arrondi légalement incorrect sur factures | Migrer `invoiceCalculations.ts` vers `decimal.js` | `src/lib/invoiceCalculations.ts` |
| **C7** — peppol_id jamais persisté | UBL non routable à l'activation Billit | Persister résultat `checkPeppol()` dans `clients.peppol_id` | `src/pages/InvoiceGenerator.tsx` · `src/hooks/useClients.ts` |
| **C9** — async_jobs non confirmée | Perte silencieuse si Billit timeout | Confirmer migration DB + déployer `job-worker` | `supabase/migrations/` · `supabase/functions/job-worker/` |

### 🟡 LACUNES DE DESIGN — à traiter avant pitch commercial

| Conflit | Risque concret | Action requise | Fichier(s) cible |
|---------|----------------|----------------|-----------------|
| **C6** — HITL absent | Doctrine violée, responsabilité légale | Ajouter dialog de confirmation avant `createInvoice()` | `src/pages/InvoiceGenerator.tsx` |
| **C8** — Feature IA inexistante | Pitch commercial sans code derrière | Implémenter `useInvoiceGenerator.ts` + appel Claude | `src/hooks/useInvoiceGenerator.ts` |
| **C5** — TVA 12% hors doctrine | Deux sources de vérité fiscale | Mettre à jour `vatRules.ts` ou retirer le taux de l'UI | `src/lib/vatScenario.ts` · `src/contexts/LanguageContext.tsx` |

---

## Workflow de Résolution

```
Pour chaque conflit, le passage au vert requiert :

  1. Implémentation technique confirmée (code mergé dans main)
  2. Test manuel documenté (screenshot ou log de console)
  3. Mise à jour du statut dans ce fichier :
       🔴 À TRAITER → 🟠 EN COURS → 🟢 RÉSOLU

  Règle : aucun conflit ne peut passer directement de 🔴 à 🟢.
  Règle : les conflits C1, C3, C4, C10 bloquent le merge de toute PR feature.
```

---

## Historique des Résolutions

| Date | Conflit | Action effectuée | Résolu par |
|------|---------|-----------------|-----------|
| 26/03/2026 | — | Document créé, 10 conflits identifiés, tous à 🔴 | Claude / Flow |

---

## III. Lacunes Stratégiques & Angles Morts (Vision 2026)

> Ces lacunes ne figurent pas dans l'audit des 10 conflits d'exécution.  
> Elles révèlent des **angles morts structurants** — zones que la documentation reconnaît implicitement mais ne résout jamais.  
> Leur non-traitement ne génère pas d'amende immédiate, mais conditionne la viabilité légale ou commerciale à grande échelle.

---

### L1 — DPA Anthropic / Resend : sous-traitants sans accord RGPD Art. 28

**Lacune :** InvoiceAI envoie des descriptions de prestations à l'API Claude d'Anthropic (entreprise américaine), mais aucun Data Processing Agreement (DPA) Art. 28 RGPD n'est signé. Toute transmission de données à un sous-traitant sans DPA constitue une base légale manquante, indépendamment du consentement utilisateur.

**Pourquoi elle existe :** Complexité réglementaire (RGPD) + Focus excessif sur l'MVP. La DPIA identifie le problème (`⚠️ À vérifier` pour Anthropic et Resend) sans proposer de chemin de résolution. La FAQ utilisateur aggrave la situation en affirmant que "les données ne sont pas utilisées pour l'entraînement" — vrai sur l'entraînement, mais sans effet sur l'obligation de DPA pour le traitement.

**Document source le plus proche :** `InvoiceAI-Enterprise-Docs.md` — Section DPIA (Document 6), tableau des sous-traitants. Nomme le problème, l'Annexe A le liste comme prérequis production, mais aucun doc ne décrit comment conclure ce DPA ni quelles Standard Contractual Clauses (SCCs) utiliser pour le transfert UE → USA.

**Chemin vers la résolution :**
- Consulter le DPA Anthropic (`anthropic.com/legal/dpa`) — vérifier l'accès sans contrat Enterprise
- Activer les SCCs EU → USA via formulaire Anthropic + même démarche pour Resend
- Vérifier formellement que les prompts ne contiennent aucune PII (Règle 9 — partiellement appliquée, jamais auditée)
- Mettre à jour le registre des traitements APD

**Statut :** 🔴 À TRAITER

---

### L2 — Numérotation séquentielle par `user_id` invalide en contexte multi-profil

**Lacune :** La fonction SQL `generate_invoice_number(p_user_id, p_year)` génère une séquence **par utilisateur**, mais InvoiceAI supporte plusieurs `business_profiles` par compte. Un utilisateur avec deux sociétés produira des numéros INV-2026-0001 à INV-2026-0025 **partagés entre deux entités juridiques distinctes** — violation directe de l'obligation légale de séquence sans rupture par entité fiscale belge.

**Pourquoi elle existe :** Dette technique + Focus excessif sur l'MVP. La feature multi-profil a été ajoutée sans réévaluer la contrainte de numérotation. L'architecture documente la séquence par `user_id` comme décision tranchée, sans mentionner l'impact du multi-profil.

**Document source le plus proche :** `InvoiceAI-Architecture-Reference.md` (Partie 3.2) décrit `generate_invoice_number(p_user_id, p_year)`. `InvoiceAI-Complement-Legal-Stripe-DR-UBL.md` (Section 1.2) liste la numérotation séquentielle comme mention légale obligatoire sans jamais faire le lien avec le problème multi-profil.

**Chemin vers la résolution :**

```sql
-- Migration corrective : séquence par business_profile, pas par user
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_business_profile_id UUID,
  p_year INTEGER
)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_seq INTEGER; BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_business_profile_id::text));
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_seq FROM invoices
  WHERE business_profile_id = p_business_profile_id
  AND EXTRACT(YEAR FROM issue_date) = p_year;
  RETURN FORMAT('INV-%s-%s', p_year, LPAD(v_seq::TEXT, 4, '0'));
END; $$;
```

Requiert migration DB + mise à jour de `useInvoices.ts` pour passer `business_profile_id` au lieu de `user_id`.

**Statut :** 🔴 À TRAITER

---

### L3 — Absence de contrat éditeur SaaS avec Billit (accès Peppol production)

**Lacune :** Billit est l'unique point d'accès Peppol d'InvoiceAI. Aucun document ne traite du coût par transaction, du modèle de pricing API, de la procédure d'onboarding Billit pour un **éditeur SaaS** (profil différent d'un utilisateur final), ni de la nécessité d'une accréditation Access Point Peppol certifiée.

**Pourquoi elle existe :** Manque de données sources + Focus excessif sur l'MVP. La documentation traite Billit comme une API technique, jamais comme une relation commerciale à établir. Le SLA Billit est marqué *"Non publié — À négocier dans le contrat"* — reconnaissance implicite qu'aucun contrat n'existe.

**Document source le plus proche :** `InvoiceAI-Complement-Legal-Stripe-DR-UBL.md` (Section 4) documente le mapping UBL et le format d'appel API Billit en détail. `InvoiceAI-Enterprise-Docs.md` liste Billit dans le tableau SLA. Aucun document ne répond à : comment un éditeur SaaS émettant pour N freelances s'intègre sur le réseau Peppol — ce qui peut nécessiter une accréditation **Service Provider**, pas un simple accès API utilisateur final.

**Chemin vers la résolution :**
- Contacter Billit Developer Relations (`developer.billit.eu`) pour un contrat éditeur
- Clarifier le modèle : tarification par transaction vs abonnement volume
- Vérifier si InvoiceAI doit s'enregistrer comme Access Point Peppol certifié ou si Billit joue ce rôle
- Anticiper l'impact sur les marges : à 6 000 clients Pro × 10 factures/mois × ~0,30€/envoi = 18 000€/mois de coût variable non budgété dans les projections MRR actuelles

**Statut :** 🟠 À TRAITER avant Sprint Peppol

---

### L4 — Portabilité des données RGPD Art. 20 : promesse contractuelle sans implémentation

**Lacune :** La DPIA déclare formellement que le droit à la portabilité est garanti via "Export CSV/JSON, délai 30 jours". Aucun code d'export n'existe dans le codebase. C'est une **obligation contractuelle active** envers chaque utilisateur depuis la publication de `/privacy`.

**Pourquoi elle existe :** Complexité réglementaire (RGPD) + Focus excessif sur l'MVP. La DPIA a été rédigée avec les bonnes intentions légales, mais les procédures listées dans le tableau des droits (`Export JSON via dashboard`) n'ont jamais été implémentées. Le premier utilisateur qui fait une demande formelle d'export déclenche un délai légal de 30 jours — non respecté = infraction.

**Document source le plus proche :** `InvoiceAI-Enterprise-Docs.md` — Document 6 DPIA, tableau des droits, ligne "Droit à la portabilité". Le Runbook (Document 8) traite la suppression de compte mais uniquement via `anonymize_user_data()` — elle-même absente du code (C10 de l'audit). Aucun document ne précise le périmètre exact de l'export.

**Chemin vers la résolution :**
- Définir le périmètre légal : factures + lignes + clients + profil entreprise (mais **pas** les données fournies par des tiers)
- Implémenter une Edge Function `export-user-data` retournant un ZIP contenant :
  - `invoices.json` + `invoice_items.json`
  - `clients.json`
  - `business_profiles.json`
  - `metadata.json` (date export, version format, user_id)
- Ajouter un bouton "Exporter mes données" dans les Settings utilisateur

**Statut :** 🔴 À TRAITER

---

### L5 — Localisation NL absente : 60% du marché adressable belge non servi

**Lacune :** Le pitch commercial positionne InvoiceAI comme "Bilingue FR/NL natif (v1.1)" pour servir 1,2M d'indépendants belges, mais aucun document technique ne spécifie l'architecture de localisation NL, les templates de mentions légales en néerlandais (légalement distincts des mentions FR), l'adaptation du prompt Claude pour le NL, ni la validation avec des numéros d'entreprise flamands.

**Pourquoi elle existe :** Contrainte technique (IA) + Focus excessif sur l'MVP. La Model Card reconnaît la limitation ("NL prévu en v1.1") sans la traiter comme un risque business structurant. Pourtant, 60% de la population active belge est néerlandophone (Flandre + Bruxelles bilingue). Les projections MRR supposent implicitement un marché bilingue.

**Document source le plus proche :** `InvoiceAI-Enterprise-Docs.md` (Document 10, tableau concurrentiel) — `LanguageContext.tsx` gère déjà 4 langues pour les taux TVA (Sprint 6), suggérant que l'infrastructure i18n existe partiellement. La Model Card indique 94% de fiabilité en détection FR/NL combiné — insuffisant pour du légal. Aucun document n'aborde les mentions légales NL spécifiques (`"BTW verlegd"` pour l'autoliquidation, `"Vrijgesteld van BTW"` pour les exonérations).

**Chemin vers la résolution :**
- Faire valider les templates de mentions légales NL par un juriste fiscaliste flamand (Unizo)
- Adapter le prompt Claude pour le NL + 50 cas golden dataset NL
- Étendre `LanguageContext.tsx` à toutes les mentions légales (pas seulement les taux TVA)
- Envisager un partenariat Unizo comme canal d'acquisition NL (équivalent UCM pour la Flandre)

**Statut :** 🟡 À TRAITER avant scale Flandre

---

## Synthèse — Classement par Criticité Existentielle

| Rang | Lacune | Criticité | Critère de classement |
|------|--------|-----------|----------------------|
| **#1** | L1 — DPA Anthropic/Resend absent | 🔴 Légal actif | Bloque la légalité de tout traitement en production dès le premier utilisateur. Exposition APD immédiate si signalement. |
| **#2** | L2 — Numérotation multi-profil invalide | 🔴 Légal latent | Invisible aujourd'hui, produit des factures **légalement invalides** dès le premier client bi-société. Impossible à corriger rétroactivement sans renumérotation. |
| **#3** | L3 — Contrat Billit éditeur SaaS absent | 🟠 Business critique | Sans accès API Peppol production, C1 de l'audit reste rouge indéfiniment. Risque pricing à l'échelle qui détruit les marges. |
| **#4** | L4 — Export portabilité RGPD Art. 20 absent | 🟠 Légal différé | Promesse contractuelle active via `/privacy`. Devient critique au premier utilisateur qui en fait la demande formelle (30 jours légaux). |
| **#5** | L5 — Localisation NL absente | 🟡 Business structurant | Exclut 60% du marché adressable belge malgré la promesse du pitch commercial. Impact direct sur les projections MRR. |

> **Note :** Ces 5 lacunes ne sont pas des oublis de développeur — elles révèlent une tension structurelle entre la vitesse d'exécution MVP et les obligations d'un produit financier régulé. Leur résolution ne requiert pas plus de 3 semaines de travail ciblé, mais chacune conditionne la viabilité légale ou commerciale à grande échelle.

---

---

## IV. Le Registre des Hypothèses Critiques

> Ces hypothèses ne sont ni des bugs ni des dettes techniques.  
> Ce sont des **paris stratégiques non déclarés** — des affirmations présentées comme des faits dans le pitch commercial et la roadmap, sans avoir été testées, chiffrées ou reconnues comme risques.  
> Chaque hypothèse fausse peut invalider tout ou partie du modèle économique.

---

### H1 — L'urgence légale crée de l'acquisition spontanée

**Hypothèse :** La pression légale Peppol 2026 suffit à convaincre les freelances de changer d'outil. Le marché viendra à InvoiceAI par peur de l'amende, sans nécessiter de budget acquisition significatif ni de support au changement.

**Partagée par :** Enterprise-Docs Document 10 (GTM — "articles sur la conformité Peppol = trafic qualifié") · Architecture-Reference-v2 (Pilier 1 — "déclencheur d'urgence qui justifie l'abonnement à 19€/mois sans friction") · AUDIT_RISQUES.md (Résumé Exécutif, point 3)

**Niveau de risque :** 🔴 Élevé

**Conséquence :** Si les freelances adoptent une posture "wait and see" — comme lors de la caisse enregistreuse belge (obligation 2013, application réelle 2016-2017) — l'urgence perçue s'effondre, la fenêtre d'acquisition anxiogène disparaît, et les projections MRR à 6 000 clients deviennent inatteignables sans budget marketing structuré, absent de toute roadmap.

---

### H2 — Le coût variable Billit est absorbable dans les marges actuelles

**Hypothèse :** Le coût par transaction Peppol via Billit API restera suffisamment bas pour que le modèle économique à 9-19€/mois reste rentable, quelle que soit l'échelle.

**Partagée par :** ROADMAP.md (plans tarifaires — aucune ligne "coût Peppol") · Complement-Legal-Stripe-DR-UBL (SLA table — "Billit : non publié, à négocier") · Architecture-Reference-v2 (Pilier 3 — projections MRR sans coûts variables)

**Niveau de risque :** 🔴 Élevé

**Conséquence :** Les projections MRR (22 800€ à 228 000€) ne déduisent aucun coût variable Peppol. Si Billit facture 0,30-0,50€ par transmission, un client Pro à 19€ émettant 30 factures/mois génère 9-15€ de coût Billit seul. Au scénario réaliste (6 000 clients × 15 factures × 0,40€), le coût variable mensuel Peppol atteint **36 000€ pour un MRR de 114 000€** — rendant le modèle "factures illimitées" structurellement déficitaire. L'ensemble du pricing nécessiterait une refonte complète.

---

### H3 — Billit reste l'unique point d'accès Peppol, disponible et neutre

**Hypothèse :** Billit acceptera d'onboarder InvoiceAI comme partenaire éditeur SaaS, maintiendra son accès API sans changement de conditions, et ne deviendra jamais un concurrent direct sur le segment freelance.

**Partagée par :** ROADMAP.md (sprint 3 — "envoi via Billit API") · Architecture-Reference-v2 (Pilier 1 — chaîne de liaisons) · Enterprise-Docs (architecture globale — "Billit API (envoi UBL Peppol)")

**Niveau de risque :** 🔴 Élevé

**Conséquence :** Billit est une entreprise commerciale belge proposant déjà une solution de facturation grand public (Billit.be). Si elle refuse l'accès SaaS multi-émetteur, modifie son pricing, ou lance une offre ciblant les freelances, InvoiceAI perd simultanément son fournisseur Peppol **et** fait face à un concurrent mieux positionné sur le réseau. Aucune alternative documentée ni plan B d'Access Point n'existe dans les documents.

---

### H4 — La complexité fiscale réelle des freelances correspond aux cas "standards" gérés

**Hypothèse :** La majorité des freelances IT belges facture exclusivement en TVA 21% standard, sans autoliquidation fréquente, sans transactions intracommunautaires régulières, et sans structures mixtes. Le périmètre V1 couvre l'essentiel du marché adressable réel.

**Partagée par :** Enterprise-Docs Model Card (Document 3 — "TVA standard uniquement") · Architecture-Reference-v2 (vatRules.ts — "freelance IT = moins d'exceptions TVA") · ROADMAP.md (positionnement segment cible)

**Niveau de risque :** 🟠 Moyen

**Conséquence :** Les freelances IT belges travaillent fréquemment pour des clients européens (autoliquidation obligatoire : Article 39bis), certains sont en franchise TVA (Article 56bis), et beaucoup ont des structures holding mixtes. Si 30-40% du marché cible a des besoins fiscaux hors périmètre V1, le taux de conversion s'effondre et la promesse "zéro rejet fiscal" devient fausse dès le premier cas non standard envoyé sur Peppol avec le mauvais régime TVA.

---

### H5 — Anthropic maintient un pricing API stable compatible avec un SaaS à marge fixe

**Hypothèse :** Le coût d'appel à l'API Claude restera stable et prévisible, permettant d'offrir la génération IA comme feature incluse dans des abonnements à prix fixe, sans que la croissance du volume d'utilisateurs ne crée un effet de ciseau économique.

**Partagée par :** Enterprise-Docs Model Card (Document 3 — "Rate limiting : 20 appels/heure/utilisateur") · Architecture-Reference-v2 (Pilier 2 — "L'IA propose, le moteur décide") · ROADMAP.md (plan Business 39€ — "IA génération Premium")

**Niveau de risque :** 🟠 Moyen

**Conséquence :** L'API Claude n'a "aucun SLA contractuel public" (noté explicitement dans la table DR). Si Anthropic modifie son pricing ou ses conditions pour les applications financières, le coût marginal de chaque facture générée par IA peut dépasser la marge unitaire du plan Starter à 9€. Par ailleurs, un incident Anthropic de 4h en période de clôture fiscale rend InvoiceAI inopérant sans recours contractuel possible.

---

### H6 — Le freelance adopte InvoiceAI sans nécessiter d'intégration comptable validée

**Hypothèse :** Les freelances IT belges adoptent InvoiceAI comme outil autonome, et leur comptable accepte les exports InvoiceAI comme source de vérité sans procédures d'intégration supplémentaires avec WinBooks, BOB ou Octopus.

**Partagée par :** Enterprise-Docs Document 9 (onboarding — "2 minutes") · ROADMAP.md (sprint 4 — "export comptable comme argument commercial fort") · Architecture-Reference-v2 (Pilier 3 — "copilote de trésorerie")

**Niveau de risque :** 🟠 Moyen

**Conséquence :** En Belgique, la majorité des indépendants utilise un comptable (souvent imposé par leur structure juridique SRL/SPRLU). Si le comptable refuse les exports InvoiceAI ou si l'outil ne s'intègre pas dans les logiciels comptables standard (sprint 4 "à définir"), l'adoption reste cantonnée à une minorité sans comptable. L'argument "réduit le coût comptable" — cité comme argument commercial fort — repose entièrement sur cette hypothèse non testée.

---

### H7 — L'enforcement Peppol démarrera effectivement avec des amendes réelles dès 2026

**Hypothèse :** Les autorités belges commenceront à sanctionner activement le non-respect de l'obligation Peppol dès 2026, créant la pression commerciale sur laquelle repose l'ensemble de la stratégie d'acquisition d'InvoiceAI.

**Partagée par :** ROADMAP.md (sprint 3 — "Amendes : 1 500€ / 3 000€ / 5 000€") · AUDIT_RISQUES.md (Résumé Exécutif — "pénalité fiscale pouvant atteindre 5 000€/an") · Enterprise-Docs Document 10 (pitch commercial)

**Niveau de risque :** 🟠 Moyen

**Conséquence :** L'administration fiscale belge (SPF Finances) n'a historiquement jamais appliqué les sanctions dès J+1 des nouvelles obligations. Si les premières amendes réelles n'arrivent qu'en 2027-2028, le trafic SEO "conformité Peppol 2026" se tarit, les freelances continuent à envoyer des PDFs sans conséquence immédiate, et l'argument de vente principal perd sa force de conviction pendant 12-24 mois critiques pour la traction initiale.

---

## Synthèse — Classement par Conséquence Existentielle

| Rang | Hypothèse | Risque | Critère de classement |
|------|-----------|--------|-----------------------|
| **#1** | H2 — Coût Billit absorbable | 🔴 Élevé | Détruit les marges à l'échelle — modèle déficitaire si faux |
| **#2** | H3 — Billit disponible et neutre | 🔴 Élevé | Perte simultanée du fournisseur Peppol et apparition d'un concurrent |
| **#3** | H1 — Urgence légale = acquisition spontanée | 🔴 Élevé | Effondrement des projections MRR sans GTM alternatif budgété |
| **#4** | H7 — Enforcement réel dès 2026 | 🟠 Moyen | Fenêtre d'acquisition de 12-24 mois perdue si les amendes tardent |
| **#5** | H4 — Freelances = cas fiscaux simples | 🟠 Moyen | Taux de conversion fracturé si 30%+ du marché est hors périmètre V1 |
| **#6** | H5 — Pricing Claude API stable | 🟠 Moyen | Plan Starter à 9€ non rentable si coût IA monte + SLA inexistant |
| **#7** | H6 — Adoption sans comptable intégré | 🟠 Moyen | Blocage de conversion si le comptable rejette le workflow |

> **Verdict d'analyste :** La survie du modèle économique tient à trois paris simultanés qui se renforcent mutuellement — que Billit soit accessible et abordable (H2+H3), que la peur de l'amende convertisse sans budget marketing (H1+H7), et que les cas fiscaux simples soient majoritaires (H4). Ces trois hypothèses n'ont été ni testées ni chiffrées dans aucun document. Elles sont présentées comme des faits dans le pitch commercial.

---

---

## V. Analyse Transversale du Corpus Documentaire

> *Posture : Auditeur Senior en Systèmes d'Information · 26 mars 2026*  
> Cette section ne résume pas les documents un par un. Elle analyse la solidité — ou la fragilité — du système dans son ensemble.

---

### Inventaire du Corpus

| Nom du Document | Type | Argument Central |
|-----------------|------|-----------------|
| `AI-ARCHITECTURE.md` | Technique | Pipeline IA 6 couches garantissant que Claude ne calcule jamais de montants |
| `InvoiceAI-AI-Risks-Financial-Integrity-v1_1.md` | Technique/Audit | Catalogue des risques de dérive LLM avec contre-mesures Decimal.js |
| `InvoiceAI-Architecture-Reference.md` | Technique | Décisions architecturales tranchées : sync/async, queue, idempotence, résilience |
| `InvoiceAI-Architecture-Reference-v2.md` | Technique/Audit | État de maturité réel 26 mars 2026 — 3 piliers avec statuts live/mocké |
| `InvoiceAI-Security-Audit.md` | Audit | Score sécurité 42/100 — 10 vulnérabilités critiques |
| `InvoiceAI-Enterprise-Docs.md` | Stratégie/Légal | Dictionnaire de données, gouvernance IA, DPIA RGPD, GTM |
| `InvoiceAI-Complement-Legal-Stripe-DR-UBL.md` | Technique/Légal | Mentions légales BE/FR, Stripe, backup DR, mapping UBL 2.1 |
| `ROADMAP.md` | Stratégie | Vision produit, plans tarifaires, positionnement concurrentiel |
| `AUDIT_RISQUES.md` | Audit | Registre vivant : 10 conflits, 5 lacunes, 7 hypothèses non testées |

---

### Inférence de Thèse — Documents Techniques

| Document / Composant | Intention métier déduite |
|----------------------|-------------------------|
| Pipeline PII + guardrails (`AI-ARCHITECTURE.md`) | Protéger la responsabilité légale du freelance et la conformité RGPD en empêchant toute donnée personnelle d'entrer dans un LLM |
| `financialEngine.ts` (Decimal.js + whitelist TVA) | Rendre InvoiceAI juridiquement opposable — un arrondi float incorrect sur une facture Peppol constitue une infraction fiscale |
| `ublMapper.ts` | Traduire les données Supabase en langage que le réseau Peppol peut router — couche d'interopérabilité légale sans laquelle aucune facture B2B belge n'est valide en 2026 |
| `generate_invoice_number(p_user_id)` SQL | Garantir la numérotation séquentielle sans trou — obligation légale comptable Art. 53 Code TVA belge |
| `piiSanitizer.ts` + `rehydrate()` | Résoudre la contradiction fondamentale entre le besoin de contexte textuel pour l'IA et l'interdiction RGPD d'envoyer des PII à Anthropic |
| `checkRateLimit()` + circuit breaker | Transformer une dépendance externe sans SLA (Claude API) en feature fiable avec mode dégradé explicite |

---

### Clustering Thématique

| Cluster | Documents | Cohérence requise |
|---------|-----------|-------------------|
| **A — Conformité Fiscale & Peppol** | `Complement-Legal`, `Architecture-Reference` (idempotence), `AI-ARCHITECTURE` (FIE), `AI-Risks-v1_1` | Sans le FIE Decimal.js et le mapping UBL exact, toute facture peut être rejetée par Peppol ou produire une valeur fiscale incorrecte — les trois doivent fonctionner comme une chaîne sans rupture |
| **B — Gouvernance IA & Sécurité** | `AI-ARCHITECTURE` (PII + HITL), `Enterprise-Docs` (DPIA), `Security-Audit` (RLS) | Si la sanitisation PII échoue avant l'appel Claude, le DPA sans signature devient une infraction active — conformité RGPD et fiabilité IA ne peuvent pas être découplées |
| **C — Infrastructure & Résilience** | `Architecture-Reference` (queue + circuit breaker), `Complement-Legal` (DR), `Enterprise-Docs` (Runbook) | Une facture correcte mais perdue dans un système sans idempotence ni retry devient une donnée fiscale manquante — obligation légale 7 ans |
| **D — Stratégie & Modèle Économique** | `ROADMAP`, `Enterprise-Docs` (GTM + MRR), `Architecture-Reference-v2` (Pilier 3) | Les projections MRR ne sont viables que si le produit livre ce qu'il promet — or les hypothèses H1/H2/H3 montrent que les trois fondations du modèle n'ont pas été testées |
| **E — Registre de Risques** | `AUDIT_RISQUES`, `Security-Audit`, `Architecture-Reference-v2` | Le registre n'est utile que s'il est intégré au workflow de développement comme condition bloquante de merge |

---

### Les 7 Frictions Directes entre Documents

**Friction 1 — Promesse d'intégrité vs code en production**
`AI-ARCHITECTURE.md` (`import Decimal from 'decimal.js'` décrit comme obligatoire) **vs** `Architecture-Reference-v2.md` ("`decimal.js` non implémenté — DETTE BLOQUANTE")
→ Le document technique le plus avancé décrit une implémentation correcte. L'état réel confirme qu'elle n'existe pas côté frontend. Tout lecteur externe du corpus croira le FIE implémenté correctement.

---

**Friction 2 — Conformité Peppol vendue vs code d'émission absent**
`ROADMAP.md` (plan Starter 9€ — "Peppol émission inclus") **vs** `Architecture-Reference-v2.md` ("envoi UBL : ❌ 0%") + `AUDIT_RISQUES.md` (C1 — "`ublMapper.ts` absent du codebase")
→ Le document commercial vend une feature. L'audit confirme qu'elle n'existe pas. Aucun document ne propose une communication transparente aux clients actuels ni un délai contractuellement défini.

---

**Friction 3 — HITL règle absolue vs absence dans le code livré**
`AI-ARCHITECTURE.md` (§9 — HITL tracé) + `Architecture-Reference.md` (Règle 4 — "HITL obligatoire") **vs** `AUDIT_RISQUES.md` (C6 — "aucun dialog de confirmation dans `InvoiceGenerator.tsx`")
→ Trois documents décrivent le HITL comme règle absolue. Un quatrième confirme que cette règle n'est appliquée nulle part. Une doctrine sans implémentation est inopérante précisément là où elle devait protéger le freelance.

---

**Friction 4 — Numérotation "thread-safe" vs réalité multi-profil**
`Architecture-Reference.md` (§3.2 — `generate_invoice_number(p_user_id)` comme solution définitive) **vs** `AUDIT_RISQUES.md` (L2 — "séquence partagée entre deux entités juridiques distinctes")
→ Le bug légal le plus silencieux du corpus : invisible jusqu'au premier client bi-société, impossible à corriger rétroactivement sans renumérotation.

---

**Friction 5 — FAQ utilisateur vs réalité RGPD**
`Enterprise-Docs.md` (FAQ — "les appels Claude n'incluent jamais de données personnelles") **vs** `Enterprise-Docs.md` (DPIA — "Anthropic : ⚠️ DPA à vérifier")
→ Le même document contient deux affirmations contradictoires. La garantie donnée aux utilisateurs est contractuellement vide tant que le DPA Anthropic n'est pas signé.

---

**Friction 6 — Modèle IA épinglé vs versions contradictoires dans le corpus**
`Architecture-Reference.md` (Règle 5 — "`claude-sonnet-4-20250514`, jamais `latest`") **vs** `AI-ARCHITECTURE.md` (§7 — `model: 'claude-haiku-4-5-20251001'`)
→ Le corpus présente au moins deux épinglages contradictoires sans jamais préciser quelle version est effectivement déployée en production.

---

**Friction 7 — Projections MRR vs absence de coûts variables**
`Enterprise-Docs.md` (projections 22 800€ → 228 000€ MRR, modèle "factures illimitées") **vs** `AUDIT_RISQUES.md` (H2 — coût Billit potentiellement 36 000€/mois au scénario réaliste)
→ Les projections financières sont présentées comme MRR net sans déduction d'aucun coût variable. La viabilité économique du modèle n'a jamais été calculée dans aucun document.

---

### Verdict — Solidité du Système

Le corpus InvoiceAI est **architecturalement ambitieux et techniquement cohérent dans ses intentions**. La doctrine "L'IA propose, le moteur décide, l'humain valide" est correctement formulée, et les mécanismes pour la faire respecter sont conçus avec rigueur.

**La fragilité ne réside pas dans la qualité de la pensée — elle réside dans le fossé systématique entre les documents d'intention et les documents d'état réel.**

```
CORPUS A — Ce que le système DEVRAIT être
(AI-ARCHITECTURE, Architecture-Reference v1, Complement-Legal)
→ Cohérent, rigoureux, production-grade sur le papier

CORPUS B — Ce que le système EST réellement au 26 mars 2026
(Architecture-Reference-v2, AUDIT_RISQUES, Security-Audit)
→ Score sécurité 42/100, FIE non implémenté côté frontend,
   HITL absent, UBL émission inexistante
```

Un investisseur lisant uniquement le Corpus A croirait analyser un produit conforme et sécurisé. Un auditeur lisant les deux en parallèle identifie **7 frictions directes** où une promesse du Corpus A est contredite par un état factuel du Corpus B.

**Le risque systémique le plus élevé n'est pas technique — c'est l'absence d'un mécanisme de synchronisation entre les deux corpus.** La doctrine est excellente. Son implémentation est incomplète. Et aucun document ne définit formellement le seuil à partir duquel le Corpus B rejoindra le Corpus A pour que le produit soit ce qu'il prétend être.

---

*InvoiceAI · `docs/AUDIT_RISQUES.md` · Créé le 26 mars 2026*  
*Ce document est la référence unique pour le suivi de conformité et de sécurité.*  
*À mettre à jour à chaque résolution — conserver l'historique complet.*