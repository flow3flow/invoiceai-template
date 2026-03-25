import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Download,
  MoreHorizontal,
  Building2,
  Euro,
  RefreshCw,
  Search,
  ChevronDown,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Phone,
  Mail,
  Plus,
  XCircle,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

// ============================================================
// TYPES
// ============================================================

type Client = {
  id: number
  nom: string
  derniereFacture: string
  encours: number
  statut: "retard" | "paye" | "envoye" | "brouillon"
  joursRetard: number
  email: string
  telephone: string
  bce: string
  adresse: string
  dso: number
  totalFacture: number
  peppolOk: boolean
  bceVerifie: boolean
}

type Invoice = {
  id: string
  date: string
  montant: number
  statut: "retard" | "paye" | "envoye" | "brouillon"
}

type Alerte = {
  id: number
  client: string
  invoice: string
  retard: number
  clientId: number
}

// ============================================================
// MOCK DATA
// ============================================================

const kpiData = {
  caMtd: 12450,
  caObjectif: 15000,
  encoursTotal: 8200,
  retardsCount: 3,
  retardsMontant: 2100,
  peppolOk: 15,
  peppolTotal: 16,
  bceVerifies: 28,
  bceTotal: 30,
}

const alertes: Alerte[] = [
  { id: 1, client: "Ame Alma", invoice: "INV-026", retard: 12, clientId: 1 },
  { id: 2, client: "Design Studio SRL", invoice: "INV-019", retard: 8, clientId: 3 },
  { id: 3, client: "TechStart BVBA", invoice: "INV-022", retard: 5, clientId: 2 },
]

const caMtdData = [
  { jour: "1", actuel: 1200, cible: 1000 },
  { jour: "5", actuel: 3500, cible: 3333 },
  { jour: "10", actuel: 5800, cible: 5000 },
  { jour: "15", actuel: 7200, cible: 7500 },
  { jour: "20", actuel: 9800, cible: 10000 },
  { jour: "25", actuel: 12450, cible: 12500 },
]

const encoursData = [
  { mois: "Oct", encours: 4200 },
  { mois: "Nov", encours: 5800 },
  { mois: "Déc", encours: 6100 },
  { mois: "Jan", encours: 7500 },
  { mois: "Fév", encours: 6800 },
  { mois: "Mar", encours: 8200 },
]

const clients: Client[] = [
  {
    id: 1,
    nom: "Ame Alma",
    derniereFacture: "INV-026",
    encours: 1200,
    statut: "retard",
    joursRetard: 12,
    email: "contact@amealma.be",
    telephone: "+32 2 123 45 67",
    bce: "BE0123.456.789",
    adresse: "Rue de la Loi 42, 1000 Bruxelles",
    dso: 45,
    totalFacture: 15600,
    peppolOk: true,
    bceVerifie: true,
  },
  {
    id: 2,
    nom: "TechStart BVBA",
    derniereFacture: "INV-022",
    encours: 1800,
    statut: "retard",
    joursRetard: 5,
    email: "billing@techstart.be",
    telephone: "+32 3 987 65 43",
    bce: "BE0987.654.321",
    adresse: "Korenmarkt 15, 9000 Gent",
    dso: 38,
    totalFacture: 24300,
    peppolOk: true,
    bceVerifie: true,
  },
  {
    id: 3,
    nom: "Design Studio SRL",
    derniereFacture: "INV-019",
    encours: 3200,
    statut: "retard",
    joursRetard: 8,
    email: "finance@designstudio.be",
    telephone: "+32 4 567 89 01",
    bce: "BE0456.789.012",
    adresse: "Place Saint-Lambert 20, 4000 Liège",
    dso: 52,
    totalFacture: 31200,
    peppolOk: false,
    bceVerifie: true,
  },
  {
    id: 4,
    nom: "Cloud Nine SARL",
    derniereFacture: "INV-025",
    encours: 0,
    statut: "paye",
    joursRetard: 0,
    email: "comptabilite@cloudnine.fr",
    telephone: "+33 1 23 45 67 89",
    bce: "FR12345678901",
    adresse: "8 Rue de Rivoli, 75004 Paris",
    dso: 22,
    totalFacture: 18900,
    peppolOk: true,
    bceVerifie: true,
  },
  {
    id: 5,
    nom: "BrightLabs NV",
    derniereFacture: "DEV-001",
    encours: 5600,
    statut: "envoye",
    joursRetard: 0,
    email: "ap@brightlabs.be",
    telephone: "+32 2 345 67 89",
    bce: "BE0234.567.890",
    adresse: "Groenplaats 8, 2000 Antwerpen",
    dso: 28,
    totalFacture: 42100,
    peppolOk: true,
    bceVerifie: true,
  },
  {
    id: 6,
    nom: "Pixel Perfect SPRL",
    derniereFacture: "DEV-002",
    encours: 2200,
    statut: "brouillon",
    joursRetard: 0,
    email: "hello@pixelperfect.be",
    telephone: "+32 9 876 54 32",
    bce: "BE0345.678.901",
    adresse: "Veldstraat 55, 9000 Gent",
    dso: 35,
    totalFacture: 8700,
    peppolOk: true,
    bceVerifie: false,
  },
]

