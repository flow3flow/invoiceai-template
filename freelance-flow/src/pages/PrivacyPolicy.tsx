// src/pages/PrivacyPolicy.tsx
// Politique de Confidentialité — InvoiceAI (Business Project Flow)
// Conforme RGPD · APD (Belgique) · CNIL (France) · Schrems II
// Version 2.1 — Mars 2026
//
// ✅ CHECKLIST PROD — cocher avant merge dans main :
// [ ] COMPANY_LEGAL_FORM rempli (SRL ? Indépendant ? EI ?)
// [ ] COMPANY_ADDRESS complète (rue, CP, ville, pays)
// [ ] COMPANY_VAT valide (BE0XXX.XXX.XXX)
// [ ] CONTACT_EMAIL routé (alias privacy@ → boîte réelle)
// [ ] Lien /cgu#art103 fonctionnel (CGU à créer)
// [ ] Vercel Analytics : vérifier activation réelle ou supprimer §9 note

import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Mail,
  Database,
  CreditCard,
  Globe,
  AlertCircle,
  UserCheck,
  Download,
  Lock,
  Bot,
  Users,
  Scale,
} from "lucide-react";

// ─── ⚠️  CONSTANTES À REMPLIR AVANT PROD ─────────────────────────────────────
const COMPANY_NAME       = "Business Project Flow";
const COMPANY_LEGAL_FORM = "— (SRL / indépendant — à préciser)";   // ← forme juridique
const COMPANY_ADDRESS    = "— (adresse complète — à remplir)";      // ← rue, CP, ville
const COMPANY_VAT        = "— (BE0XXX.XXX.XXX — à remplir)";       // ← n° BCE / TVA
const CONTACT_EMAIL      = "privacy@invoiceai.be";                  // ← email réel
const LAST_UPDATED       = "Mars 2026";
// ─────────────────────────────────────────────────────────────────────────────

// ─── Composants internes ──────────────────────────────────────────────────────

