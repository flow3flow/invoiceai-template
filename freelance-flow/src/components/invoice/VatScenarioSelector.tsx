// src/components/invoice/VatScenarioSelector.tsx

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { legalMentionsResolver, type VatScenario, type CountryCode } from "@/lib/vatScenario";

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue des scénarios par pays
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioOption {
  value: VatScenario;
  label: string;
  hint?: string;
}

const SCENARIOS_BE: ScenarioOption[] = [
  {
    value: "BE_STANDARD_21",
    label: "TVA 21% — Standard",
    hint: "Conseil IT, développement, prestation standard",
  },
  {
    value: "BE_INTRACOM_SERVICES",
    label: "Autoliquidation — Services B2B intra-UE",
    hint: "Client UE assujetti TVA — Art. 21 §2 CTVA",
  },
  {
    value: "BE_INTRACOM_GOODS",
    label: "Autoliquidation — Livraison biens intra-UE",
    hint: "Livraison biens vers client UE — Art. 39bis CTVA",
  },
  {
    value: "BE_REVERSE_CHARGE_LOCAL",
    label: "Autoliquidation — Cocontractant BE",
    hint: "Travaux immobiliers belges — Art. 20 AR n°1",
  },
  {
    value: "BE_FRANCHISE",
    label: "Franchise TVA — Art. 56bis",
    hint: "Petite entreprise < 25 000 € — TVA non applicable",
  },
  // --- CORRECTION : BE_EXEMPT_ART44 ajouté dans le sélecteur ---
  {
    value: "BE_EXEMPT_ART44",
    label: "Exonération TVA — Art. 44 CTVA",
    hint: "Médical, éducation, social, associations — TVA non applicable",
  },
  {
    value: "BE_REDUCED_6",
    label: "TVA 6% — Taux réduit ⚠️",
    hint: "Hors périmètre V1 — vérifier avec comptable",
  },
  {
    value: "BE_REDUCED_12",
    label: "TVA 12% — Taux intermédiaire ⚠️",
    hint: "Hors périmètre V1 — vérifier avec comptable",
  },
];

const SCENARIOS_FR: ScenarioOption[] = [
  {
    value: "FR_STANDARD_20",
    label: "TVA 20% — Standard",
    hint: "Prestation standard France",
  },
  {
    value: "FR_INTRACOM",
    label: "Autoliquidation — Intra-UE",
    hint: "Client UE assujetti TVA — Art. 283-2 CGI",
  },
  {
    value: "FR_REVERSE_CHARGE",
    label: "Autoliquidation — Nationale",
    hint: "Client français redevable — Art. 283-2 CGI",
  },
  {
    value: "FR_MICRO_FRANCHISE",
    label: "Franchise — Micro-entrepreneur",
    hint: "TVA non applicable — Art. 293B CGI",
  },
  {
    value: "FR_REDUCED_10",
    label: "TVA 10% — Taux réduit ⚠️",
    hint: "Hors périmètre V1 — vérifier avec comptable",
  },
  {
    value: "FR_REDUCED_55",
    label: "TVA 5,5% — Taux super-réduit ⚠️",
    hint: "Hors périmètre V1 — vérifier avec comptable",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface VatScenarioSelectorProps {
  value: VatScenario | null;
  onChange: (scenario: VatScenario) => void;
  sellerCountry: CountryCode;
  amountHT?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function VatScenarioSelector({
  value,
  onChange,
  sellerCountry,
  amountHT = 0,
}: VatScenarioSelectorProps) {
  const scenarios = sellerCountry === "FR" ? SCENARIOS_FR : SCENARIOS_BE;

  const resolved = useMemo(() => {
    if (!value) return null;
    try {
      return legalMentionsResolver(value, amountHT);
    } catch {
      return null;
    }
  }, [value, amountHT]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Régime TVA
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (détermine les mentions légales)
          </span>
        </Label>

        <Select value={value ?? ""} onValueChange={(v) => onChange(v as VatScenario)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionner le régime TVA…" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground">
                {sellerCountry === "FR" ? "🇫🇷 France" : "🇧🇪 Belgique"}
              </SelectLabel>
              {scenarios.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex flex-col gap-0.5">
                    <span>{s.label}</span>
                    {s.hint && (
                      <span className="text-xs text-muted-foreground">{s.hint}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Warning scénario hors périmètre V1 */}
      {resolved?.isOutOfScope && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Ce taux est hors périmètre V1. Vérifiez avec votre comptable avant de valider.
          </AlertDescription>
        </Alert>
      )}

      {/* Mention légale live */}
      {resolved?.legalMention && !resolved.isOutOfScope && (
        <Alert className="py-2 border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground block mb-0.5">
              Mention légale ajoutée au PDF :
            </span>
            {resolved.legalMention}
            {resolved.legalRef && (
              <span className="block mt-0.5 text-[10px] text-muted-foreground/70">
                {resolved.legalRef}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Info autoliquidation */}
      {resolved?.vatDueByCustomer && (
        <Alert className="py-2 border-amber-500/30 bg-amber-500/5">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
            Autoliquidation : la TVA sur toutes les lignes est automatiquement forcée à 0%.
            C&apos;est le client qui déclare la TVA.
          </AlertDescription>
        </Alert>
      )}

      {/* Info exonération art. 44 — pas d'autoliquidation, juste exonération */}
      {value === "BE_EXEMPT_ART44" && (
        <Alert className="py-2 border-blue-500/30 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
            Exonération Art. 44 : aucune TVA collectée ni due par le client.
            La mention légale sera automatiquement ajoutée au PDF.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}