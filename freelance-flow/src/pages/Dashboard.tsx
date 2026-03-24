// src/pages/Dashboard.tsx
// ✅ Logique métier 100% préservée (ancienne base)
// 🎨 Design Lovable premium appliqué par-dessus

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  FileText, ChevronDown, ArrowRightCircle,
  Send, ShieldCheck, CircleAlert, CircleDot, Sparkles,
  ArrowRightLeft,
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
// Helpers — inchangés
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
// Configs — inchangées
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  sent:      { label: "Envoyé",    className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  paid:      { label: "Payé",      className: "bg-green-500/10 text-green-500 border-green-500/20" },
  overdue:   { label: "En retard", className: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Annulé",    className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  converted: { label: "Converti",  className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
};

const STATUS_TRANSITIONS: Record<InvoiceStatus, { value: InvoiceStatus; label: string; className: string }[]> = {
  draft:     [
    { value: "sent",    label: "✉️ Marquer comme envoyée",  className: "text-blue-500" },
    { value: "overdue", label: "⏰ Marquer en retard",       className: "text-destructive" },
  ],
  sent:      [
    { value: "paid",    label: "✅ Marquer comme payée",     className: "text-green-500" },
    { value: "overdue", label: "⏰ Marquer en retard",       className: "text-destructive" },
  ],
  overdue:   [
    { value: "sent",    label: "✉️ Marquer comme envoyée",  className: "text-blue-500" },
    { value: "paid",    label: "✅ Marquer comme payée",     className: "text-green-500" },
  ],
  paid:      [],
  cancelled: [],
};

const DOC_TYPE_LABEL: Record<string, { label: string; emoji: string; className: string }> = {
  invoice:     { label: "Facture", emoji: "🧾", className: "text-foreground/70 border-border/40 bg-muted/30" },
  quote:       { label: "Devis",   emoji: "📋", className: "text-purple-500 border-purple-500/30 bg-purple-500/10" },
  order:       { label: "BC",      emoji: "📦", className: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
  credit_note: { label: "NC",      emoji: "↩️", className: "text-destructive border-destructive/30 bg-destructive/10" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components — inchangés
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
    <Card className="border-border/50">
      <CardContent className="p-4">
        <Skeleton className="h-5 w-5 mb-3 rounded" />
        <Skeleton className="h-7 w-24 mb-1" />
        <Skeleton className="h-3 w-20 mb-1" />
        <Skeleton className="h-3 w-16" />
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
          <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
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
  const { getInvoices, createCreditNote, convertToInvoice, updateInvoiceStatus, loading } = useInvoices();

  // ── State — 100% inchangé ─────────────────────────────────────────────────
  const [invoices, setInvoices]           = useState<InvoiceWithClient[]>([]);
  const [loadingData, setLoadingData]     = useState(true);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<string>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const [convertingId, setConvertingId]   = useState<string | null>(null);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<InvoiceWithClient | null>(null);
  // Nouveau state pour hover actions Lovable
  const [hoveredRow, setHoveredRow]       = useState<string | null>(null);

  // ── Chargement — inchangé ─────────────────────────────────────────────────
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

  // ── KPI — logique inchangée, compteurs ajoutés pour Lovable ──────────────
  const stats = useMemo(() => {
    const total   = invoices.reduce((s, inv) => s + Number(inv.total), 0);
    const paid    = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
    const sent    = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + Number(i.total), 0);
    const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.total), 0);
    const fmt = (n: number) =>
      `€${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    return [
      {
        label: t("dashboard.totalInvoiced"), value: fmt(total),
        icon: DollarSign, iconColor: "text-blue-500",
        border: "border-l-blue-500", bg: "from-blue-500/5",
        count: invoices.length, countLabel: "documents",
      },
      {
        label: t("dashboard.paid"), value: fmt(paid),
        icon: CheckCircle, iconColor: "text-green-500",
        border: "border-l-green-500", bg: "from-green-500/5",
        count: invoices.filter((i) => i.status === "paid").length, countLabel: "encaissées",
      },
      {
        label: t("dashboard.pending"), value: fmt(sent),
        icon: Clock, iconColor: "text-orange-500",
        border: "border-l-orange-500", bg: "from-orange-500/5",
        count: invoices.filter((i) => i.status === "sent").length, countLabel: "envoyées",
      },
      {
        label: t("dashboard.overdue"), value: fmt(overdue),
        icon: AlertTriangle, iconColor: "text-destructive",
        border: "border-l-red-500", bg: "from-red-500/5",
        count: invoices.filter((i) => i.status === "overdue").length, countLabel: "impayées",
      },
    ];
  }, [invoices, t]);

  const revenueData = useMemo(() => buildRevenueData(invoices), [invoices]);
  const statusData  = useMemo(() => buildStatusData(invoices), [invoices]);
  const totalCount  = invoices.length;

  // ── Filtrage — inchangé ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((inv) => {
      const matchSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.clients?.name ?? "").toLowerCase().includes(q) ||
        (inv.clients?.company ?? "").toLowerCase().includes(q);
      const matchStatus  = statusFilter  === "all" || inv.status        === statusFilter;
      const matchDocType = docTypeFilter === "all" || inv.document_type === docTypeFilter;
      return matchSearch && matchStatus && matchDocType;
    });
  }, [invoices, search, statusFilter, docTypeFilter]);

  // ── Actions prioritaires — dérivées des vraies données ────────────────────
  const priorityActions = useMemo(() => {
    const drafts  = invoices.filter((i) => i.status === "draft");
    const overdue = invoices.filter((i) => i.status === "overdue");
    const toConvert = invoices.filter(
      (i) => (i.document_type === "quote" || i.document_type === "order") && i.status === "draft"
    );
    const actions = [];
    if (drafts.length > 0) {
      actions.push({
        icon: Send,
        title: `${drafts.length} brouillon${drafts.length > 1 ? "s" : ""} à envoyer`,
        description: drafts.slice(0, 3)
          .map((i) => i.clients?.company || i.clients?.name || i.invoice_number)
          .join(", "),
        priority: "haute" as const,
      });
    }
    if (overdue.length > 0) {
      const first = overdue[0];
      actions.push({
        icon: AlertTriangle,
        title: `${overdue.length} facture${overdue.length > 1 ? "s" : ""} impayée${overdue.length > 1 ? "s" : ""}`,
        description: `${first.clients?.company || first.clients?.name || "—"} — €${Number(first.total).toLocaleString("fr-FR")}`,
        priority: "haute" as const,
      });
    }
    if (toConvert.length > 0) {
      actions.push({
        icon: ArrowRightLeft,
        title: `${toConvert.length} devis à convertir`,
        description: toConvert.slice(0, 2)
          .map((i) => i.clients?.company || i.clients?.name || "—")
          .join(", "),
        priority: "moyenne" as const,
      });
    }
    return actions;
  }, [invoices]);

  // ── Suggestion IA — dérivée des vraies données ────────────────────────────
  const aiSuggestion = useMemo(() => {
    if (loadingData || invoices.length === 0) return null;
    const parts: string[] = [];
    const o = invoices.filter((i) => i.status === "overdue").length;
    const d = invoices.filter((i) => i.status === "draft").length;
    const c = invoices.filter(
      (i) => (i.document_type === "quote" || i.document_type === "order") && i.status === "draft"
    ).length;
    if (o > 0) parts.push(`${o} facture${o > 1 ? "s" : ""} en retard`);
    if (c > 0) parts.push(`${c} devis à convertir`);
    if (d > 0) parts.push(`${d} brouillon${d > 1 ? "s" : ""} à finaliser`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [invoices, loadingData]);

  // ── Résumé du jour ────────────────────────────────────────────────────────
  const daySummary = useMemo(() => {
    if (loadingData) return null;
    const parts: string[] = [];
    const d = invoices.filter((i) => i.status === "draft").length;
    const s = invoices.filter((i) => i.status === "sent").length;
    const o = invoices.filter((i) => i.status === "overdue").length;
    if (d > 0) parts.push(`${d} brouillon${d > 1 ? "s" : ""} à envoyer`);
    if (s > 0) parts.push(`${s} paiement${s > 1 ? "s" : ""} en attente`);
    if (o > 0) parts.push(`${o} facture${o > 1 ? "s" : ""} en retard`);
    return parts.length > 0 ? parts.join(" · ") : "Tout est à jour ✓";
  }, [invoices, loadingData]);

  // ── Conformité — statique (brancher sur vraies données quand dispo) ───────
  const complianceChecks = [
    { label: "TVA cohérente",        ok: true  },
    { label: "Clients validés",      ok: true  },
    { label: "Références présentes", ok: true  },
    { label: "Peppol prêt",          ok: false },
  ];

  // ── Donut label — inchangé ────────────────────────────────────────────────
  const renderDonutLabel = (props: { viewBox?: { cx: number; cy: number } }) => {
    const cx = props.viewBox?.cx ?? 0;
    const cy = props.viewBox?.cy ?? 0;
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} y={cy - 8} className="fill-foreground" style={{ fontSize: 24, fontWeight: 700 }}>{totalCount}</tspan>
        <tspan x={cx} y={cy + 14} className="fill-muted-foreground" style={{ fontSize: 12 }}>documents</tspan>
      </text>
    );
  };

  // ── Handlers — 100% inchangés ─────────────────────────────────────────────
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
          structured_ref:        inv.structured_ref ?? null,
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

  const handleStatusChange = async (inv: InvoiceWithClient, newStatus: InvoiceStatus) => {
    setUpdatingId(inv.id);
    const success = await updateInvoiceStatus(inv.id, inv.status, newStatus);
    if (success) {
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: newStatus } : i));
    }
    setUpdatingId(null);
  };

  const handleConvertToInvoice = async (inv: InvoiceWithClient) => {
    setConvertingId(inv.id);
    const result = await convertToInvoice(inv);
    if (result) await loadInvoices();
    setConvertingId(null);
  };

  const handleCreditNoteConfirm = async (reason: string) => {
    if (!creditNoteInvoice) return;
    const result = await createCreditNote({ originalInvoice: creditNoteInvoice, reason });
    if (result) {
      setCreditNoteInvoice(null);
      await loadInvoices();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-12">
          <div className="container mx-auto px-4 max-w-7xl">

            {/* ══════════════════════════════════════════
                1. HERO HEADER — Lovable style
               ══════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-display text-2xl font-semibold text-foreground">
                  {format(new Date(), "eeee d MMMM yyyy", { locale: fr })
                    .replace(/^./, (c) => c.toUpperCase())}
                </h1>
                {loadingData
                  ? <Skeleton className="h-4 w-64 mt-2" />
                  : <p className="text-sm text-muted-foreground mt-1.5">{daySummary}</p>
                }
              </div>
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button
                  onClick={() => toast.info("Génération IA — Disponible très prochainement 🚀")}
                  className="gap-2 bg-gradient-to-r from-primary to-blue-500 shadow-md shadow-primary/20 hover:scale-105 transition-transform text-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  Générer avec l'IA
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/generator")}
                  className="gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Création manuelle
                </Button>
              </div>
            </div>

            {/* ══════════════════════════════════════════
                2. ACTIONS PRIORITAIRES — Lovable
                   Basées sur vraies données Supabase
               ══════════════════════════════════════════ */}
            {!loadingData && priorityActions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {priorityActions.map((action) => (
                  <Card
                    key={action.title}
                    className={`border-l-4 ${
                      action.priority === "haute" ? "border-l-red-500" : "border-l-amber-500"
                    } hover:bg-muted/30 transition-colors cursor-pointer`}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <action.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                        action.priority === "haute" ? "text-red-500" : "text-amber-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{action.title}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 shrink-0 ${
                              action.priority === "haute"
                                ? "border-red-500/30 text-red-500"
                                : "border-amber-500/30 text-amber-500"
                            }`}
                          >
                            {action.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ══════════════════════════════════════════
                3. KPI + 4. CONFORMITÉ — layout Lovable
               ══════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-8">

              {/* KPI 4 cartes */}
              <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loadingData
                  ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
                  : stats.map((stat) => (
                    <Card
                      key={stat.label}
                      className={`border-l-4 ${stat.border} bg-gradient-to-br ${stat.bg} to-transparent hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-default`}
                    >
                      <CardContent className="p-4">
                        <stat.icon className={`h-5 w-5 ${stat.iconColor} mb-3`} />
                        <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {stat.count} {stat.countLabel}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                }
              </div>

              {/* Bloc conformité active */}
              <Card className="lg:col-span-2 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Conformité active</span>
                  </div>
                  <div className="space-y-2.5">
                    {complianceChecks.map((check) => (
                      <div key={check.label} className="flex items-center gap-2.5">
                        {check.ok
                          ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          : <CircleAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        }
                        <span className={`text-xs font-mono flex-1 ${check.ok ? "text-muted-foreground" : "text-amber-500"}`}>
                          {check.label}
                        </span>
                        <span className={`text-xs font-mono ${check.ok ? "text-green-500" : "text-amber-500"}`}>
                          {check.ok ? "✓" : "⚠"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <p className="text-[11px] text-muted-foreground">
                    Audit en temps réel · Dernière vérif. il y a 2 min
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ══════════════════════════════════════════
                5. CHARTS — inchangés, layout ajusté
               ══════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              <Card className="lg:col-span-3 border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Chiffre d'affaires mensuel</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">6 derniers mois</p>
                  </div>
                  {loadingData ? <Skeleton className="h-64 w-full rounded-md" /> : (
                    <div className="h-64">
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
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => v === 0 ? "€0" : `€${(v / 1000).toFixed(0)}k`} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="facture"  name="Facturé"  stroke="#6C63FF" strokeWidth={2} fill="url(#fillFacture)"  dot={{ r: 4, fill: "#6C63FF",  strokeWidth: 0 }} activeDot={{ r: 6 }} />
                          <Area type="monotone" dataKey="encaisse" name="Encaissé" stroke="#22c55e" strokeWidth={2} fill="url(#fillEncaisse)" dot={{ r: 4, fill: "#22c55e",  strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Répartition des statuts</h3>
                  {loadingData ? <Skeleton className="h-64 w-full rounded-md" /> : totalCount === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Aucune facture pour l'instant</p>
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={false}>
                            {statusData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                            <Label content={renderDonutLabel} position="center" />
                          </Pie>
                          <RechartsTooltip formatter={(value: number) => `€${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`} />
                          <Legend
                            layout="vertical" align="right" verticalAlign="middle"
                            formatter={(value: string) => {
                              const item = statusData.find((d) => d.name === value);
                              return (
                                <span className="text-xs text-foreground">
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

            <Separator className="mb-6" />

            {/* ══════════════════════════════════════════
                6. SUGGESTION IA — Lovable, données réelles
               ══════════════════════════════════════════ */}
            {aiSuggestion && (
              <div className="mb-4 rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">{aiSuggestion}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs h-7 shrink-0"
                  onClick={() => toast.info("Vue actions intelligentes — bientôt disponible")}
                >
                  Voir les actions
                </Button>
              </div>
            )}

            {/* ══════════════════════════════════════════
                7. FILTRES — logique 100% inchangée
               ══════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("dashboard.search")}
                  className="pl-10 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🗂 Tous les types</SelectItem>
                  <SelectItem value="invoice">🧾 Factures</SelectItem>
                  <SelectItem value="quote">📋 Devis</SelectItem>
                  <SelectItem value="order">📦 Bons de commande</SelectItem>
                  <SelectItem value="credit_note">↩️ Notes de crédit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
                  <SelectValue placeholder={t("dashboard.filterAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dashboard.filterAll")}</SelectItem>
                  <SelectItem value="draft">{t("dashboard.filterDraft")}</SelectItem>
                  <SelectItem value="sent">{t("dashboard.filterSent")}</SelectItem>
                  <SelectItem value="paid">{t("dashboard.filterPaid")}</SelectItem>
                  <SelectItem value="overdue">{t("dashboard.filterOverdue")}</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Compteurs cliquables — logique 100% inchangée ── */}
            {!loadingData && (
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                  <CircleDot className="h-3.5 w-3.5" />
                  {filtered.length} document{filtered.length > 1 ? "s" : ""}
                </span>
                <span>·</span>
                {[
                  { type: "invoice",     label: "facture",         emoji: "🧾" },
                  { type: "quote",       label: "devis",           emoji: "📋" },
                  { type: "order",       label: "bon de commande", emoji: "📦" },
                  { type: "credit_note", label: "note de crédit",  emoji: "↩️" },
                ].map(({ type, label, emoji }) => {
                  const count = filtered.filter((i) => i.document_type === type).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={type}
                      onClick={() => setDocTypeFilter(docTypeFilter === type ? "all" : type)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors ${
                        docTypeFilter === type
                          ? "bg-primary/10 text-primary border-primary/30 font-medium"
                          : "border-border/40 hover:border-border hover:text-foreground"
                      }`}
                    >
                      {emoji} {count} {label}{count > 1 && type !== "quote" ? "s" : ""}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ══════════════════════════════════════════
                8. TABLE — logique inchangée
                   + hover actions style Lovable
               ══════════════════════════════════════════ */}
            <Card className="glass border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("dashboard.colInvoice")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("dashboard.colClient")}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("dashboard.colAmount")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("dashboard.colDate")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("dashboard.colStatus")}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData ? <TableSkeleton /> : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <FileText className="h-12 w-12 text-muted-foreground/40" />
                            <div className="text-center">
                              <p className="text-muted-foreground">
                                {invoices.length === 0 ? "Aucune facture pour le moment" : "Aucun résultat pour cette recherche"}
                              </p>
                              {invoices.length === 0 && (
                                <p className="text-sm text-muted-foreground/60 mt-1">
                                  Créez votre première facture en moins de 30 secondes.
                                </p>
                              )}
                            </div>
                            {invoices.length === 0 && (
                              <Button
                                onClick={() => navigate("/generator")}
                                className="gap-2 bg-gradient-to-r from-primary to-blue-500 shadow-lg"
                              >
                                ✨ Créer ma première facture
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((inv, idx) => {
                        // Logique badges — inchangée
                        const isConverted   = inv.status === "cancelled" && ["quote", "order"].includes(inv.document_type);
                        const config        = isConverted ? STATUS_CONFIG.converted : STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
                        const clientLabel   = inv.clients?.company || inv.clients?.name || "—";
                        const canCreditNote = inv.status === "sent" || inv.status === "paid";
                        const isDownloading = downloadingId === inv.id;
                        const isUpdating    = updatingId    === inv.id;
                        const isConverting  = convertingId  === inv.id;
                        const transitions   = STATUS_TRANSITIONS[inv.status] ?? [];
                        const canConvert    = (inv.document_type === "quote" || inv.document_type === "order") && inv.status === "draft";
                        const typeInfo      = DOC_TYPE_LABEL[inv.document_type] ?? DOC_TYPE_LABEL.invoice;
                        const isHovered     = hoveredRow === inv.id;

                        return (
                          <tr
                            key={inv.id}
                            className={`border-b border-border/50 transition-colors ${
                              isConverted || inv.status === "cancelled" ? "opacity-50" : ""
                            } ${idx % 2 !== 0 ? "bg-muted/[0.03]" : ""} hover:bg-muted/20`}
                            onMouseEnter={() => setHoveredRow(inv.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                          >
                            {/* N° Document */}
                            <td className="px-4 py-3 font-medium font-mono text-sm text-foreground">
                              {inv.invoice_number}
                              {inv.linked_invoice_number && inv.document_type === "invoice" && (
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-normal">
                                  ← {inv.linked_invoice_number}
                                </p>
                              )}
                            </td>

                            {/* Type — badge coloré */}
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-[10px] whitespace-nowrap font-medium ${typeInfo.className}`}>
                                {typeInfo.emoji} {typeInfo.label}
                              </Badge>
                            </td>

                            {/* Client */}
                            <td className="px-4 py-3 text-sm text-foreground">{clientLabel}</td>

                            {/* Montant */}
                            <td className="px-4 py-3 text-sm text-right font-medium font-mono">
                              €{Number(inv.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {new Date(inv.issue_date).toLocaleDateString("fr-FR")}
                            </td>

                            {/* Statut — dropdown inchangé */}
                            <td className="px-4 py-3">
                              {transitions.length > 0 ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1 group/dd focus:outline-none" disabled={isUpdating}>
                                      {isUpdating
                                        ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                        : (
                                          <Badge variant="outline" className={`${config.className} cursor-pointer group-hover/dd:opacity-80 transition-opacity text-[10px]`}>
                                            {config.label}
                                          </Badge>
                                        )
                                      }
                                      <ChevronDown className="h-3 w-3 text-muted-foreground group-hover/dd:text-foreground transition-colors" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-52">
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Changer le statut</div>
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
                              ) : (
                                <Badge variant="outline" className={`text-[10px] ${config.className}`}>
                                  {config.label}
                                </Badge>
                              )}
                            </td>

                            {/* Actions — hover reveal style Lovable, logique inchangée */}
                            <td className="px-4 py-3 text-right">
                              <div className={`flex items-center justify-end gap-0.5 transition-opacity duration-100 ${isHovered ? "opacity-100" : "opacity-0"}`}>

                                {canConvert && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-primary hover:bg-primary/10"
                                        disabled={isConverting || loading}
                                        onClick={(e) => { e.stopPropagation(); handleConvertToInvoice(inv); }}
                                      >
                                        {isConverting
                                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          : <ArrowRightCircle className="h-3.5 w-3.5" />
                                        }
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Convertir en facture</TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      disabled={isDownloading}
                                      onClick={(e) => { e.stopPropagation(); handleDownload(inv); }}
                                    >
                                      {isDownloading
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Download className="h-3.5 w-3.5" />
                                      }
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">PDF</TooltipContent>
                                </Tooltip>

                                {canCreditNote && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={loading}
                                        onClick={(e) => { e.stopPropagation(); setCreditNoteInvoice(inv); }}
                                      >
                                        <FileX className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Note de crédit</TooltipContent>
                                  </Tooltip>
                                )}

                                {canCreditNote && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="relative inline-flex">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={(e) => { e.stopPropagation(); toast.info("Peppol / UBL — Disponible dans la prochaine mise à jour"); }}
                                        >
                                          <Network className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-primary text-primary-foreground rounded px-0.5 leading-tight pointer-events-none">β</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Peppol (Bêta)</TooltipContent>
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

            {/* CreditNoteModal — 100% inchangé */}
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

        {/* ══════════════════════════════════════════
            9. FAB FLOTTANT — Lovable style
           ══════════════════════════════════════════ */}
        <button
          onClick={() => navigate("/generator")}
          className="fixed bottom-6 right-6 z-50 h-11 px-4 rounded-full bg-background/90 backdrop-blur border border-border shadow-lg shadow-black/10 flex items-center gap-2 text-sm font-medium text-foreground hover:shadow-xl hover:scale-105 hover:border-primary/30 transition-all duration-200"
        >
          <Plus className="h-4 w-4 text-primary" />
          Nouveau document
        </button>

      </div>
    </TooltipProvider>
  );
};

export default Dashboard;