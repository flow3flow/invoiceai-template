import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const { t } = useLanguage();

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setSubmitting(true);

    const { error } = await signIn(email, password);

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Connexion réussie");
    navigate(from, { replace: true });
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
            {t("login.title")}
          </CardTitle>

          <p className="text-sm text-muted-foreground mt-1">
            {t("login.subtitle")}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex justify-between">
                <Label>{t("login.password")}</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  {t("login.forgot")}
                </Link>
              </div>

              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Button
              variant="hero"
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "..." : t("login.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("login.noAccount")}{" "}
            <Link
              to="/signup"
              className="text-primary hover:underline font-medium"
            >
              {t("login.signup")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;