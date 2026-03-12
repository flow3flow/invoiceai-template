import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Building2, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessProfiles, BusinessProfile } from "@/hooks/useBusinessProfiles";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface BusinessProfileSelectProps {
  /** Currently selected profile id */
  value: string | null;
  /** Called when the user picks a different profile */
  onChange: (profile: BusinessProfile) => void;
  /** Optional label override */
  label?: string;
  /** Whether the field is disabled (e.g. after invoice is saved) */
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const BusinessProfileSelect = ({
  value,
  onChange,
  label = "Profil entreprise",
  disabled = false,
}: BusinessProfileSelectProps) => {
  const { profiles, defaultProfile, loading } = useBusinessProfiles();

  // Auto-select default (or first) profile on mount / when profiles load
  useEffect(() => {
    if (!profiles.length || value) return;

    const target = defaultProfile ?? profiles[0];
    if (target) onChange(target);
  }, [profiles, defaultProfile]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!profiles.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0" />
          <p className="text-sm">
            Aucun profil entreprise configuré. Veuillez en créer un dans les paramètres.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings">Aller aux paramètres</Link>
        </Button>
      </div>
    );
  }

  // ── Select ─────────────────────────────────────────────────────────────────
  const handleChange = (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    if (profile) onChange(profile);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Select
        value={value ?? undefined}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sélectionner une entreprise…">
            {/* Show selected profile name inline in trigger */}
            {value && (() => {
              const selected = profiles.find((p) => p.id === value);
              if (!selected) return null;
              return (
                <span className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{selected.company_name}</span>
                  {selected.is_default && (
                    <Badge
                      variant="secondary"
                      className="ml-1 text-[10px] px-1.5 py-0 h-4 shrink-0"
                    >
                      Par défaut
                    </Badge>
                  )}
                </span>
              );
            })()}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <span className="flex items-center gap-2 w-full">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{profile.company_name}</span>
                {profile.is_default && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-2 shrink-0">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Par défaut
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Contextual hint — VAT + IBAN preview for selected profile */}
      {value && (() => {
        const selected = profiles.find((p) => p.id === value);
        if (!selected) return null;
        const hints = [
          selected.vat_number,
          selected.iban ? `IBAN ···${selected.iban.slice(-4)}` : null,
          selected.city,
        ].filter(Boolean);
        if (!hints.length) return null;
        return (
          <p className="text-xs text-muted-foreground truncate">
            {hints.join(" · ")}
          </p>
        );
      })()}
    </div>
  );
};