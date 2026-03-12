import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Plus, Search, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Label,
} from "recharts";

const revenueData = [
  { month: "Oct", facture: 8200, encaisse: 6100 },
  { month: "Nov", facture: 9400, encaisse: 7800 },
  { month: "Déc", facture: 7600, encaisse: 6900 },
  { month: "Jan", facture: 10200, encaisse: 8500 },
  { month: "Fév", facture: 11800, encaisse: 9200 },
  { month: "Mar", facture: 12500, encaisse: 6550 },
];

const statusData = [
  { name: "Payé", value: 6550, color: "#22c55e" },
  { name: "Envoyé", value: 2750, color: "#3b82f6" },
  { name: "En retard", value: 3200, color: "#ef4444" },
  { name: "Brouillon", value: 950, color: "#9ca3af" },
];

const totalInvoices = 5;

const mockInvoices = [
  { id: "INV-2026-001", client: "Acme Corp", amount: 2450.0, date: "2026-03-01", status: "paid" as const },
  { id: "INV-2026-002", client: "TechStart BVBA", amount: 1800.0, date: "2026-03-05", status: "sent" as const },
  { id: "INV-2026-003", client: "Design Studio SRL", amount: 3200.0, date: "2026-02-15", status: "overdue" as const },
  { id: "INV-2026-004", client: "Freelance Hub", amount: 950.0, date: "2026-03-07", status: "draft" as const },
  { id: "INV-2026-005", client: "Cloud Nine SARL", amount: 4100.0, date: "2026-02-28", status: "paid" as const },
];

const statusConfig = {
  draft: { key: "dashboard.statusDraft", className: "bg-muted text-muted-foreground" },
  sent: { key: "dashboard.statusSent", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  paid: { key: "dashboard.statusPaid", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  overdue: { key: "dashboard.statusOverdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: €{entry.value.toLocaleString("fr-FR")}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const renderDonutLabel = (props: any) => {
  const { viewBox } = props;
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} y={cy - 8} className="fill-foreground" style={{ fontSize: 24, fontWeight: 700 }}>
        {totalInvoices}
      </tspan>
      <tspan x={cx} y={cy + 14} className="fill-muted-foreground" style={{ fontSize: 12 }}>
        factures
      </tspan>
    </text>
  );
};

const Dashboard = () => {
  const { t } = useLanguage();

  const stats = [
    { label: t("dashboard.totalInvoiced"), value: "€12,500", icon: DollarSign, color: "text-primary" },
    { label: t("dashboard.paid"), value: "€6,550", icon: CheckCircle, color: "text-green-500" },
    { label: t("dashboard.pending"), value: "€2,750", icon: Clock, color: "text-blue-500" },
    { label: t("dashboard.overdue"), value: "€3,200", icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="glass border-border/50">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`${stat.color}`}>
                    <stat.icon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-display font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analytics Section */}
          <div className="mb-8">
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold text-foreground">Vue d'ensemble</h2>
              <p className="text-sm text-muted-foreground">6 derniers mois</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Area Chart - 60% */}
              <Card className="lg:col-span-3 border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-display font-semibold text-foreground mb-4">Chiffre d'affaires mensuel</h3>
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
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="facture" name="Facturé" stroke="#6C63FF" strokeWidth={2} fill="url(#fillFacture)" dot={{ r: 4, fill: "#6C63FF", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        <Area type="monotone" dataKey="encaisse" name="Encaissé" stroke="#22c55e" strokeWidth={2} fill="url(#fillEncaisse)" dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Donut Chart - 40% */}
              <Card className="lg:col-span-2 border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-display font-semibold text-foreground mb-4">Répartition des statuts</h3>
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
                        <Tooltip formatter={(value: number) => `€${value.toLocaleString("fr-FR")}`} />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          formatter={(value: string, entry: any) => {
                            const item = statusData.find((d) => d.name === value);
                            return (
                              <span className="text-sm text-foreground">
                                {value} — <span className="font-medium">€{item?.value.toLocaleString("fr-FR")}</span>
                              </span>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("dashboard.search")} className="pl-10" />
            </div>
            <Select defaultValue="all">
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
                  {mockInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer">
                      <td className="p-4 font-medium font-display">{inv.id}</td>
                      <td className="p-4">{inv.client}</td>
                      <td className="p-4 text-right font-medium">€{inv.amount.toFixed(2)}</td>
                      <td className="p-4 text-muted-foreground">{new Date(inv.date).toLocaleDateString("en-GB")}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={statusConfig[inv.status].className}>
                          {t(statusConfig[inv.status].key)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
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
