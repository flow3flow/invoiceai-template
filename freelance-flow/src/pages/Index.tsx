import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/useCheckout";
import { usePlan } from "@/hooks/usePlan";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, FileText, Mail, Check, ArrowRight, Star, Crown, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

  const features = [
    { icon: Zap, title: t("features.instant.title"), description: t("features.instant.desc") },
    { icon: FileText, title: t("features.vat.title"), description: t("features.vat.desc") },
    { icon: Mail, title: t("features.email.title"), description: t("features.email.desc") },
  ];

  const plans = [
    {
      id: "free" as const,
      name: "Free", monthlyPrice: 0,
      features: ["3 factures/mois", "Export PDF", "1 profil client"],
      cta: "Commencer gratuitement", popular: false,
    },
    {
      id: "starter" as const,
      name: "Starter", monthlyPrice: 9,
      yearlyMonthly: 7, yearlyTotal: 86,
      features: ["20 factures/mois", "PDF + email", "Peppol/UBL inclus"],
      cta: "Choisir Starter", popular: false,
    },
    {
      id: "pro" as const,
      name: "Pro", monthlyPrice: 19,
      yearlyMonthly: 15, yearlyTotal: 182,
      features: ["Factures illimitées", "Tout Starter inclus", "Multi-entreprises (3 max)"],
      cta: "Choisir Pro", popular: true,
    },
    {
      id: "business" as const,
      name: "Business", monthlyPrice: 39,
      yearlyMonthly: 31, yearlyTotal: 374,
      features: ["Factures illimitées", "Tout Pro inclus", "Multi-entreprises illimité", "Support prioritaire"],
      cta: "Choisir Business", popular: false,
    },
  ];

  const testimonials = [
    { name: "Sophie Dupont", role: "Graphic Designer · Brussels", quote: t("testimonials.1.quote"), rating: 5 },
    { name: "Marc Lefèvre", role: "Web Developer · Lyon", quote: t("testimonials.2.quote"), rating: 5 },
    { name: "Elise Van der Berg", role: "Copywriter · Antwerp", quote: t("testimonials.3.quote"), rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 gradient-hero opacity-100 dark:opacity-100" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              {t("hero.badge")}
            </Badge>
          </motion.div>
          <motion.h1
            className="mx-auto max-w-4xl font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            {t("hero.title1")}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t("hero.title2")}
            </span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            {t("hero.subtitle")}
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <Button variant="hero" size="lg" className="text-base px-8 py-6" asChild>
              <Link to="/generator">
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6" asChild>
              <Link to="#pricing">{t("hero.pricing")}</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("features.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("features.subtitle")}</p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div key={feature.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                <Card className="glass h-full border-border/50 transition-all hover:shadow-glow hover:border-primary/30">
                  <CardContent className="p-8">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("pricing.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
          </motion.div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium transition-colors duration-300 ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              Mensuel
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isYearly ? "bg-primary" : "bg-input"}`}
              role="switch"
              aria-checked={isYearly}
            >
              <motion.span
                className="pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg"
                animate={{ x: isYearly ? 24 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-medium transition-colors duration-300 ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              Annuel
            </span>
            {isYearly && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
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
              const displayPrice = isYearly && plan.yearlyMonthly != null ? plan.yearlyMonthly : plan.monthlyPrice;
              return (
                <motion.div key={plan.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
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
                            const period = isYearly ? "yearly" : "monthly";
                            console.log(`Checkout: ${plan.id} (${period})`);
                            startCheckout(plan.id as "starter" | "pro" | "business");
                          }}
                        >
                          {loading === plan.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          {plan.cta}
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled={isCurrent}>
                          {plan.cta}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("testimonials.title")}</h2>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {testimonials.map((tst, i) => (
              <motion.div key={tst.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                <Card className="glass h-full border-border/50">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: tst.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground/90 mb-6 italic">"{tst.quote}"</p>
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

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div className="glass rounded-2xl p-12 md:p-20 text-center relative overflow-hidden" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="absolute inset-0 gradient-primary opacity-5" />
            <h2 className="font-display text-3xl font-bold md:text-5xl relative">{t("cta.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground relative max-w-xl mx-auto">{t("cta.subtitle")}</p>
            <Button variant="hero" size="lg" className="mt-8 text-base px-8 py-6 relative" asChild>
              <Link to="/generator">
                {t("cta.button")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
                <FileText className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              InvoiceAI
            </div>
            <p className="text-sm text-muted-foreground">{t("footer.text")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
