// src/components/Navbar.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  Sparkles,
  Menu,
  LogOut,
  LogIn,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const languages: { code: Language; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "nl", flag: "🇧🇪", label: "NL" },
  { code: "de", flag: "🇩🇪", label: "DE" },
];

export function Navbar() {
  const { user, signOut } = useAuth();
  const isLoggedIn = !!user;
  const { lang, setLang, t } = useLanguage();
  const currentLang = languages.find((l) => l.code === lang)!;
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          InvoiceAI
        </Link>

        {/* ── Desktop nav ── */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn && (
            <div className="flex items-center gap-1 mr-4 border-r pr-4">
              <Button variant="ghost" asChild size="sm">
                <Link to="/dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  {t("nav.dashboard")}
                </Link>
              </Button>
              <Button variant="ghost" asChild size="sm">
                <Link to="/clients" className="gap-2">
                  <Users className="h-4 w-4" />
                  Clients
                </Link>
              </Button>
              <Button variant="ghost" asChild size="sm">
                <Link to="/settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Link>
              </Button>
            </div>
          )}

          {/* Démo — visible pour tous */}
          <Button
            variant="outline"
            asChild
            size="sm"
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Link to="/demo">
              <Sparkles className="h-3.5 w-3.5" />
              Voir la démo
            </Link>
          </Button>

          {/* Langue */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                {currentLang.flag} {currentLang.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={lang === l.code ? "bg-accent/20 font-medium" : ""}
                >
                  <span className="mr-2">{l.flag}</span>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />

          {isLoggedIn ? (
            <Button variant="ghost" onClick={signOut} size="sm">
              {t("nav.logout")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild size="sm">
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button variant="hero" asChild size="sm">
                <Link to="/generator">{t("nav.getStarted")}</Link>
              </Button>
            </>
          )}
        </div>

        {/* ── Mobile nav — hamburger ── */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex flex-col h-full">

                {/* Header sheet */}
                <div className="flex items-center gap-2 p-5 border-b">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                    <FileText className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-display text-lg font-bold">InvoiceAI</span>
                </div>

                {/* Liens */}
                <div className="flex-1 flex flex-col gap-1 p-4">

                  {/* Démo — toujours en premier et mis en avant */}
                  <Link
                    to="/demo"
                    onClick={closeMobile}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg bg-primary/5 border border-primary/20 text-primary font-medium hover:bg-primary/10 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    Voir la démo Pro
                  </Link>

                  <div className="my-2 border-t" />

                  {isLoggedIn ? (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={closeMobile}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-sm font-medium"
                      >
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                        {t("nav.dashboard")}
                      </Link>
                      <Link
                        to="/clients"
                        onClick={closeMobile}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-sm font-medium"
                      >
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Clients
                      </Link>
                      <Link
                        to="/settings"
                        onClick={closeMobile}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-sm font-medium"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        Paramètres
                      </Link>
                      <Link
                        to="/pricing"
                        onClick={closeMobile}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-sm font-medium"
                      >
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Abonnement
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={closeMobile}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-sm font-medium"
                      >
                        <LogIn className="h-4 w-4 text-muted-foreground" />
                        {t("nav.login")}
                      </Link>
                      <Link
                        to="/generator"
                        onClick={closeMobile}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        <FileText className="h-4 w-4" />
                        {t("nav.getStarted")}
                      </Link>
                    </>
                  )}
                </div>

                {/* Footer sheet */}
                <div className="p-4 border-t space-y-3">
                  {/* Sélecteur langue */}
                  <div className="flex items-center gap-2">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => setLang(l.code)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                          lang === l.code
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent/50"
                        }`}
                      >
                        {l.flag} {l.label}
                      </button>
                    ))}
                  </div>

                  {/* Déconnexion */}
                  {isLoggedIn && (
                    <button
                      onClick={() => { signOut(); closeMobile(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors text-sm font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.logout")}
                    </button>
                  )}
                </div>

              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </nav>
  );
}