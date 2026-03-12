import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
// @ts-ignore - exists in real codebase
import { useClients, Client, ClientInput } from '@/hooks/useClients';
// @ts-ignore - exists in real codebase
import { ClientForm } from '@/components/clients/ClientForm';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Search, Building2, User, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
                  Gérez votre carnet d'adresses et facturation.
                </p>
              </div>
            </div>

            <Button variant="hero" onClick={handleOpenAdd} className="w-full sm:w-auto shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher par nom, entreprise ou email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-11 bg-card border-border/50 focus:border-primary/40 focus:bg-background transition-colors"
              />
            </div>

            {!loading && (
              <Badge variant="secondary" className="whitespace-nowrap text-xs font-medium px-3 py-1.5 shrink-0">
                {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

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
                    <Skeleton className="h-3 w-16 hidden md:block" />
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
                    : 'Commencez par ajouter votre premier client pour créer des factures.'}
                </p>

                {!query && (
                  <Button variant="outline" onClick={handleOpenAdd} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un client
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground pl-5">
                      Client
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hidden sm:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hidden md:table-cell">
                      Localisation
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right pr-5">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="group border-border/40 hover:bg-accent/40 transition-colors">
                      <TableCell className="pl-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                            {client.company ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                            {client.company && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{client.company}</p>
                            )}
                            {client.email && (
                              <p className="text-xs text-muted-foreground truncate sm:hidden mt-0.5">{client.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {client.email || <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {client.city ? `${client.city}, ${client.country_code}` : client.country_code || <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => handleOpenEdit(client)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
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

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-lg">
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