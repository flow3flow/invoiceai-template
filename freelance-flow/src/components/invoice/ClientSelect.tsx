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

export const ClientSelect = ({ value, onChange }: ClientSelectProps) => {
  const { clients, loading } = useClients();

  return (
    <div className="space-y-1">
      <Label htmlFor="client-select">Client *</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger id="client-select">
          <SelectValue placeholder={loading ? 'Chargement...' : 'Sélectionner un client'} />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.company ? `${client.company} — ${client.name}` : client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};