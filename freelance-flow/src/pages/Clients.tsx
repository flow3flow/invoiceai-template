// src/pages/Clients.tsx
import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { useClients, type Client, type ClientInput } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Users, Search, Building2,
  User, Inbox, Loader2, CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react';
import { lookupBce, isBceError, normalizeBelgianVat } from '@/lib/bce-api';
import { checkPeppol, isPeppolError } from '@/lib/peppol-check';

// ─────────────────────────────────────────────────────────────────────────────
// Formulaire client — inline (BCE + Peppol + toggle)
// ─────────────────────────────────────────────────────────────────────────────

interface ClientFormProps {
  initialData: Client | null;
  onSubmit: (data: ClientInput) => Promise<void>;
  onCancel: () => void;
}

function ClientForm({ initialData, onSubmit, onCancel }: ClientFormProps) {
  const [form, setForm] = useState<ClientInput>({
    name:               initialData?.name ?? '',
    email:              initialData?.email ?? null,
    phone:              initialData?.phone ?? null,
    company:            initialData?.company ?? null,
    vat_number:         initialData?.vat_number ?? null,
    street:             initialData?.street ?? null,
    zip_code:           initialData?.zip_code ?? null,
    city:               initialData?.city ?? null,
    country_code:       initialData?.country_code ?? 'BE',
    // Nouveaux champs
    is_company:         initialData?.is_company ?? true,
    peppol_id:          initialData?.peppol_id ?? null,
    peppol_verified_at: initialData?.peppol_verified_at ?? null,
    bce_verified_at:    initialData?.bce_verified_at ?? null,
  });

  const [bceLoading, setBceLoading]       = useState(false);
  const [peppolLoading, setPeppolLoading] = useState(false);
  const [peppolStatus, setPeppolStatus]   = useState<'registered' | 'not_registered' | null>(
    initialData?.peppol_id ? 'registered' : null
  );
  const [submitting, setSubmitting] = useState(false);

  const upd = (patch: Partial<ClientInput>) => setForm((p) => ({ ...p, ...patch }));

  // ── Lookup BCE ──────────────────────────────────────────────────────────
  const handleBceLookup = async () => {
    if (!form.vat_number) {
      toast.error('Saisissez d\'abord un numéro de TVA belge');
      return;
    }
    setBceLoading(true);
    try {
      const result = await lookupBce(form.vat_number);
      if (isBceError(result)) {
        toast.error(result.message);
        return;
      }
      upd({
        name:            result.denomination,
        company:         result.denomination,
        street:          result.street ? `${result.street} ${result.number ?? ''}`.trim() : null,
        zip_code:        result.zipCode,
        city:            result.municipality,
        country_code:    result.countryCode,
        vat_number:      result.vatNumber,
        is_company:      true,
        bce_verified_at: new Date().toISOString(),
      });
      toast.success(`✅ BCE : ${result.denomination} — ${result.status}`);
    } finally {
      setBceLoading(false);
    }
  };

  // ── Vérification Peppol ────────────────────────────────────────────────
  const handlePeppolCheck = async () => {
    const digits = normalizeBelgianVat(form.vat_number ?? '');
    if (!digits) {
      toast.error('Numéro de TVA belge invalide pour la vérification Peppol');
      return;
    }
    setPeppolLoading(true);
    try {
      const result = await checkPeppol(digits);
      if (isPeppolError(result)) {
        toast.error(result.message);
        return;
      }
      if (result.isRegistered) {
        upd({
          peppol_id:          result.peppolId,
          peppol_verified_at: result.checkedAt,
        });
        setPeppolStatus('registered');
        toast.success(`✅ Peppol actif — ID : ${result.peppolId}`);
      } else {
        upd({ peppol_id: null, peppol_verified_at: result.checkedAt });
        setPeppolStatus('not_registered');
        toast.warning('⚠️ Ce client n\'est pas enregistré sur le réseau Peppol');
      }
    } finally {
      setPeppolLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Le nom est obligatoire'); return; }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const isBelgian = form.country_code === 'BE';

  return (
    <div className="space-y-5 py-2">

      {/* ── Toggle personne physique / morale ─────────────────────── */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          {form.is_company
            ? <Building2 className="h-5 w-5 text-primary" />
            : <User className="h-5 w-5 text-muted-foreground" />
          }
          <div>
            <p className="text-sm font-medium">
              {form.is_company ? 'Personne morale (B2B)' : 'Personne physique (B2C)'}
            </p>
            <p className="text-xs text-muted-foreground">
              {form.is_company
                ? 'Peppol obligatoire pour les factures B2B belges'
                : 'Pas d\'obligation Peppol — PDF par email autorisé'}
            </p>
          </div>
        </div>
        <Switch
          checked={form.is_company}
          onCheckedChange={(v) => upd({ is_company: v })}
        />
      </div>

      {/* ── Numéro de TVA + BCE + Peppol ─────────────────────────── */}
      <div className="space-y-2">
        <Label>Numéro de TVA</Label>
        <div className="flex gap-2">
          <Input
            placeholder="ex : BE0123456789"
            value={form.vat_number ?? ''}
            onChange={(e) => upd({ vat_number: e.target.value || null })}
            className="flex-1"
          />
          {/* BCE lookup — belge uniquement */}
          {isBelgian && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBceLookup}
              disabled={bceLoading || !form.vat_number}
              className="shrink-0 gap-1.5"
            >
              {bceLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />
              }
              BCE
            </Button>
          )}
          {/* Peppol check — belge + entreprise uniquement */}
          {isBelgian && form.is_company && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePeppolCheck}
              disabled={peppolLoading || !form.vat_number}
              className="shrink-0 gap-1.5"
            >
              {peppolLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : peppolStatus === 'registered'
                ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                : peppolStatus === 'not_registered'
                ? <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                : <RefreshCw className="h-3.5 w-3.5" />
              }
              Peppol
            </Button>
          )}
        </div>

        {/* Badge statut Peppol */}
        {peppolStatus === 'registered' && (
          <p className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            Enregistré sur le réseau Peppol — ID : {form.peppol_id}
          </p>
        )}
        {peppolStatus === 'not_registered' && (
          <p className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" />
            Non enregistré sur Peppol — envoi PDF par email autorisé
          </p>
        )}
      </div>

      {/* ── Informations de base ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Nom / Raison sociale <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Dupont SA"
            value={form.name}
            onChange={(e) => upd({ name: e.target.value })}
          />
        </div>

        {form.is_company && (
          <div className="space-y-2 col-span-2">
            <Label>Nom commercial</Label>
            <Input
              placeholder="Dupont"
              value={form.company ?? ''}
              onChange={(e) => upd({ company: e.target.value || null })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="contact@entreprise.be"
            value={form.email ?? ''}
            onChange={(e) => upd({ email: e.target.value || null })}
          />
        </div>
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input
            placeholder="ex : +32 2 123 45 67"
            value={form.phone ?? ''}
            onChange={(e) => upd({ phone: e.target.value || null })}
          />
        </div>
      </div>

      {/* ── Adresse ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Rue</Label>
          <Input
            placeholder="Rue de la Paix 1"
            value={form.street ?? ''}
            onChange={(e) => upd({ street: e.target.value || null })}
          />
        </div>
        <div className="space-y-2">
          <Label>Code postal</Label>
          <Input
            placeholder="1000"
            value={form.zip_code ?? ''}
            onChange={(e) => upd({ zip_code: e.target.value || null })}
          />
        </div>
        <div className="space-y-2">
          <Label>Ville</Label>
          <Input
            placeholder="Bruxelles"
            value={form.city ?? ''}
            onChange={(e) => upd({ city: e.target.value || null })}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Pays</Label>
          <Select value={form.country_code} onValueChange={(v) => upd({ country_code: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BE">🇧🇪 Belgique</SelectItem>
              <SelectItem value="FR">🇫🇷 France</SelectItem>
              <SelectItem value="LU">🇱🇺 Luxembourg</SelectItem>
              <SelectItem value="NL">🇳🇱 Pays-Bas</SelectItem>
              <SelectItem value="DE">🇩🇪 Allemagne</SelectItem>
              <SelectItem value="GB">🇬🇧 Royaume-Uni</SelectItem>
              <SelectItem value="US">🇺🇸 États-Unis</SelectItem>
              <SelectItem value="OTHER">🌍 Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
          {submitting
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</>
            : initialData ? 'Mettre à jour' : 'Ajouter le client'}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Clients
// ─────────────────────────────────────────────────────────────────────────────

const ClientsPage = () => {
  const { clients, loading, addClient, updateClient, deleteClient } = useClients();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [query, setQuery] = useState('');

  const filteredClients = useMemo(() => {
    const s = query.toLowerCase().trim();
    if (!s) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(s) ||
      (c.company && c.company.toLowerCase().includes(s)) ||
      (c.email && c.email.toLowerCase().includes(s))
    );
  }, [clients, query]);

  const handleOpenEdit = (client: Client) => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedClient(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Supprimer définitivement ${client.name} ?`)) return;
    await deleteClient(client.id);
  };

  const handleSubmit = async (data: ClientInput) => {
    if (selectedClient) {
      await updateClient(selectedClient.id, data);
    } else {
      await addClient(data);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-display leading-none">
                  Clients
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Carnet d'adresses avec vérification BCE & Peppol.
                </p>
              </div>
            </div>
            <Button variant="hero" onClick={handleOpenAdd} className="w-full sm:w-auto shrink-0">
              <Plus className="h-4 w-4 mr-2" /> Nouveau client
            </Button>
          </div>

          {/* ── Recherche ──────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher par nom, entreprise ou email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-11 bg-card border-border/50"
              />
            </div>
            {!loading && (
              <Badge variant="secondary" className="whitespace-nowrap text-xs font-medium px-3 py-1.5 shrink-0">
                {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* ── Table ──────────────────────────────────────────────── */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-5 space-y-5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/5" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-3 w-1/5 hidden sm:block" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center mb-5">
                  <Inbox className="h-7 w-7 text-muted-foreground/70" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {query ? 'Aucun résultat' : 'Aucun client'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mb-6 leading-relaxed">
                  {query
                    ? `Aucun client ne correspond à « ${query} ».`
                    : 'Ajoutez votre premier client pour créer des factures.'}
                </p>
                {!query && (
                  <Button variant="outline" onClick={handleOpenAdd} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Ajouter un client
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground pl-5">Client</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hidden md:table-cell">Localisation</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hidden lg:table-cell">Peppol</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="group border-border/40 hover:bg-accent/40 transition-colors">
                      <TableCell className="pl-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                            {client.is_company
                              ? <Building2 className="h-4 w-4" />
                              : <User className="h-4 w-4" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                            {client.company && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{client.company}</p>
                            )}
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              {client.is_company ? 'B2B' : 'B2C'}
                              {client.vat_number && ` · ${client.vat_number}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {client.email || <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {client.city
                          ? `${client.city}, ${client.country_code}`
                          : client.country_code || <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      {/* ── Colonne Peppol ──────────────────────────── */}
                      <TableCell className="hidden lg:table-cell">
                        {!client.is_company ? (
                          <span className="text-xs text-muted-foreground/40">B2C</span>
                        ) : client.peppol_id ? (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-500/30 bg-green-500/5 gap-1">
                            <CheckCircle className="h-3 w-3" /> Peppol actif
                          </Badge>
                        ) : client.peppol_verified_at ? (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30 bg-amber-500/5 gap-1">
                            <AlertCircle className="h-3 w-3" /> Non enregistré
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">Non vérifié</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => handleOpenEdit(client)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(client)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* ── Dialog formulaire ──────────────────────────────────── */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedClient ? 'Éditer le client' : 'Nouveau client'}
                </DialogTitle>
              </DialogHeader>
              <ClientForm
                initialData={selectedClient}
                onSubmit={handleSubmit}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  );
};

export default ClientsPage;