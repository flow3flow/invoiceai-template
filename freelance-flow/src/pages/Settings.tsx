import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Building2, FileText, Mail, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import BusinessProfilesSection from "@/components/settings/BusinessProfilesSection";

const Settings = () => {
  const { t } = useLanguage();

  const handleSave = () => {
    toast.success("✓");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-3xl font-bold mb-2">
            {t("settings.title")}
          </h1>
          <p className="text-muted-foreground mb-8">{t("settings.subtitle")}</p>

          <BusinessProfilesSection />

          <Card className="glass border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                {t("settings.companyProfile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("settings.companyName")}</Label>
                  <Input placeholder="Your Company" />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.vatNumber")}</Label>
                  <Input placeholder="BE0123456789" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.address")}</Label>
                <Input placeholder="Street, City, Country" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("settings.iban")}</Label>
                  <Input placeholder="BE68 5390 0754 7034" />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.logo")}</Label>
                  <Input type="file" accept="image/*" className="cursor-pointer" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <FileText className="h-5 w-5 text-primary" />
                {t("settings.invoiceDefaults")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("settings.defaultVat")}</Label>
                  <Select defaultValue="21">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                      <SelectItem value="21">21%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.paymentTerms")}</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 {t("settings.days")}</SelectItem>
                      <SelectItem value="30">30 {t("settings.days")}</SelectItem>
                      <SelectItem value="60">60 {t("settings.days")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.invoicePrefix")}</Label>
                  <Input placeholder="INV-2026-" defaultValue="INV-2026-" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Mail className="h-5 w-5 text-primary" />
                {t("settings.emailSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("settings.replyTo")}</Label>
                <Input type="email" placeholder="billing@company.com" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                {t("settings.planBilling")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t("settings.starterPlan")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.starterDesc")}
                  </p>
                </div>
                <Button variant="hero-outline">{t("settings.upgrade")}</Button>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />
          <div className="flex justify-end">
            <Button variant="hero" onClick={handleSave}>
              {t("settings.save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;