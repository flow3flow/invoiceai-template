import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { t } = useLanguage();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setSubmitting(true);

    const { needsEmailConfirmation, error } = await signUp(
      email,
      password,
      name
    );

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Compte créé avec succès");
    navigate(needsEmailConfirmation ? "/check-email" : "/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 gradient-hero opacity-30 dark:opacity-60" />

      <Card className="relative w-full max-w-md glass border-border/50 shadow-glow">
        <CardHeader className="text-center pb-2">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
          </Link>

          <CardTitle className="font-display text-2xl">
            {t("signup.title")}
          </CardTitle>

          <p className="text-sm text-muted-foreground mt-1">
            {t("signup.subtitle")}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("signup.name")}</Label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("login.email")}</Label>
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("login.password")}</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <Button
              variant="hero"
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "..." : t("signup.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("signup.hasAccount")}{" "}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              {t("signup.signin")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;