const clientInvoices: Record<number, Invoice[]> = {
  1: [
    { id: "INV-026", date: "15/02/2026", montant: 1200, statut: "retard" },
    { id: "INV-018", date: "10/01/2026", montant: 2400, statut: "paye" },
    { id: "INV-012", date: "05/12/2025", montant: 1800, statut: "paye" },
    { id: "INV-008", date: "20/11/2025", montant: 3200, statut: "paye" },
    { id: "INV-003", date: "15/10/2025", montant: 2600, statut: "paye" },
  ],
  2: [
    { id: "INV-022", date: "01/03/2026", montant: 1800, statut: "retard" },
    { id: "INV-015", date: "15/01/2026", montant: 4500, statut: "paye" },
    { id: "INV-009", date: "01/12/2025", montant: 3200, statut: "paye" },
    { id: "INV-004", date: "10/11/2025", montant: 2800, statut: "paye" },
    { id: "INV-001", date: "01/10/2025", montant: 5600, statut: "paye" },
  ],
  3: [
    { id: "INV-019", date: "20/02/2026", montant: 3200, statut: "retard" },
    { id: "INV-014", date: "10/01/2026", montant: 5800, statut: "paye" },
    { id: "INV-010", date: "05/12/2025", montant: 4200, statut: "paye" },
    { id: "INV-006", date: "25/11/2025", montant: 3600, statut: "paye" },
    { id: "INV-002", date: "15/10/2025", montant: 6400, statut: "paye" },
  ],
  4: [
    { id: "INV-025", date: "10/03/2026", montant: 4100, statut: "paye" },
    { id: "INV-020", date: "25/02/2026", montant: 3800, statut: "paye" },
    { id: "INV-016", date: "05/02/2026", montant: 2900, statut: "paye" },
    { id: "INV-011", date: "15/01/2026", montant: 4200, statut: "paye" },
    { id: "INV-007", date: "20/12/2025", montant: 3900, statut: "paye" },
  ],
  5: [
    { id: "DEV-001", date: "12/03/2026", montant: 5600, statut: "envoye" },
    { id: "INV-024", date: "01/03/2026", montant: 8200, statut: "paye" },
    { id: "INV-021", date: "15/02/2026", montant: 6500, statut: "paye" },
    { id: "INV-017", date: "01/02/2026", montant: 7400, statut: "paye" },
    { id: "INV-013", date: "10/01/2026", montant: 5800, statut: "paye" },
  ],
  6: [
    { id: "DEV-002", date: "15/03/2026", montant: 2200, statut: "brouillon" },
    { id: "INV-023", date: "05/03/2026", montant: 1800, statut: "paye" },
    { id: "INV-019", date: "20/02/2026", montant: 2400, statut: "paye" },
    { id: "INV-015", date: "01/02/2026", montant: 1200, statut: "paye" },
    { id: "INV-011", date: "15/01/2026", montant: 1100, statut: "paye" },
  ],
}

const riskClients = clients
  .filter((c) => c.dso > 30)
  .sort((a, b) => b.dso - a.dso)
  .slice(0, 3)

// ============================================================
// HELPER COMPONENTS
// ============================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
  formatter?: (value: number, name: string) => string
}

function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
          {formatter ? formatter(entry.value, entry.name) : `${entry.value}`}
        </p>
      ))}
    </div>
  )
}

function getStatutBadge(statut: string, joursRetard: number) {
  switch (statut) {
    case "retard":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{joursRetard}j retard</Badge>
    case "paye":
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Payé</Badge>
    case "envoye":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Envoyé</Badge>
    case "brouillon":
      return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Brouillon</Badge>
    default:
      return null
  }
}

function getInvoiceStatutBadge(statut: string) {
  switch (statut) {
    case "paye":
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Payé</Badge>
    case "retard":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Retard</Badge>
    case "envoye":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Envoyé</Badge>
    case "brouillon":
      return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">Brouillon</Badge>
    default:
      return null
  }
}

// ============================================================
// CLIENT SHEET
// ============================================================

