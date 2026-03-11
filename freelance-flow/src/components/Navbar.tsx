import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileText, LayoutDashboard, Users } from "lucide-react"; 
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages: { code: Language; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "nl", flag: "🇧🇪", label: "NL" },
  { code: "de", flag: "🇩🇪", label: "DE" },
];

export function Navbar() {
  // Correction ici : on récupère 'user' et 'signOut' du contexte
  const { user, signOut } = useAuth();
  
  // On recrée les variables dont le reste du fichier a besoin
  const isLoggedIn = !!user; 
  const logout = signOut;

  const { lang, setLang, t } = useLanguage();

  const currentLang = languages.find((l) => l.code === lang)!;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          InvoiceAI
        </Link>

        <div className="flex items-center gap-2">
          {/* Liens de navigation (Desktop) - Visibles seulement si connecté */}
          {isLoggedIn && (
            <div className="hidden md:flex items-center gap-1 mr-4 border-r pr-4">
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
            </div>
          )}

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
            <Button variant="ghost" onClick={logout} size="sm">
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
      </div>
    </nav>
  );
}