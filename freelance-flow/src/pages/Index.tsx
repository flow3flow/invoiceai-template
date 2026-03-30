import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/useCheckout";
import { usePlan } from "@/hooks/usePlan";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Check,
  ArrowRight,
  Crown,
  Loader2,
  Shield,
  ScrollText,
  Star,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HeroTerminal } from "@/components/landing/HeroTerminal";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const { t } = useLanguage();
  const { startCheckout, loading } = useCheckout();
  const { plan: currentPlan } = usePlan();
  const [isYearly, setIsYearly] = useState(false);

  // --- DÉBUT SECTION features ---
  const features = [
    {
      icon: Shield,
      title: "Moteur fiscal déterministe",
      description:
        "TVA BE/FR, scénarios domestic / intra-EU / autoliquidation. Whitelist stricte. Jamais l'IA pour décider un taux. Calculs en decimal.js — zéro float natif.",
      tag: "VAT SCENARIO ENGINE",
    },
    {
      icon: FileText,
      title: "Émission Peppol native",
      description:
        "Vérification BCE + Peppol directory en temps réel. Export UBL 2.1 BIS Billing 3.0. Compatible Billit, Doccle, tous les access points belges.",
      tag: "UBL 2.1 · BILLIT",
    },
    {
      icon: ScrollText,
      title: "Audit trail légal 7 ans",
      description:
        "Chaque action loggée avec user_id, timestamp, PII redacté. Numérotation séquentielle sans trou. Défendable en cas de contrôle fiscal.",
      tag: "AUDIT LOGS · RGPD",
    },
  ];
  // --- FIN SECTION features ---

  // --- DÉBUT SECTION plans ---
  const plans = [
    {
      id: "free" as const,
      name: "Free",
      monthlyPrice: 0,
      features: [
        "3 factures / mois",
        "Export PDF + UBL Peppol",
        "Vérification BCE + Peppol",
        "1 profil entreprise",
      ],
      cta: "Commencer gratuitement",
      popular: false,
    },
    {
      id: "starter" as const,
      name: "Starter",
      monthlyPrice: 9,
      yearlyMonthly: 7,
      yearlyTotal: 86,
      features: [
        "Factures illimitées",
        "Dashboard encours & DSO",
        "Relances manuelles J+7 / J+15",
        "Email automatique à l'émission",
        "BCE auto-check à chaque facture",
      ],
      cta: "Choisir Starter",
      popular: false,
    },
    {
      id: "pro" as const,
      name: "Pro",
      monthlyPrice: 19,
      yearlyMonthly: 15,
      yearlyTotal: 182,
      features: [
        "Tout Starter inclus",
        "Relances IA automatiques",
        "Multi-entreprises (3 max)",
        "Audit trail complet",
        "Support prioritaire",
      ],
      cta: "Choisir Pro",
      popular: true,
    },
    {
      id: "business" as const,
      name: "Business",
      monthlyPrice: 39,
      yearlyMonthly: 31,
      yearlyTotal: 374,
      features: [
        "Tout Pro inclus",
        "Multi-entreprises illimité",
        "Support prioritaire dédié",
      ],
      cta: "Choisir Business",
      popular: false,
    },
  ];
  // --- FIN SECTION plans ---

  // --- DÉBUT SECTION testimonials ---
  const testimonials = [
    {
      name: "Sophie Dupont",
      role: "Graphic Designer · Brussels",
      quote:
        "Mes clients belges acceptent enfin mes factures sans retour. Le Peppol fonctionne dès la première émission.",
      rating: 5,
    },
    {
      name: "Marc Lefèvre",
      role: "Web Developer · Lyon",
      quote:
        "Le DSO est passé de 47 à 29 jours. Les relances automatiques ont récupéré 2 800€ d'impayés sur 3 mois.",
      rating: 5,
    },
    {
      name: "Elise Van der Berg",
      role: "Copywriter · Antwerp",
      quote:
        "J'avais peur des contrôles TVA côté français. Maintenant chaque facture a son scénario fiscal validé.",
      rating: 5,
    },
  ];
  // --- FIN SECTION testimonials ---

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className={[
          // FIX 1 — overflow-x-hidden uniquement : évite le scroll horizontal
          // sans clipper le texte verticalement (cause du H1 coupé)
          "relative overflow-x-hidden",
          // FIX 5 — padding réduit en mobile : pt-20 au lieu de pt-24
          "pt-20 pb-14 md:pt-32 md:pb-20",
          // FIX 2 — fond light/dark séparés proprement
          // light : fond blanc standard · dark : bleu nuit #0e1628
          "bg-white dark:bg-[#0e1628]",
        ].join(" ")}
      >
        {/* Taches de lumière — uniquement en dark mode via opacity */}
        <div
          className="pointer-events-none absolute top-0 right-0 opacity-0 dark:opacity-100 transition-opacity"
          style={{
            width: "500px",
            height: "400px",
            background: "radial-gradient(ellipse at top right, rgba(99,102,241,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 opacity-0 dark:opacity-100 transition-opacity"
          style={{
            width: "350px",
            height: "300px",
            background: "radial-gradient(ellipse at bottom left, rgba(74,158,255,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="container relative mx-auto px-4">
          <div className="flex flex-col items-center text-center md:grid md:grid-cols-[55fr_45fr] md:items-center md:gap-12 md:text-left">

            {/* ── Colonne gauche : contenu textuel ── */}
            <div className="w-full min-w-0">

              {/* FIX 4 — Badge : version courte mobile / version complète desktop */}
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <Badge
                  variant="secondary"
                  className="mb-5 px-3 py-1.5 text-xs border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono tracking-wide"
                >
                  {/* Version mobile — court */}
                  <span className="sm:hidden">⚡ Peppol obligatoire · BE · 2026</span>
                  {/* Version desktop — complet */}
                  <span className="hidden sm:inline">⚡ Peppol B2B obligatoire · Belgique · Jan 2026</span>
                </Badge>
              </motion.div>

              {/*
                FIX 1 — H1 mobile :
                - text-[1.75rem] (28px) sur xs : évite tout débordement sur 320px
                - progression fluide : xs→sm→md→lg→xl
                - leading-tight au lieu de leading-[1.05] : plus stable cross-browser
                - pas de max-w sur mobile (laisse le texte wrapper librement)
                - word-break: break-words en dernier recours via Tailwind
              */}
              <motion.h1
                className={[
                  "w-full break-words",
                  "text-[1.75rem] leading-tight",
                  "sm:text-4xl",
                  "md:text-5xl md:mx-0",
                  "lg:text-6xl",
                  "xl:text-7xl",
                  "font-display font-extrabold tracking-tight",
                  // FIX 2 — couleur titre : sombre en light, clair en dark
                  "text-gray-900 dark:text-gray-50",
                ].join(" ")}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={1}
              >
                Facturez en conformité.{" "}
                {/* FIX 2 — span blue adapté light/dark */}
                <span className="text-blue-600 dark:text-[#4a9eff]">
                  Sans vous tromper.
                </span>
              </motion.h1>

              {/*
                FIX 2 — Subheadline : couleurs via Tailwind dark: au lieu d'inline rgba
                Lisible en light ET dark
              */}
              <motion.p
                className="mx-auto mt-4 max-w-xl text-base leading-relaxed md:mx-0 md:text-lg lg:text-xl text-gray-600 dark:text-gray-300"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={2}
              >
                Chaque facture est vérifiée avant d&apos;exister.
                <br />
                <span className="text-sm md:text-base text-gray-400 dark:text-gray-500">
                  TVA validée · UBL généré · Peppol-ready.
                </span>
              </motion.p>

              {/*
                FIX 3 — CTA mobile :
                - w-full sur mobile → prend toute la largeur sans déborder
                - text-sm sur mobile, text-base sur sm+
                - py-3 sur mobile (moins haut), py-4 sur sm+
                - label raccourci sur mobile via sm:hidden / hidden sm:inline
              */}
              <motion.div
                className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={3}
              >
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full text-sm py-3 px-5 sm:w-auto sm:text-base sm:py-4 sm:px-8"
                  asChild
                >
                  <Link to="/generator">
                    {/* Raccourci mobile */}
                    <span className="sm:hidden">Créer ma facture conforme</span>
                    {/* Complet desktop */}
                    <span className="hidden sm:inline">Générer ma première facture conforme</span>
                    <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button
                  variant="hero-outline"
                  size="lg"
                  className="w-full text-sm py-3 px-5 sm:w-auto sm:text-base sm:py-4 sm:px-8"
                  asChild
                >
                  <Link to="#pricing">Voir les tarifs</Link>
                </Button>
              </motion.div>

              {/* Micro-preuves desktop — uniquement md+ */}
              <motion.div
                className="mt-5 hidden flex-col gap-1.5 md:flex text-gray-400 dark:text-gray-500"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={4}
              >
                {[
                  "✓  TVA BE/FR — scénarios domestic, intra-EU, autoliquidation",
                  "✓  UBL 2.1 · BIS Billing 3.0 · Compatible Billit & réseau Peppol",
                  "✓  Numérotation séquentielle sans trou · Audit trail 7 ans",
                ].map((proof) => (
                  <span key={proof} className="font-mono text-xs">{proof}</span>
                ))}
              </motion.div>
            </div>

            {/* ── Colonne droite : terminal desktop uniquement ── */}
            <motion.div
              className="hidden md:block"
              style={{ transform: "translateY(-12px)" }}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
            >
              <HeroTerminal />
            </motion.div>
          </div>

          {/*
            FIX 6 — Terminal mobile : remonté juste après les CTA
            mt-8 au lieu de mt-10 pour serrer l'espace
          */}
          <motion.div
            className="mt-8 md:hidden"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={5}
          >
            <HeroTerminal />
          </motion.div>

          {/* Micro-preuves mobile — après le terminal, FIX 2 couleurs dark: */}
          <motion.div
            className="mt-5 flex flex-col items-center gap-1.5 text-xs md:hidden text-gray-400 dark:text-gray-600"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={6}
          >
            {[
              "✓  TVA BE/FR · domestic, intra-EU, autoliquidation",
              "✓  UBL 2.1 · BIS 3.0 · Peppol-ready",
              "✓  Audit trail · Conservation 7 ans",
            ].map((proof) => (
              <span key={proof} className="font-mono">{proof}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── BANNIÈRE PEPPOL ──────────────────────────────────────────────── */}
      <div className="border-y border-amber-500/20 bg-amber-500/5 py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-amber-700 dark:text-amber-400">
            <span className="font-semibold">Belgique · Depuis janvier 2026 — </span>
            La facturation électronique UBL via Peppol est obligatoire pour toutes les transactions B2B.{" "}
            <Link
              to="/demo"
              className="underline underline-offset-2 font-semibold hover:text-amber-300 transition-colors"
            >
              Vérifier ma conformité →
            </Link>
          </p>
        </div>
      </div>

      {/* ─── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-3xl font-bold md:text-5xl">
              Ce que le moteur vérifie avant chaque émission.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Pas des promesses. Des vérifications automatiques.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="glass h-full border-border/50 transition-all hover:shadow-glow hover:border-primary/30">
                  <CardContent className="p-8">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/60 dark:bg-zinc-800/80">
                      <feature.icon className="h-6 w-6 text-amber-400" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                    {feature.tag && (
                      <span className="mt-4 inline-block font-mono text-[10px] tracking-widest text-blue-400 border border-blue-400/20 bg-blue-400/5 px-2 py-1">
                        {feature.tag}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-3xl font-bold md:text-5xl">
              Simple. Conforme. Sans surprise.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Commencez gratuitement. Évoluez sans friction.
            </p>
          </motion.div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span
              className={`text-sm font-medium transition-colors duration-300 ${
                !isYearly ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Mensuel
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isYearly ? "bg-primary" : "bg-input"
              }`}
              role="switch"
              aria-checked={isYearly}
            >
              <motion.span
                className="pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg"
                animate={{ x: isYearly ? 24 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors duration-300 ${
                isYearly ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Annuel
            </span>
            {isYearly && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                  2 mois offerts
                </Badge>
              </motion.div>
            )}
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {plans.map((plan, i) => {
              const isCurrent = currentPlan === plan.id;
              const isPaid = plan.id !== "free";
              const displayPrice =
                isYearly && plan.yearlyMonthly != null
                  ? plan.yearlyMonthly
                  : plan.monthlyPrice;
              return (
                <motion.div
                  key={plan.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i + 1}
                >
                  <Card
                    className={`h-full relative transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 ${
                      plan.popular
                        ? "border-primary shadow-glow scale-105 bg-gradient-to-b from-primary/5 to-transparent"
                        : "glass border-border/50"
                    } ${isCurrent ? "ring-2 ring-primary" : ""}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="gradient-primary text-primary-foreground border-0 px-4">
                          <Crown className="w-3 h-3 mr-1" />
                          Le plus populaire
                        </Badge>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="gap-1">
                          <Check className="w-3 h-3" />
                          Actuel
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-8">
                      <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                      <div className="mt-6 mb-2">
                        <motion.span
                          key={`${plan.id}-${isYearly}`}
                          className="font-display text-5xl font-bold"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {displayPrice}€
                        </motion.span>
                        <span className="text-muted-foreground ml-1">/mois</span>
                      </div>
                      {isYearly && plan.yearlyTotal != null && (
                        <motion.p
                          className="text-xs text-muted-foreground mb-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          Facturé {plan.yearlyTotal}€/an
                        </motion.p>
                      )}
                      {(!isYearly || plan.yearlyTotal == null) && <div className="mb-4" />}
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {isPaid ? (
                        <Button
                          variant={plan.popular ? "hero" : "default"}
                          className="w-full"
                          disabled={isCurrent || loading === plan.id}
                          onClick={() => {
                            startCheckout(plan.id as "starter" | "pro" | "business");
                          }}
                        >
                          {loading === plan.id && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          {plan.cta}
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled={isCurrent} asChild>
                          <Link to="/register">{plan.cta}</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Note légale sous le pricing */}
          <motion.p
            className="mt-8 text-center text-xs text-muted-foreground font-mono"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={5}
          >
            ✓ La conformité Peppol est incluse dans tous les plans, y compris Free.
            Ce n&apos;est pas un avantage payant — c&apos;est votre obligation légale.
          </motion.p>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-3xl font-bold md:text-5xl">
              {t("testimonials.title")}
            </h2>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {testimonials.map((tst, i) => (
              <motion.div
                key={tst.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="glass h-full border-border/50">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: tst.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-foreground/90 mb-6 italic">&ldquo;{tst.quote}&rdquo;</p>
                    <div>
                      <p className="font-semibold text-sm">{tst.name}</p>
                      <p className="text-xs text-muted-foreground">{tst.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PREUVE TECHNIQUE — argument de clôture avant décision ──────── */}
      <section className="py-16 border-t border-border/40">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            className="text-center font-display text-2xl font-bold mb-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            Les vérifications qui protègent chaque facture.
          </motion.h2>
          <div className="grid grid-cols-1 gap-0">
            {[
              "Numéro TVA vérifié en temps réel — BCE (kbodata.be) + fallback VIES EU",
              "Peppol ID vérifié — directory.peppol.eu (endpoint routable ou non)",
              "Scénario fiscal déterminé — domestic / intra-EU / reverse charge / export",
              "Taux TVA validé contre whitelist stricte — jamais confié à l'IA",
              "Calculs en decimal.js — zéro float natif · arrondi ROUND_HALF_UP",
              "Numérotation séquentielle verrouillée — RPC PostgreSQL · pg_advisory_xact_lock",
              "Snapshot émetteur + client figé à l'émission — immuable par définition",
              "UBL 2.1 généré et validé — BIS Billing 3.0 · compatible Billit",
              "Audit log horodaté — chaque action tracée · conservation 7 ans",
            ].map((check, i) => (
              <motion.div
                key={check}
                className="flex items-start gap-3 py-3 border-b border-border/30 font-mono text-sm"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <span className="text-amber-400 shrink-0">✓</span>
                <span className="text-muted-foreground">{check}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ────────────────────────────────────────────────────── */}
      {/*
        P0.6 — CTA final corrigé : fermer sur la solution, pas sur l'anxiété
        Remplace "soit conforme, soit un risque"
      */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="glass rounded-2xl p-12 md:p-20 text-center relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <div className="absolute inset-0 gradient-primary opacity-5" />
            <h2 className="font-display text-3xl font-bold md:text-5xl relative">
              Conformité fiscale. Dès la première facture.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground relative max-w-xl mx-auto">
              InvoiceAI vérifie, calcule, génère et archive.
              <br />
              Vous validez. C&apos;est tout.
            </p>
            <Button
              variant="hero"
              size="lg"
              className="mt-8 text-base px-8 py-6 relative"
              asChild
            >
              <Link to="/generator">
                Générer ma première facture conforme
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground font-mono">
              Gratuit · Pas de carte bancaire · Export Peppol inclus
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
              </div>
              InvoiceAI
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Politique de confidentialité
              </Link>
              <Link to="/legal" className="hover:text-foreground transition-colors">
                Mentions légales
              </Link>
              <Link to="/demo" className="hover:text-foreground transition-colors">
                Démo
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">{t("footer.text")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;