interface ClientSheetProps {
  client: Client | null
  invoices: Invoice[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ClientSheet({ client, invoices, open, onOpenChange }: ClientSheetProps) {
  if (!client) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-card border-border/50 overflow-y-auto">
        <SheetHeader>
          <div>
            <SheetTitle className="text-xl">{client.nom}</SheetTitle>
            <SheetDescription className="font-mono">{client.bce}</SheetDescription>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className={client.bceVerifie ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}>
              {client.bceVerifie ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              BCE
            </Badge>
            <Badge variant="outline" className={client.peppolOk ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}>
              {client.peppolOk ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              Peppol
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut actuel</span>
            {getStatutBadge(client.statut, client.joursRetard)}
          </div>
          <Separator className="bg-border/50" />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.telephone}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{client.adresse}</span>
              </div>
            </div>
          </div>
          <Separator className="bg-border/50" />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Données financières</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-background/50 p-3 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Encours</p>
                <p className="text-lg font-bold text-red-400">{client.encours.toLocaleString("fr-FR")}€</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">DSO</p>
                <p className={`text-lg font-bold ${client.dso > 30 ? "text-amber-400" : "text-emerald-400"}`}>{client.dso}j</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">{(client.totalFacture / 1000).toFixed(0)}k€</p>
              </div>
            </div>
          </div>
          <Separator className="bg-border/50" />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">5 dernières factures</h4>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between rounded-lg bg-background/50 p-2.5 border border-border/50 hover:bg-background/70 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-mono font-medium">{invoice.id}</p>
                      <p className="text-xs text-muted-foreground">{invoice.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{invoice.montant.toLocaleString("fr-FR")}€</span>
                    {getInvoiceStatutBadge(invoice.statut)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator className="bg-border/50" />

          <div className="space-y-2">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />Nouvelle Facture
            </Button>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />Télécharger relevé
            </Button>
            {client.statut === "retard" && (
              <Button className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">
                <Send className="h-4 w-4 mr-2" />Relancer
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DashboardCockpit() {
  const navigate = useNavigate()

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<"encours" | "dso" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleClientClick = (client: Client) => { setSelectedClient(client); setSheetOpen(true) }
  const handleAlertClick = (clientId: number) => {
    const client = clients.find(c => c.id === clientId)
    if (client) handleClientClick(client)
  }
  const handleSort = (field: "encours" | "dso") => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDirection("desc") }
  }

  const filteredAndSortedClients = useMemo(() => {
    let result = clients.filter(
      (client) =>
        client.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.derniereFacture.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = sortField === "encours" ? a.encours : a.dso
        const bVal = sortField === "encours" ? b.encours : b.dso
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      })
    }
    return result
  }, [searchQuery, sortField, sortDirection])

  const getSortIcon = (field: "encours" | "dso") => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const caProgress = (kpiData.caMtd / kpiData.caObjectif) * 100
  const peppolProgress = (kpiData.peppolOk / kpiData.peppolTotal) * 100

  // ── STRUCTURE CORRECTE ──────────────────────────────────────────────────────
  // min-h-screen
  //   └── <Navbar />
  //   └── pt-20 (compense la navbar fixe)
  //         └── mx-auto max-w-7xl (contenu)
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 px-4 md:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                InvoiceAI <span className="text-primary">Cockpit</span>
              </h1>
              <p className="text-muted-foreground text-sm">Tableau de bord cash-flow freelance BE/FR</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </Badge>
              <span className="text-xs text-muted-foreground">Dernière sync: il y a 2 min</span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-primary" />CA MTD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">{kpiData.caMtd.toLocaleString("fr-FR")}€</span>
                  <span className="text-xs text-muted-foreground">({Math.round(caProgress)}%)</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={caProgress} className="h-1.5" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">vs {kpiData.caObjectif.toLocaleString("fr-FR")}€</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-red-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-red-400" />
                  Encours Total
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-red-500/10 text-red-400 border-red-500/30 animate-pulse">LIVE</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-red-400">{kpiData.encoursTotal.toLocaleString("fr-FR")}€</span>
                <div className="mt-2 flex items-center gap-1 text-xs text-red-400/80">
                  <TrendingUp className="h-3 w-3" /><span>+12% vs mois dernier</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-amber-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Retards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-400">{kpiData.retardsCount}</span>
                  <span className="text-sm text-muted-foreground">factures</span>
                </div>
                <div className="mt-2 text-xs text-amber-400/80 font-medium">{kpiData.retardsMontant.toLocaleString("fr-FR")}€ en retard</div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />Peppol OK
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-emerald-400">{Math.round(peppolProgress)}%</span>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={peppolProgress} className="h-1.5 [&>div]:bg-emerald-500" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{kpiData.peppolOk}/{kpiData.peppolTotal}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />BCE Vérifiés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-foreground">{kpiData.bceVerifies}/{kpiData.bceTotal}</span>
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /><span>Conformité active</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts & Charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Alertes Relance
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">{alertes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alertes.map((alerte) => (
                  <div key={alerte.id} className="flex items-center justify-between rounded-lg bg-background/50 p-2.5 border border-border/50 hover:bg-background/70 transition-colors cursor-pointer" onClick={() => handleAlertClick(alerte.clientId)}>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{alerte.client}</p>
                      <p className="text-xs text-muted-foreground">{alerte.invoice} · <span className="text-red-400">+{alerte.retard}j</span></p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={(e) => e.stopPropagation()}>
                      <Send className="h-3 w-3 mr-1" />Relancer
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">
                    <Send className="h-3.5 w-3.5 mr-1.5" />Relancer Tous ({alertes.length})
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Fix Peppol
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CA MTD vs Objectif</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={caMtdData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="jour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip formatter={(v, n) => `${n === "actuel" ? "Actuel" : "Objectif"}: ${v.toLocaleString("fr-FR")}€`} />} />
                    <Line type="monotone" dataKey="cible" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="actuel" stroke="oklch(0.75 0.18 85)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Évolution Encours
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-red-500/10 text-red-400 border-red-500/30">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={encoursData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="encoursGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.55 0.22 25)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.55 0.22 25)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="mois" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip formatter={(v) => `Encours: ${v.toLocaleString("fr-FR")}€`} />} />
                    <Area type="monotone" dataKey="encours" stroke="oklch(0.55 0.22 25)" strokeWidth={2} fill="url(#encoursGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Table clients */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg font-semibold">Clients & Factures</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 w-full sm:w-[200px] bg-background/50 border-border/50" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 border-border/50">
                        Tous les statuts<ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Tous</DropdownMenuItem>
                      <DropdownMenuItem>Payé</DropdownMenuItem>
                      <DropdownMenuItem>Envoyé</DropdownMenuItem>
                      <DropdownMenuItem>En retard</DropdownMenuItem>
                      <DropdownMenuItem>Brouillon</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Client</TableHead>
                    <TableHead className="text-muted-foreground">Dernière Fact.</TableHead>
                    <TableHead className="text-muted-foreground text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("encours")}>
                      <span className="flex items-center justify-end">Encours{getSortIcon("encours")}</span>
                    </TableHead>
                    <TableHead className="text-muted-foreground text-center cursor-pointer hover:text-foreground" onClick={() => handleSort("dso")}>
                      <span className="flex items-center justify-center">DSO{getSortIcon("dso")}</span>
                    </TableHead>
                    <TableHead className="text-muted-foreground">Statut</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedClients.map((client) => (
                    <TableRow key={client.id} className="border-border/50 cursor-pointer hover:bg-primary/5 transition-all group" onClick={() => handleClientClick(client)}>
                      <TableCell className="font-medium">{client.nom}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{client.derniereFacture}</TableCell>
                      <TableCell className="text-right font-medium">{client.encours > 0 ? `${client.encours.toLocaleString("fr-FR")}€` : "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={client.dso > 45 ? "bg-red-500/20 text-red-400 border-red-500/30" : client.dso > 30 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"}>
                          {client.dso}j
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatutBadge(client.statut, client.joursRetard)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          {client.statut === "retard" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={(e) => e.stopPropagation()}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Download className="h-4 w-4 mr-2" />Télécharger PDF</DropdownMenuItem>
                              <DropdownMenuItem><Send className="h-4 w-4 mr-2" />Envoyer relance</DropdownMenuItem>
                              <DropdownMenuItem><FileText className="h-4 w-4 mr-2" />Voir historique</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Sticky footer */}
          <div className="fixed bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
            <div className="mx-auto max-w-7xl">
              <Card className="bg-amber-500/10 border-amber-500/30 backdrop-blur-md shadow-lg">
                <CardContent className="py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-medium text-amber-400">Top 3 Clients à Risque (DSO {">"}30j)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {riskClients.map((client) => (
                        <div key={client.id} className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-1.5 border border-border/50 cursor-pointer hover:bg-background/70 hover:border-amber-500/50 transition-all" onClick={() => handleClientClick(client)}>
                          <span className="text-sm font-medium">{client.nom}</span>
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">DSO {client.dso}j</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>{/* fin mx-auto */}
      </div>{/* fin pt-20 */}

      {/* Client Sheet */}
      <ClientSheet
        client={selectedClient}
        invoices={selectedClient ? clientInvoices[selectedClient.id] || [] : []}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

    </div> /* fin min-h-screen */
  )
}