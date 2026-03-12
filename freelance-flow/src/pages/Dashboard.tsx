import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Plus, Search, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInvoices, InvoiceWithClient, InvoiceStatus } from "@/hooks/useInvoices";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Label,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build last-6-months revenue data from real invoices.
 * Returns array of { month, facture, encaisse } for the AreaChart.
 */
function buildRevenueData(invoices: InvoiceWithClient[]) {
  const now = new Date();
  const months: { key: string; label: string }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    // Capitalize first letter
    months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  return months.map(({ key, label }) => {
    const monthInvoices = invoices.filter((inv) => inv.issue_date?.startsWith(key));
    const facture = monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const encaisse = monthInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + Number(inv.total), 0);
    return { month: label, facture: Math.round(facture * 100) / 100, encaisse: Math.round(encaisse * 100) / 100 };
  });
}

/**
 * Build donut chart data from real invoices.
 */
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
      name,
      color,
      value: invoices
        .filter((inv) => inv.status === status)
        .reduce((sum, inv) => sum + Number(inv.total), 0),
    }))
    .filter((d) => d.value > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { key: string; className: string }> = {
  draft:     { key: "dashboard.statusDraft",   className: "bg-muted text-muted-foreground" },
  sent:      { key: "dashboard.statusSent",    className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  paid:      { key: "dashboard.statusPaid",    className: "bg-green-500/10 text-green-500 border-green-500/20" },
  overdue:   { key: "dashboard.statusOverdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { key: "dashboard.statusCancelled", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: €{Number(entry.value).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
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
  const { getInvoices } = useInvoices();

  const [invoices, setInvoices]         = useState<InvoiceWithClient[]>([]);
  const [loadingData, setLoadingData]   = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ─── Load on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      const data = await getInvoices();
      if (!cancelled) {
        setInvoices(data);
        setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Derived stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = invoices.reduce((s, inv) => s + Number(inv.total), 0);
    const paid    = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
    const sent    = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + Number(i.total), 0);
    const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.total), 0);
    const fmt = (n: number) => `€${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    return [
      { label: t("dashboard.totalInvoiced"), value: fmt(total),   icon: DollarSign,   color: "text-primary" },
      { label: t("dashboard.paid"),           value: fmt(paid),    icon: CheckCircle,  color: "text-green-500" },
      { label: t("dashboard.pending"),        value: fmt(sent),    icon: Clock,        color: "text-blue-500" },
      { label: t("dashboard.overdue"),        value: fmt(overdue), icon: AlertTriangle,color: "text-destructive" },
    ];
  }, [invoices, t]);

  // ─── Chart data ─────────────────────────────────────────────────────────
  const revenueData = useMemo(() => buildRevenueData(invoices), [invoices]);
  const statusData  = useMemo(() => buildStatusData(invoices),  [invoices]);
  const totalCount  = invoices.length;

  // ─── Filtered table rows ────────────────────────────────────────────────
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

  // ─── Donut label ────────────────────────────────────────────────────────
  const renderDonutLabel = (props: any) => {
    const { viewBox } = props;
    const { cx, cy } = viewBox;
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} y={cy - 8} className="fill-foreground" style={{ fontSize: 24, fontWeight: 700 }}>
          {totalCount}
        </tspan>
        <tspan x={cx} y={cy + 14} className="fill-muted-foreground" style={{ fontSize: 12 }}>
          factures
        </tspan>
      </text>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold">{t("dashboard.title")}</h1>
              <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
            </div>
            <Button variant="hero" asChild className="mt-4 sm:mt-0">
              <Link to="/generator">
                <Plus className="h-4 w-4 mr-2" /> {t("dashboard.newInvoice")}
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {loadingData
              ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
              : stats.map((stat) => (
                  <Card key={stat.label} className="glass border-border/50">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={stat.color}>
                        <stat.icon className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-display font-bold">{stat.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
            }
          </div>

          {/* Analytics */}
          <div className="mb-8">
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold text-foreground">Vue d'ensemble</h2>
              <p className="text-sm text-muted-foreground">6 derniers mois</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Area Chart */}
              <Card className="lg:col-span-3 border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-display font-semibold text-foreground mb-4">Chiffre d'affaires mensuel</h3>
                  {loadingData ? (
                    <Skeleton className="h-72 w-full rounded-md" />
                  ) : (
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
                          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => v === 0 ? "€0" : `€${(v / 1000).toFixed(0)}k`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="facture" name="Facturé" stroke="#6C63FF" strokeWidth={2} fill="url(#fillFacture)" dot={{ r: 4, fill: "#6C63FF", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                          <Area type="monotone" dataKey="encaisse" name="Encaissé" stroke="#22c55e" strokeWidth={2} fill="url(#fillEncaisse)" dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Donut Chart */}
              <Card className="lg:col-span-2 border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-display font-semibold text-foreground mb-4">Répartition des statuts</h3>
                  {loadingData ? (
                    <Skeleton className="h-72 w-full rounded-md" />
                  ) : totalCount === 0 ? (
                    <div className="h-72 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Aucune facture pour l'instant</p>
                    </div>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="45%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            label={false}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} stroke="none" />
                            ))}
                            <Label content={renderDonutLabel} position="center" />
                          </Pie>
                          <Tooltip formatter={(value: number) => `€${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`} />
                          <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            formatter={(value: string) => {
                              const item = statusData.find((d) => d.name === value);
                              return (
                                <span className="text-sm text-foreground">
                                  {value} — <span className="font-medium">€{item?.value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</span>
                                </span>
                              );
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

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("dashboard.search")}
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("dashboard.filterAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dashboard.filterAll")}</SelectItem>
                <SelectItem value="draft">{t("dashboard.filterDraft")}</SelectItem>
                <SelectItem value="sent">{t("dashboard.filterSent")}</SelectItem>
                <SelectItem value="paid">{t("dashboard.filterPaid")}</SelectItem>
                <SelectItem value="overdue">{t("dashboard.filterOverdue")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Table */}
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
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <TableSkeleton />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                        {invoices.length === 0
                          ? "Aucune facture pour l'instant. Créez votre première facture !"
                          : "Aucun résultat pour cette recherche."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inv) => {
                      const config = statusConfig[inv.status] ?? statusConfig.draft;
                      const clientLabel = inv.clients?.company || inv.clients?.name || "—";
                      return (
                        <tr
                          key={inv.id}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <td className="p-4 font-medium font-display">{inv.invoice_number}</td>
                          <td className="p-4">{clientLabel}</td>
                          <td className="p-4 text-right font-medium">
                            €{Number(inv.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(inv.issue_date).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={config.className}>
                              {t(config.key)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;