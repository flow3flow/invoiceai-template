import React, { useState, useMemo } from 'react';
import { useClients, Client, ClientInput } from '@/hooks/useClients';
import { ClientForm } from '@/components/clients/ClientForm';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Search, Building2, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ClientsPage = () => {
  const { clients, loading, addClient, updateClient, deleteClient } = useClients();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [query, setQuery] = useState('');

  const filteredClients = useMemo(() => {
    const s = query.toLowerCase().trim();
    if (!s) return clients;
    return clients.filter(c => 
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
    const confirmed = window.confirm(`Supprimer définitivement le client ${client.name} ?`);
    if (confirmed) {
      await deleteClient(client.id);
    }
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
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">Gérez votre carnet d'adresses et facturation.</p>
        </div>
        <Button onClick={handleOpenAdd} size="lg" className="shadow-lg">
          <Plus className="mr-2 h-5 w-5" /> Nouveau client
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Rechercher par nom, entreprise, email..." 
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px]">Client / Entreprise</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground animate-pulse">Chargement des données...</TableCell></TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-medium">Aucun client trouvé.</TableCell></TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {client.company ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-foreground truncate">{client.name}</div>
                        {client.company && <div className="text-xs text-muted-foreground italic truncate">{client.company}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs md:text-sm truncate">
                    {client.email || <span className="text-muted/40">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {client.city ? `${client.city}, ${client.country_code}` : client.country_code}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(client)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" 
                        onClick={() => handleDelete(client)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{selectedClient ? 'Éditer le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <ClientForm 
            key={selectedClient?.id || 'new'} 
            initialData={selectedClient} 
            onSubmit={handleSubmit} 
            onCancel={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;