function PolicySection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <div className="pl-12 space-y-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-3 ${j === 0 ? "text-foreground font-medium" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Politique de Confidentialité
              </h1>
              <p className="mt-1 text-muted-foreground">{COMPANY_NAME} · InvoiceAI</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">RGPD UE 2016/679</Badge>
                <Badge variant="secondary">APD Belgique</Badge>
                <Badge variant="secondary">CNIL France</Badge>
                <Badge variant="secondary">Schrems II</Badge>
                <Badge variant="outline">v2.1 · {LAST_UPDATED}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Corps ─────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">

        {/* Préambule */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-sm text-foreground leading-relaxed space-y-3">
          <p>
            La présente politique décrit comment{" "}
            <strong>{COMPANY_NAME}</strong> {COMPANY_LEGAL_FORM} («&nbsp;nous&nbsp;»),
            éditeur de la plateforme <strong>InvoiceAI</strong>, traite vos données
            personnelles conformément au{" "}
            <strong>Règlement Général sur la Protection des Données (RGPD)</strong> —
            Règlement (UE) 2016/679 — à la loi belge du 30 juillet 2018 et à la loi
            française Informatique et Libertés modifiée.
          </p>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">
              Principe de minimisation (Art. 5.1.c RGPD) :
            </strong>{" "}
            Nous ne collectons que les données strictement nécessaires à la fourniture
            du service. Aucune donnée n'est collectée à titre spéculatif.
          </p>
        </div>

        <Separator />

        {/* ── §1 — Identité et double rôle RGPD ─────────────────────────────── */}
        <PolicySection icon={<UserCheck className="h-4 w-4" />} title="1. Identité et rôles RGPD">

          <div className="rounded-md border border-border p-4 space-y-1 text-xs">
            <p className="font-medium text-foreground">Responsable du traitement</p>
            <p>{COMPANY_NAME} {COMPANY_LEGAL_FORM}</p>
            <p>{COMPANY_ADDRESS}</p>
            <p>N° BCE / TVA : {COMPANY_VAT}</p>
            <p>
              Contact données personnelles :{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          {/* Double rôle — protection éditeur critique */}
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <p className="font-medium text-foreground text-xs">⚖️ Distinction des rôles (Art. 28 RGPD)</p>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded border border-border p-3">
                <p className="font-medium text-foreground mb-1">Responsable de traitement</p>
                <p>
                  Pour les données liées à <strong>votre compte</strong> (email,
                  profil, abonnement, authentification). Nous déterminons les
                  finalités et moyens de ce traitement.
                </p>
              </div>
              <div className="rounded border border-border p-3">
                <p className="font-medium text-foreground mb-1">Sous-traitant (Art. 28)</p>
                <p>
                  Pour les données que <strong>vous saisissez</strong> (clients,
                  factures, devis). Vous en êtes responsable ; nous les hébergeons
                  exclusivement sur vos instructions.
                </p>
              </div>
            </div>
            <p className="text-xs">
              Un accord de sous-traitance (DPA Art. 28) est disponible sur demande à{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </div>
        </PolicySection>

        <Separator />

        {/* ── §2 — Données collectées ────────────────────────────────────────── */}
        <PolicySection icon={<Database className="h-4 w-4" />} title="2. Données collectées">
          <div className="space-y-3">
            {[
              {
                title: "2.1 Données de compte",
                items: [
                  "Adresse e-mail (identifiant de connexion)",
                  "Nom, prénom, dénomination sociale",
                  "Numéro de TVA BE / FR (validé format réglementaire)",
                  "Adresse professionnelle",
                  "Téléphone (facultatif)",
                  "IBAN (mention légale sur factures — affiché uniquement, jamais débité par nous)",
                ],
              },
              {
                title: "2.2 Données de facturation et clients",
                items: [
                  "Données de vos clients (noms, adresses, numéros de TVA)",
                  "Contenu des factures, devis, bons de commande",
                  "Montants, taux TVA, lignes de facturation",
                  "Statuts de documents (brouillon, envoyé, payé, archivé)",
                ],
              },
              {
                title: "2.3 Données techniques",
                items: [
                  "Adresse IP (collectée par Supabase Auth et Vercel à la connexion)",
                  "User agent navigateur",
                  "Journaux d'audit (audit_logs) — actions sensibles horodatées",
                  "Métriques d'usage anonymisées (aucun profilage comportemental)",
                ],
              },
              {
                title: "2.4 Données de paiement",
                items: [
                  "Traitement exclusif par Stripe (PCI DSS Level 1)",
                  "Nous ne stockons aucune donnée de carte bancaire",
                  "Nous recevons : token Stripe, statut abonnement, plan actif",
                ],
              },
            ].map(({ title, items }) => (
              <div key={title} className="rounded-md border border-border p-4">
                <p className="font-medium text-foreground mb-2 text-xs">{title}</p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5 text-primary shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PolicySection>

        <Separator />

        {/* ── §3 — Finalités et bases légales ───────────────────────────────── */}
        <PolicySection icon={<Scale className="h-4 w-4" />} title="3. Finalités et bases légales (Art. 6 RGPD)">
          <DataTable
            headers={["Finalité", "Base légale", "Précision"]}
            rows={[
              ["Création et gestion du compte", "Exécution du contrat (6.1.b)", "—"],
              ["Émission et stockage des factures", "Obligation légale (6.1.c)", "AR n°1 art. 54 BE / CGI art. 289 FR — 7 ans"],
              ["Notifications email", "Exécution du contrat (6.1.b)", "—"],
              ["Paiement abonnement", "Exécution du contrat (6.1.b)", "Via Stripe uniquement"],
              ["Analytics d'usage", "Intérêt légitime (6.1.f)", "Données agrégées anonymes, non vendues — amélioration produit"],
              ["Archivage fiscal", "Obligation légale (6.1.c)", "7 ans après clôture exercice"],
              ["Sécurité / anti-fraude", "Intérêt légitime (6.1.f)", "Logs connexion 12 mois max"],
              ["Support client", "Exécution du contrat (6.1.b)", "—"],
              ["Assistance IA (brouillons)", "Exécution du contrat (6.1.b)", "Données PII masquées avant envoi au LLM — voir §5"],
            ]}
          />
        </PolicySection>

        <Separator />

        {/* ── §4 — Sous-traitants et Schrems II ────────────────────────────── */}
        <PolicySection icon={<Lock className="h-4 w-4" />} title="4. Sous-traitants et transferts hors UE (post-Schrems II)">

          <p>
            Chaque sous-traitant est lié par un DPA conforme à l'Art. 28 RGPD. Les
            transferts hors UE sont encadrés par des{" "}
            <strong className="text-foreground">
              Clauses Contractuelles Types (SCC — décision CE 2021/914)
            </strong>. Nous sélectionnons des partenaires s'engageant à s'opposer,
            dans la mesure du possible, aux demandes d'accès non conformes au droit
            européen.
          </p>

          {/* Schrems II / CLOUD Act — formulation prudente */}
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-xs space-y-2">
            <p className="font-medium text-foreground">⚠️ Risque résiduel — US CLOUD Act</p>
            <p>
              Certains sous-traitants sont des sociétés américaines susceptibles d'être
              soumises au <strong>US CLOUD Act</strong>. Les SCC réduisent ce risque
              sans pouvoir l'éliminer entièrement. Si ce risque résiduel est
              inacceptable pour votre activité (ex. : données clients sensibles),
              contactez-nous à{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              avant souscription.
            </p>
          </div>

          <DataTable
            headers={["Sous-traitant", "Rôle", "Localisation", "Garanties"]}
            rows={[
              [
                <a key="sb" href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Inc.</a>,
                "Base de données, authentification, stockage PDF",
                "États-Unis (région EU disponible)",
                "DPA + SCC",
              ],
              [
                <a key="rs" href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Resend Inc.</a>,
                "Emails transactionnels",
                "États-Unis",
                "DPA + SCC",
              ],
              [
                <a key="st" href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stripe Inc.</a>,
                "Paiements abonnement (PCI DSS Level 1)",
                "États-Unis",
                "DPA + SCC",
              ],
              [
                <a key="vc" href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vercel Inc.</a>,
                "Hébergement frontend (Edge Network global)",
                "États-Unis",
                "DPA + SCC",
              ],
              [
                <a key="an" href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anthropic, PBC</a>,
                "LLM — génération brouillons (données PII masquées avant envoi)",
                "États-Unis",
                "DPA API — pas d'entraînement sur vos données",
              ],
              [
                <span key="bl">
                  Billit{" "}
                  <span className="text-muted-foreground italic">(si activé)</span>
                </span>,
                "Transmission réseau Peppol/UBL",
                "Belgique (UE)",
                "DPA — traitement UE uniquement",
              ],
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Billit n'est sollicité que si vous activez l'envoi Peppol (fonctionnalité
            Sprint 3). Si inactif, aucune donnée ne lui est transmise.
          </p>
        </PolicySection>

        <Separator />

        {/* ── §5 — Traitement IA ─────────────────────────────────────────────── */}
        <PolicySection icon={<Bot className="h-4 w-4" />} title="5. Traitement par intelligence artificielle">

          {/* Sanitisation — formulation intentionnelle, pas absolue */}
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
            <p className="font-medium text-foreground">Architecture de protection PII</p>
            <p>
              Lorsque la fonctionnalité d'assistance IA est activée, les descriptions
              de prestations font l'objet de{" "}
              <strong>mesures visant à masquer les données identifiantes directes</strong>{" "}
              (Regex + NER : noms, e-mails, IBAN, numéros TVA) avant envoi au LLM.
              Ce traitement est encadré par les{" "}
              <strong>engagements contractuels de l'API Anthropic</strong>, garantissant
              l'absence d'utilisation de vos données pour l'entraînement des modèles.
            </p>
          </div>

          <div className="space-y-3">

            <div className="rounded-md border border-border p-4 text-xs space-y-1">
              <p className="font-medium text-foreground">5.1 Base légale</p>
              <p>
                Exécution du contrat (Art. 6.1.b RGPD). Fonctionnalité optionnelle —
                la saisie manuelle reste toujours disponible.
              </p>
            </div>

            {/* Art. 22 — formulation "conçue pour", pas "garantit" */}
            <div className="rounded-md border border-border p-4 text-xs space-y-1">
              <p className="font-medium text-foreground">
                5.2 Pas de décision exclusivement automatisée (Art. 22 RGPD)
              </p>
              <p>
                L'application est <strong>conçue pour exiger une validation humaine
                explicite (HITL — Human In The Loop)</strong> avant toute émission de
                document ou action légale. Aucune décision produisant des effets
                juridiques n'est prise de manière exclusivement automatisée.
              </p>
            </div>

            <div className="rounded-md border border-border p-4 text-xs space-y-1">
              <p className="font-medium text-foreground">5.3 Moteur de conformité déterministe</p>
              <p>
                Les montants financiers ne sont <strong>jamais calculés par l'IA</strong>.
                Un <strong>Financial Integrity Engine</strong> déterministe (Decimal.js)
                recalcule tous les totaux et applique une whitelist TVA stricte
                (BE : 0 %, 6 %, 12 %, 21 % · FR : 0 %, 5,5 %, 10 %, 20 %).
              </p>
            </div>

            {/* Limitation de responsabilité IA — wording juridique solide */}
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-xs space-y-2">
              <p className="font-medium text-foreground">⚠️ 5.4 Limitation de responsabilité — assistance IA</p>
              <p>
                L'assistance IA est de nature probabiliste et ne constitue pas un
                conseil fiscal ou juridique.{" "}
                <strong>
                  L'utilisateur reste seul responsable de la vérification finale de
                  l'exactitude fiscale et juridique de ses factures
                </strong>{" "}
                (mentions légales, montants, statut TVA). InvoiceAI décline toute
                responsabilité en cas de redressement fiscal ou sanction liée au
                contenu validé par l'utilisateur. Consultez le{" "}
                <strong>SPF Finances (BE)</strong> ou la <strong>DGFiP (FR)</strong>.
                Voir{" "}
                <a href="/cgu#art103" className="text-primary hover:underline">
                  CGU Art. 10.3
                </a>.
              </p>
            </div>

            {/* Logs — suppression "étudiée au cas par cas" */}
            <div className="rounded-md border border-border p-4 text-xs space-y-1">
              <p className="font-medium text-foreground">5.5 Conservation des logs IA</p>
              <p>
                Journalisés dans <code>llm_invoice_logs</code> (prompt pseudonymisé,
                réponse, correction utilisateur, latence). Anonymisation automatique
                à 90 jours, suppression à 2 ans. Une demande de suppression anticipée
                peut être{" "}
                <strong>étudiée au cas par cas</strong>, sous réserve de nos
                obligations de sécurité et d'audit légal.
              </p>
            </div>

            <div className="rounded-md border border-border p-4 text-xs space-y-1">
              <p className="font-medium text-foreground">5.6 Opt-out</p>
              <p>
                Vous pouvez désactiver la génération assistée par IA à tout moment
                depuis les paramètres du compte. La saisie manuelle reste disponible
                en permanence.
              </p>
            </div>
          </div>
        </PolicySection>

        <Separator />

        {/* ── §6 — Responsabilités utilisateur ─────────────────────────────── */}
        <PolicySection icon={<Users className="h-4 w-4" />} title="6. Vos responsabilités sur les données de vos clients">
          <p>
            En tant que responsable de traitement pour les données de vos propres
            clients, vous êtes tenus de :
          </p>
          <ul className="space-y-2">
            {[
              "Informer vos clients que leurs données sont traitées dans InvoiceAI (Art. 13/14 RGPD), par exemple dans votre propre politique de confidentialité.",
              "Disposer d'une base légale pour ce traitement (généralement : exécution du contrat de facturation).",
              "Ne saisir que les données strictement nécessaires à l'émission des factures (principe de minimisation).",
              "Répondre aux demandes d'exercice de droits de vos clients concernant leurs propres données.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 text-primary shrink-0">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </PolicySection>

        <Separator />

        {/* ── §7 — Durées de conservation ───────────────────────────────────── */}
        <PolicySection icon={<AlertCircle className="h-4 w-4" />} title="7. Durées de conservation">
          <DataTable
            headers={["Catégorie", "Durée", "Fondement"]}
            rows={[
              ["Compte actif", "Durée abonnement + 30 jours de grâce", "Contrat"],
              ["Factures et données fiscales", "7 ans après clôture de l'exercice", "Obligation légale BE/FR"],
              ["Logs connexion / audit_logs", "12 mois glissants", "Intérêt légitime (sécurité)"],
              ["Support client", "3 ans après dernière interaction", "Intérêt légitime"],
              ["Logs LLM bruts", "90 jours → anonymisation automatique", "Intérêt légitime"],
              ["Logs LLM anonymisés", "2 ans → suppression automatique", "Intérêt légitime"],
              ["Post-suppression de compte", "30 jours récupération possible → purge", "RGPD Art. 17"],
              ["Données fiscales post-clôture", "7 ans — non supprimables (Art. 17.3.b)", "Obligation légale impérative"],
            ]}
          />
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
            <strong className="text-foreground">Immuabilité fiscale :</strong>{" "}
            Selon nos règles techniques, les factures émises sont rendues immuables
            afin de garantir l'intégrité fiscale exigée par la loi belge et française
            (AR n°1 art. 54 BE / CGI art. 289 FR). Toute correction passe par une
            note de crédit. Cette obligation légale prévaut sur le droit à
            l'effacement (Art. 17.3.b RGPD).
          </div>
        </PolicySection>

        <Separator />

        {/* ── §8 — Sécurité ─────────────────────────────────────────────────── */}
        <PolicySection icon={<Shield className="h-4 w-4" />} title="8. Sécurité et continuité">
          <ul className="space-y-1">
            {[
              "Chiffrement en transit : HTTPS/TLS 1.3 sur toutes les communications",
              "Chiffrement au repos : PostgreSQL AES-256 (Supabase)",
              "Isolation multi-tenant : Row Level Security (RLS) — accès cross-tenant bloqué au niveau base de données",
              "Authentification : JWT courte durée + refresh token (Supabase Auth / bcrypt)",
              "Immuabilité fiscale : trigger PostgreSQL bloquant les modifications de factures envoyées",
              "Journalisation : audit_logs horodatés de toutes les actions sensibles",
              "Stockage PDF : buckets Supabase privés, URLs signées expirantes",
              "Sauvegardes : backups quotidiens automatisés Supabase (rétention 7 jours sur plan Pro)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 text-green-500 shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs">
            En cas de violation de données susceptible d'engendrer un risque, nous
            notifierons l'autorité compétente (APD/CNIL) dans les{" "}
            <strong className="text-foreground">72 heures</strong> (Art. 33 RGPD)
            et vous en informerons sans délai si le risque est élevé (Art. 34 RGPD).
          </p>
        </PolicySection>

        <Separator />

        {/* ── §9 — Cookies ──────────────────────────────────────────────────── */}
        <PolicySection icon={<Globe className="h-4 w-4" />} title="9. Cookies et technologies similaires">
          <p>
            InvoiceAI utilise uniquement des{" "}
            <strong className="text-foreground">cookies strictement fonctionnels</strong>,
            exemptés de consentement préalable (Directive ePrivacy Art. 5.3 — doctrine
            CNIL). Aucun cookie publicitaire, analytique tiers ou de profilage
            comportemental.
          </p>
          <DataTable
            headers={["Cookie", "Finalité", "Durée", "Émetteur"]}
            rows={[
              ["sb-access-token", "Session d'authentification (JWT)", "1 heure", "Supabase"],
              ["sb-refresh-token", "Renouvellement automatique de session", "7 jours", "Supabase"],
            ]}
          />
          {/* Note Vercel — conditionnelle : à supprimer si Vercel Analytics non activé */}
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">
              Vercel Analytics (si activé uniquement) :
            </strong>{" "}
            collecte de métriques de performance anonymisées, sans cookie de suivi et
            sans données permettant l'identification personnelle.
          </p>
        </PolicySection>

        <Separator />

        {/* ── §10 — Droits RGPD ─────────────────────────────────────────────── */}
        <PolicySection icon={<UserCheck className="h-4 w-4" />} title="10. Vos droits (Art. 15 à 22 RGPD)">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { right: "Accès (Art. 15)", desc: "Obtenir une copie de vos données traitées" },
              { right: "Rectification (Art. 16)", desc: "Corriger des données inexactes dans votre profil" },
              {
                right: "Effacement (Art. 17)",
                desc: "Supprimer votre compte et données, sous réserve des obligations légales de conservation (7 ans pour les factures)",
              },
              {
                right: "Portabilité (Art. 20)",
                desc: "Exporter vos factures au format JSON/CSV depuis votre dashboard",
              },
              {
                right: "Opposition (Art. 21)",
                desc: "Vous opposer aux traitements fondés sur l'intérêt légitime (ex. : analytics)",
              },
              { right: "Limitation (Art. 18)", desc: "Restreindre temporairement un traitement contesté" },
              {
                right: "Décision automatisée (Art. 22)",
                desc: "Garanti par architecture HITL — validation humaine obligatoire avant toute action légale",
              },
              {
                right: "Retrait du consentement",
                desc: "Applicable uniquement aux traitements reposant sur cette base légale (ex. : communications marketing optionnelles)",
              },
            ].map(({ right, desc }) => (
              <div key={right} className="rounded-md border border-border p-3">
                <p className="font-medium text-foreground text-xs">{right}</p>
                <p className="text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-xs space-y-2">
            <p className="font-medium text-foreground">Exercer vos droits</p>
            <p>
              Envoyez votre demande à :{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary font-medium hover:underline"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              — Délai de réponse :{" "}
              <strong className="text-foreground">30 jours</strong> (prorogeable à
              3 mois pour demandes complexes, avec notification préalable).
            </p>
            <p>
              En cas de réponse insatisfaisante, vous pouvez introduire une réclamation
              auprès de l'
              <a
                href="https://www.dataprotectionauthority.be"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                APD (Belgique)
              </a>{" "}
              ou de la{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                CNIL (France)
              </a>.
            </p>
          </div>
        </PolicySection>

        <Separator />

        {/* ── §11 — Stripe ──────────────────────────────────────────────────── */}
        <PolicySection icon={<CreditCard className="h-4 w-4" />} title="11. Paiements — Stripe">
          <p>
            Paiements d'abonnement traités par{" "}
            <strong className="text-foreground">Stripe Inc.</strong> (PCI DSS Level 1).
            Nous ne stockons aucune donnée de carte bancaire. Stripe peut collecter des
            données à des fins de lutte contre la fraude (empreinte d'appareil). Voir la{" "}
            <a
              href="https://stripe.com/fr/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              politique de confidentialité Stripe
            </a>.
          </p>
        </PolicySection>

        <Separator />

        {/* ── §12 — Resend ──────────────────────────────────────────────────── */}
        <PolicySection icon={<Mail className="h-4 w-4" />} title="12. Communications email — Resend">
          <p>
            Emails transactionnels acheminés via{" "}
            <strong className="text-foreground">Resend Inc.</strong> — votre adresse
            n'est transmise qu'à des fins de routage technique, non à des fins
            marketing. Désabonnement des communications non essentielles via{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>. Les emails liés à la sécurité et à la conformité fiscale restent
            obligatoires tant que votre compte est actif.
          </p>
        </PolicySection>

        <Separator />

        {/* ── §13 — Mineurs ─────────────────────────────────────────────────── */}
        <PolicySection icon={<AlertCircle className="h-4 w-4" />} title="13. Mineurs">
          <p>
            Service réservé aux professionnels (≥ 18 ans). Nous ne collectons pas
            sciemment de données concernant des mineurs. Signalez tout cas à{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>.
          </p>
        </PolicySection>

        <Separator />

        {/* ── §14 — Modifications ───────────────────────────────────────────── */}
        <PolicySection icon={<Download className="h-4 w-4" />} title="14. Modifications de la politique">
          <p>
            La version en vigueur est toujours disponible à{" "}
            <strong className="text-foreground">invoiceai.be/privacy</strong>. En cas
            de modification substantielle des traitements, vous en serez informé par{" "}
            <strong className="text-foreground">email ou notification dans l'application</strong>{" "}
            au moins 30 jours avant l'entrée en vigueur.
          </p>
        </PolicySection>

        <Separator />

        {/* ── Bloc contact final ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-muted/30 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Contact — Protection des données personnelles
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pour toute question relative à vos données ou pour exercer vos droits RGPD :
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {CONTACT_EMAIL}
              </a>
              <p className="mt-3 text-xs text-muted-foreground">
                <strong className="text-foreground">{COMPANY_NAME}</strong>{" "}
                {COMPANY_LEGAL_FORM} · {COMPANY_ADDRESS} · N° BCE : {COMPANY_VAT}
                <br />
                Document régi par le RGPD (UE 2016/679), la loi belge du 30 juillet
                2018 et la loi française Informatique et Libertés.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}