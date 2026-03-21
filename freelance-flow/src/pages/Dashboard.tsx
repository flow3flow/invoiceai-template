import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip, TooltipContent,
  TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus, Search, DollarSign, Clock, CheckCircle,
  AlertTriangle, Download, Loader2, FileX, Network,
  FileText, ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useInvoices,
  type InvoiceWithClient,
  type InvoiceStatus,
} from "@/hooks/useInvoices";
import { generateInvoicePdf } from "@/lib/pdf/generateInvoicePdf";
import CreditNoteModal from "@/components/invoice/CreditNoteModal";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Label,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildRevenueData(invoices: InvoiceWithClient[]) {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months.map(({ key, label }) => {
    const monthInvoices = invoices.filter((inv) => inv.issue_date?.startsWith(key));
    const facture  = monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const encaisse = monthInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + Number(inv.total), 0);
    return { month: label, facture: Math.round(facture * 100) / 100, encaisse: Math.round(encaisse * 100) / 100 };
  });
}

function buildStatusData(invoices: InvoiceWithClient[]) {
  const groups: Record<string, { name: string; color: string }> = {
    paid:      { name: "Payé",      color: "#22c55e" },
    sent:      { name: "Envoyé",    color: "#3b82f6" },
    overdue:   { name: "En retard", color: "#ef4444" },
    draft:     { name: "Brouillon", color: "#9ca3af" },
    cancelled: { name: "Annulé",    color: "#f97316" },
  };
  return Object.entries(groups)
    .map(([status, { name, color }]) => ({
      name, color,
      value: invoices.filter((inv) => inv.status === status).reduce((sum, inv) => sum + Number(inv.total), 0),
    }))
    .filter((d) => d.value > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  sent:      { label: "Envoyé",    className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  paid:      { label: "Payé",      className: "bg-green-500/10 text-green-500 border-green-500/20" },
  overdue:   { label: "En retard", className: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Annulé",    className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
};

// Transitions autorisées par statut — miroir de useInvoices
const STATUS_TRANSITIONS: Record<InvoiceStatus, { value: InvoiceStatus; label: string; className: string }[]> = {
  draft:     [
    { value: "sent",    label: "✉️ Marquer comme envoyée",   className: "text-blue-500" },
    { value: "overdue", label: "⏰ Marquer en retard",        className: "text-destructive" },
  ],
  sent:      [
    { value: "paid",    label: "✅ Marquer comme payée",      className: "text-green-500" },
    { value: "overdue", label: "⏰ Marquer en retard",        className: "text-destructive" },
  ],
  overdue:   [
    { value: "sent",    label: "✉️ Marquer comme envoyée",   className: "text-blue-500" },
    { value: "paid",    label: "✅ Marquer comme payée",      className: "text-green-500" },
  ],
  paid:      [],
  cancelled: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-sm text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: €{Number(entry.value).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
};

function StatSkeleton() {
  return (
    <Card className="glass border-border/50">
      <CardContent className="p-6 flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="p-4"><Skeleton className="h-4 w-28" /></td>
          <td className="p-4"><Skeleton className="h-4 w-32" /></td>
          <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
          <td className="p-4"><Skeleton className="h-4 w-20" /></td>
          <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="p-4 text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { getInvoices, createCreditNote, updateInvoiceStatus, loading } = useInvoices();

  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<InvoiceWithClient | null>(null);

  // ── Chargement
  const loadInvoices = async () => {
    setLoadingData(true);
    const data = await getInvoices();
    setInvoices(data);
    setLoadingData(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      const data = await getInvoices();
      if (!cancelled) { setInvoices(data); setLoadingData(false); }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── KPI
  const stats = useMemo(() => {
    const total   = invoices.reduce((s, inv) => s + Number(inv.total), 0);
    const paid    = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
    const sent    = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + Number(i.total), 0);
    const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.total), 0);
    const fmt = (n: number) => `€${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    return [
      { label: t("dashboard.totalInvoiced"), value: fmt(total),   icon: DollarSign,    color: "text-primary",     border: "border-l-blue-500",   bg: "from-blue-500/5"   },
      { label: t("dashboard.paid"),          value: fmt(paid),    icon: CheckCircle,   color: "text-green-500",   border: "border-l-green-500",  bg: "from-green-500/5"  },
      { label: t("dashboard.pending"),       value: fmt(sent),    icon: Clock,         color: "text-blue-500",    border: "border-l-orange-500", bg: "from-orange-500/5" },
      { label: t("dashboard.overdue"),       value: fmt(overdue), icon: AlertTriangle, color: "text-destructive", border: "border-l-red-500",    bg: "from-red-500/5"    },
    ];
  }, [invoices, t]);

  const revenueData = useMemo(() => buildRevenueData(invoices), [invoices]);
  const statusData  = useMemo(() => buildStatusData(invoices), [invoices]);
  const totalCount  = invoices.length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((inv) => {
      const matchSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.clients?.name ?? "").toLowerCase().includes(q) ||
        (inv.clients?.company ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const renderDonutLabel = (props: { viewBox?: { cx: number; cy: number } }) => {
    const cx = props.viewBox?.cx ?? 0;
    const cy = props.viewBox?.cy ?? 0;
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} y={cy - 8} className="fill-foreground" style={{ fontSize: 24, fontWeight: 700 }}>{totalCount}</tspan>
        <tspan x={cx} y={cy + 14} className="fill-muted-foreground" style={{ fontSize: 12 }}>factures</tspan>
      </text>
    );
  };

  // ── Handlers
  const handleDownload = async (inv: InvoiceWithClient) => {
    if (!inv.issuer_company_name) { toast.error("Données émetteur manquantes"); return; }
    setDownloadingId(inv.id);
    try {
      await generateInvoicePdf(
        {
          invoice_number:        inv.invoice_number,
          status:                inv.status,
          issue_date:            inv.issue_date,
          due_date:              inv.due_date,
          subtotal:              inv.subtotal,
          vat_amount:            inv.vat_amount,
          total:                 inv.total,
          notes:                 inv.notes,
          items:                 inv.invoice_items ?? [],
          vat_scenario:          inv.vat_scenario ?? null,
          issuer_vat_scheme:     inv.issuer_vat_scheme ?? "normal",
          document_type:         inv.document_type ?? "invoice",
          linked_invoice_number: inv.linked_invoice_number ?? null,
          structured_ref: inv.structured_ref ?? null,
        },
        {
          company_name: inv.issuer_company_name ?? "",
          vat_number:   inv.issuer_vat_number ?? null,
          street:       inv.issuer_street ?? null,
          zip_code:     inv.issuer_zip_code ?? null,
          city:         inv.issuer_city ?? null,
          country_code: inv.issuer_country_code ?? "BE",
          email:        inv.issuer_email ?? null,
          iban:         inv.issuer_iban ?? null,
        },
        {
          name:         inv.clients?.name ?? "",
          company:      inv.clients?.company ?? null,
          email:        inv.clients?.email ?? null,
          street:       inv.clients?.street ?? null,
          zip_code:     inv.clients?.zip_code ?? null,
          city:         inv.clients?.city ?? null,
          country_code: inv.clients?.country_code ?? null,
          vat_number:   inv.clients?.vat_number ?? null,
        },
      );
    } catch (err) {
      console.error("[Dashboard] handleDownload:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  // --- DÉBUT SECTION : handler changement statut ---
  const handleStatusChange = async (inv: InvoiceWithClient, newStatus: InvoiceStatus) => {
    setUpdatingId(inv.id);
    const success = await updateInvoiceStatus(inv.id, inv.status, newStatus);
    if (success) {
      // Mise à jour optimiste locale — pas besoin de recharger toute la liste
      setInvoices((prev) =>
        prev.map((i) => i.id === inv.id ? { ...i, status: newStatus } : i)
      );
    }
    setUpdatingId(null);
  };
  // --- FIN SECTION : handler changement statut ---

  const handleCreditNoteConfirm = async (reason: string) => {
    if (!creditNoteInvoice) return;
    const result = await createCreditNote({ originalInvoice: creditNoteInvoice, reason });
    if (result) {
      setCreditNoteInvoice(null);
      await loadInvoices();
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-8">
          <div className="container mx-auto px-4">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  {t("dashboard.title")}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button
                  onClick={() => toast.info("Génération IA — Disponible très prochainement 🚀")}
                  className="gap-2 bg-gradient-to-r from-primary to-blue-500 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  ✨ Générer avec l&apos;IA
                </Button>
                <Button variant="outline" onClick={() => navigate("/generator")} className="gap-2">
                  <Plus className="h-4 w-4" /> Création manuelle
                </Button>
              </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────── */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {loadingData
                ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
                : stats.map((stat) => (
                    <Card key={stat.label} className={`glass border-border/50 border-l-4 ${stat.border} bg-gradient-to-br ${stat.bg} to-transparent hover:-translate-y-1 hover:shadow-md transition-all duration-300`}>
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className={stat.color}><stat.icon className="h-8 w-8" /></div>
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>

            {/* ── Charts ─────────────────────────────────────────── */}
            <div className="mb-8">
              <div className="mb-5">
                <h2 className="font-display text-xl font-bold text-foreground">Vue d&apos;ensemble</h2>
                <p className="text-sm text-muted-foreground">6 derniers mois</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3 border-border/50 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-display font-semibold text-foreground mb-4">Chiffre d&apos;affaires mensuel</h3>
                    {loadingData ? <Skeleton className="h-72 w-full rounded-md" /> : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                              <linearGradient id="fillFacture" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#6C63FF" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="fillEncaisse" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => (v === 0 ? "€0" : `€${(v / 1000).toFixed(0)}k`)} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="facture"  name="Facturé"  stroke="#6C63FF" strokeWidth={2} fill="url(#fillFacture)"  dot={{ r: 4, fill: "#6C63FF", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            <Area type="monotone" dataKey="encaisse" name="Encaissé" stroke="#22c55e" strokeWidth={2} fill="url(#fillEncaisse)" dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-border/50 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-display font-semibold text-foreground mb-4">Répartition des statuts</h3>
                    {loadingData ? <Skeleton className="h-72 w-full rounded-md" /> : totalCount === 0 ? (
                      <div className="h-72 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Aucune facture pour l&apos;instant</p>
                      </div>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={false}>
                              {statusData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                              <Label content={renderDonutLabel} position="center" />
                            </Pie>
                            <RechartsTooltip formatter={(value: number) => `€${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`} />
                            <Legend layout="vertical" align="right" verticalAlign="middle"
                              formatter={(value: string) => {
                                const item = statusData.find((d) => d.name === value);
                                return <span className="text-sm text-foreground">{value} — <span className="font-medium">€{item?.value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</span></span>;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── Filtres ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("dashboard.search")} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder={t("dashboard.filterAll")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dashboard.filterAll")}</SelectItem>
                  <SelectItem value="draft">{t("dashboard.filterDraft")}</SelectItem>
                  <SelectItem value="sent">{t("dashboard.filterSent")}</SelectItem>
                  <SelectItem value="paid">{t("dashboard.filterPaid")}</SelectItem>
                  <SelectItem value="overdue">{t("dashboard.filterOverdue")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Table ───────────────────────────────────────────── */}
            <Card className="glass border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">{t("dashboard.colInvoice")}</th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">{t("dashboard.colClient")}</th>
                      <th className="text-right p-4 text-sm font-semibold text-muted-foreground">{t("dashboard.colAmount")}</th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">{t("dashboard.colDate")}</th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">{t("dashboard.colStatus")}</th>
                      <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData ? <TableSkeleton /> : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                            <div className="text-center">
                              <p className="text-lg text-muted-foreground">
                                {invoices.length === 0 ? "Aucune facture pour le moment" : "Aucun résultat pour cette recherche"}
                              </p>
                              {invoices.length === 0 && (
                                <p className="text-sm text-muted-foreground/70 mt-1">Créez votre première facture en moins de 30 secondes.</p>
                              )}
                            </div>
                            {invoices.length === 0 && (
                              <Button onClick={() => navigate("/generator")} className="gap-2 bg-gradient-to-r from-primary to-blue-500 shadow-lg">
                                ✨ Créer ma première facture
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((inv, idx) => {
                        const config = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
                        const clientLabel = inv.clients?.company || inv.clients?.name || "—";
                        const canCreditNote = inv.status === "sent" || inv.status === "paid";
                        const isDownloading = downloadingId === inv.id;
                        const isUpdating = updatingId === inv.id;
                        const transitions = STATUS_TRANSITIONS[inv.status] ?? [];

                        return (
                          <tr key={inv.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                            <td className="p-4 font-medium font-display">
                              {inv.invoice_number}
                              {inv.document_type === "credit_note" && (
                                <Badge variant="outline" className="ml-2 text-xs text-destructive border-destructive/30">NC</Badge>
                              )}
                            </td>
                            <td className="p-4">{clientLabel}</td>
                            <td className="p-4 text-right font-medium">
                              €{Number(inv.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {new Date(inv.issue_date).toLocaleDateString("fr-FR")}
                            </td>

                            {/* ── Colonne statut — cliquable si transitions disponibles */}
                            <td className="p-4">
                              {transitions.length > 0 ? (
                                // --- DÉBUT SECTION : dropdown changement statut ---
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="flex items-center gap-1 group focus:outline-none"
                                      disabled={isUpdating}
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                      ) : (
                                        <Badge variant="outline" className={`${config.className} cursor-pointer group-hover:opacity-80 transition-opacity`}>
                                          {config.label}
                                        </Badge>
                                      )}
                                      <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-52">
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                                      Changer le statut
                                    </div>
                                    <DropdownMenuSeparator />
                                    {transitions.map((transition) => (
                                      <DropdownMenuItem
                                        key={transition.value}
                                        className={`cursor-pointer ${transition.className}`}
                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(inv, transition.value); }}
                                      >
                                        {transition.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                // --- FIN SECTION : dropdown changement statut ---
                              ) : (
                                // Statut immuable (paid, cancelled) — pas de dropdown
                                <Badge variant="outline" className={config.className}>
                                  {config.label}
                                </Badge>
                              )}
                            </td>

                            {/* ── Actions ─────────────────────────────────────── */}
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">

                                {/* Download PDF */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDownloading} onClick={(e) => { e.stopPropagation(); handleDownload(inv); }}>
                                      {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Télécharger PDF</TooltipContent>
                                </Tooltip>

                                {/* Note de crédit */}
                                {canCreditNote && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={loading} onClick={(e) => { e.stopPropagation(); setCreditNoteInvoice(inv); }}>
                                        <FileX className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Émettre une note de crédit</TooltipContent>
                                  </Tooltip>
                                )}

                                {/* Peppol Bêta */}
                                {canCreditNote && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="relative inline-flex">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toast.info("Peppol / UBL — Disponible dans la prochaine mise à jour"); }}>
                                          <Network className="h-4 w-4" />
                                        </Button>
                                        <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-primary text-primary-foreground rounded px-0.5 leading-tight pointer-events-none">Bêta</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Envoyer via Peppol (Bêta)</TooltipContent>
                                  </Tooltip>
                                )}

                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ── Modal note de crédit ─────────────────────────── */}
            <CreditNoteModal
              isOpen={!!creditNoteInvoice}
              onClose={() => setCreditNoteInvoice(null)}
              onConfirm={handleCreditNoteConfirm}
              originalInvoiceNumber={creditNoteInvoice?.invoice_number ?? ""}
              originalInvoiceDate={creditNoteInvoice ? new Date(creditNoteInvoice.issue_date).toLocaleDateString("fr-FR") : ""}
              originalTotal={creditNoteInvoice?.total ?? 0}
              documentLabel={creditNoteInvoice?.issuer_country_code === "FR" ? "Avoir" : "Note de crédit"}
            />

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;