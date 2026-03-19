import { Check, Crown, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { useCheckout } from "@/hooks/useCheckout";
import { usePlan } from "@/hooks/usePlan";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: ["3 factures/mois", "Export PDF", "1 profil client"],
    buttonLabel: "Commencer gratuitement",
    highlight: false,
    badge: null,
  },
  {
    id: "starter",
    name: "Starter",
    price: 9,
    features: ["20 factures/mois", "PDF + email", "Peppol/UBL inclus"],
    buttonLabel: "Choisir Starter",
    highlight: false,
    badge: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    features: ["Factures illimitées", "Tout Starter inclus", "Multi-entreprises (3 max)"],
    buttonLabel: "Choisir Pro",
    highlight: true,
    badge: "Le plus populaire",
  },
  {
    id: "business",
    name: "Business",
    price: 39,
    features: ["Factures illimitées", "Tout Pro inclus", "Multi-entreprises illimité", "Support prioritaire"],
    buttonLabel: "Choisir Business",
    highlight: false,
    badge: null,
  },
];

export default function PricingPage() {
  const { startCheckout, loading } = useCheckout();
  const { plan: currentPlan } = usePlan();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center mb-14">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Des tarifs simples et transparents pour tous vos besoins de facturation.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isLoadingThis = loading === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col transition-shadow ${
                  plan.highlight
                    ? "border-primary shadow-glow ring-1 ring-primary/20 scale-[1.03]"
                    : "border-border"
                } ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground shadow-sm">
                      <Crown className="w-3 h-3 mr-1" />
                      {plan.badge}
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

                <CardHeader className="pb-2 pt-6">
                  <CardDescription className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    {plan.name}
                  </CardDescription>
                  <CardTitle className="text-4xl font-display font-bold text-foreground">
                    {plan.price}€
                    <span className="text-base font-normal text-muted-foreground">/mois</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 pt-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  {plan.id === "free" ? (
                    <Button variant="outline" className="w-full" disabled={isCurrent}>
                      {plan.buttonLabel}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.highlight ? "default" : "default"}
                      className="w-full"
                      disabled={isCurrent || !!loading}
                      onClick={() => startCheckout(plan.id as "starter" | "pro" | "business")}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        plan.buttonLabel
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}