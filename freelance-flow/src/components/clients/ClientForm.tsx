import React, { useState } from 'react';
import { Client, ClientInput } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ClientFormProps {
  initialData?: Client | null;
  onSubmit: (data: ClientInput) => Promise<void>;
  onCancel: () => void;
}

export const ClientForm = ({ initialData, onSubmit, onCancel }: ClientFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    vat_number: initialData?.vat_number || '',
    street: initialData?.street || '',
    zip_code: initialData?.zip_code || '',
    city: initialData?.city || '',
    country_code: initialData?.country_code || 'BE',
  });

  const normalizePayload = (data: typeof formData): ClientInput => {
    const { name, ...rest } = data;
    const optionalFields = Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [key, value.trim() === '' ? null : value.trim()])
    );
    return { 
      name: name.trim(), 
      ...optionalFields 
    } as unknown as ClientInput;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = normalizePayload(formData);
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nom du contact ou du client *</Label>
          <Input 
            id="name" 
            value={formData.name} 
            onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} 
            required 
            placeholder="ex: Jean Dupont"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Entreprise (Optionnel)</Label>
          <Input 
            id="company" 
            value={formData.company} 
            onChange={e => setFormData(prev => ({...prev, company: e.target.value}))} 
            placeholder="ex: Tech Solutions SA"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat">N° TVA</Label>
          <Input 
            id="vat" 
            value={formData.vat_number} 
            onChange={e => setFormData(prev => ({...prev, vat_number: e.target.value}))} 
            placeholder="BE0123456789"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={formData.email} 
            onChange={e => setFormData(prev => ({...prev, email: e.target.value}))} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input 
            id="phone" 
            value={formData.phone} 
            onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))} 
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street">Adresse (Rue et numéro)</Label>
          <Input 
            id="street" 
            value={formData.street} 
            onChange={e => setFormData(prev => ({...prev, street: e.target.value}))} 
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="zip">Code postal</Label>
            <Input id="zip" value={formData.zip_code} onChange={e => setFormData(prev => ({...prev, zip_code: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" value={formData.city} onChange={e => setFormData(prev => ({...prev, city: e.target.value}))} />
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="country">Pays</Label>
          <Select value={formData.country_code} onValueChange={v => setFormData(prev => ({...prev, country_code: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BE">Belgique</SelectItem>
              <SelectItem value="FR">France</SelectItem>
              <SelectItem value="LU">Luxembourg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Annuler</Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {initialData ? 'Enregistrer' : 'Créer le client'}
        </Button>
      </div>
    </form>
  );
};