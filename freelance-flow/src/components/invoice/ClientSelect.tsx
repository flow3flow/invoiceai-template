// src/components/invoice/ClientSelect.tsx
// ✅ Option "Autre (saisie manuelle)" ajoutée
// ✅ Affiche le nom + TVA du client sélectionné sous le dropdown

import { useClients } from '@/hooks/useClients';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ClientSelectProps {
  value: string;
  onChange: (clientId: string) => void;
}

export const MANUAL_CLIENT_ID = "__manual__";

export const ClientSelect = ({ value, onChange }: ClientSelectProps) => {
  const { clients, loading } = useClients();

  const selectedClient = clients.find((c) => c.id === value);

  return (
    <div className="space-y-1">
      <Label htmlFor="client-select">Client *</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger id="client-select">
          <SelectValue placeholder={loading ? 'Chargement...' : 'Sélectionner un client'} />
        </SelectTrigger>
        <SelectContent>
          {/* Clients enregistrés */}
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.company ? `${client.company} — ${client.name}` : client.name}
              {client.vat_number ? ` · ${client.vat_number}` : ''}
            </SelectItem>
          ))}

          {/* Séparateur visuel */}
          {clients.length > 0 && (
            <div className="mx-2 my-1 border-t border-border/40" />
          )}

          {/* Option saisie manuelle */}
          <SelectItem value={MANUAL_CLIENT_ID}>
            ✏️ Autre (saisie manuelle)
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Info client sélectionné */}
      {selectedClient && (
        <p className="text-[10px] text-muted-foreground font-mono pl-0.5">
          {[selectedClient.vat_number, selectedClient.city].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
};