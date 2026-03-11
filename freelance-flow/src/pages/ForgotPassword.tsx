import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Password reset requires backend integration.");
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
          <CardTitle className="font-display text-2xl">{t("forgot.title")}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t("forgot.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("login.email")}</Label>
              <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button variant="hero" type="submit" className="w-full">{t("forgot.submit")}</Button>
          </form>
          <div className="text-center mt-6">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> {t("forgot.back")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
