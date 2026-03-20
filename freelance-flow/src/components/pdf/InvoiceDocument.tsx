import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  qualifyVatScenario,
  legalMentionsResolver,
  type VatScenario,
  type CountryCode,
} from "@/lib/vatScenario";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface PdfBusinessProfile {
  company_name: string;
  vat_number: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  country_code: string;
  email: string | null;
  iban: string | null;
}

export interface PdfClient {
  name: string;
  company: string | null;
  email: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  country_code: string | null;
  vat_number: string | null;
}

export interface PdfInvoice {
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  // Date de prestation/livraison — obligatoire légalement si différente de issue_date
  service_date?: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  items: PdfInvoiceItem[];
  // Scénario TVA — alimente le resolver de mentions légales
  vat_scenario?: VatScenario | null;
  // Schéma TVA de l'émetteur snapshottté à la création
  issuer_vat_scheme?: "normal" | "franchise" | "micro_fr" | "exempt_art44" | null;
  // Type de document — détermine le badge et le comportement d'affichage
  document_type?: "invoice" | "credit_note" | "quote";
  // Référence facture d'origine (note de crédit uniquement)
  linked_invoice_number?: string | null;
}

export interface InvoiceDocumentProps {
  invoice: PdfInvoice;
  issuer: PdfBusinessProfile;
  client: PdfClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  black: "#0F0F0F",
  gray900: "#1A1A1A",
  gray600: "#4B5563",
  gray400: "#9CA3AF",
  gray200: "#E5E7EB",
  gray50: "#F9FAFB",
  accent: "#6C63FF",
  accentMid: "#EEF0FF",
  accentRed: "#FEE2E2",
  accentRedText: "#DC2626",
  green: "#16A34A",
  amber: "#D97706",
  amberMid: "#FEF3C7",
  white: "#FFFFFF",
} as const;

const PAGE_H_PADDING = 48;
const PAGE_V_PADDING = 48;

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.gray900,
    backgroundColor: C.white,
    paddingHorizontal: PAGE_H_PADDING,
    paddingVertical: PAGE_V_PADDING,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 40,
  },
  companyBlock: {
    flexDirection: "column",
    gap: 2,
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.black,
    letterSpacing: -0.3,
  },
  companyMeta: {
    fontSize: 9,
    color: C.gray600,
    lineHeight: 1.5,
  },

  // ── Badges document
  invoiceBadge: {
    backgroundColor: C.accentMid,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  invoiceBadgeText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 0.5,
  },
  creditNoteBadge: {
    backgroundColor: C.accentRed,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  creditNoteBadgeText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.accentRedText,
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    backgroundColor: C.gray200,
    marginBottom: 28,
  },
  accentDivider: {
    height: 2,
    backgroundColor: C.accent,
    marginBottom: 28,
    width: 48,
    borderRadius: 2,
  },
  accentDividerRed: {
    height: 2,
    backgroundColor: C.accentRedText,
    marginBottom: 28,
    width: 48,
    borderRadius: 2,
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 36,
    gap: 24,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 10,
    color: C.gray900,
    lineHeight: 1.5,
  },
  metaValueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  metaValueSmall: {
    fontSize: 9,
    color: C.gray600,
    lineHeight: 1.6,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.gray50,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    alignItems: "center",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1.5, textAlign: "right" },
  colVat: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },

  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tdText: {
    fontSize: 9.5,
    color: C.gray900,
  },
  tdTextMuted: {
    fontSize: 9,
    color: C.gray600,
  },

  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  totalsBox: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 9.5,
    color: C.gray600,
  },
  totalsValue: {
    fontSize: 9.5,
    color: C.gray900,
  },
  totalsDivider: {
    height: 1,
    backgroundColor: C.gray200,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  totalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
  },
  totalValueRed: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.accentRedText,
  },

  // ── Mention légale TVA — obligatoire selon scénario
  legalMentionBlock: {
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    paddingLeft: 10,
    paddingVertical: 4,
  },
  legalMentionBlockWarning: {
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: C.amber,
    paddingLeft: 10,
    paddingVertical: 4,
    backgroundColor: C.amberMid,
    borderRadius: 4,
  },
  legalMentionText: {
    fontSize: 8.5,
    color: C.gray600,
    lineHeight: 1.5,
  },
  legalMentionRef: {
    fontSize: 7.5,
    color: C.gray400,
    marginTop: 2,
  },

  // ── Référence facture d'origine (note de crédit)
  linkedInvoiceBlock: {
    marginTop: 12,
    flexDirection: "row",
    gap: 6,
  },
  linkedInvoiceLabel: {
    fontSize: 8.5,
    color: C.gray600,
    fontFamily: "Helvetica-Bold",
  },
  linkedInvoiceValue: {
    fontSize: 8.5,
    color: C.gray900,
  },

  notesSection: {
    marginTop: 24,
    backgroundColor: C.gray50,
    borderRadius: 6,
    padding: 14,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9.5,
    color: C.gray600,
    lineHeight: 1.6,
  },

  footer: {
    position: "absolute",
    bottom: PAGE_V_PADDING,
    left: PAGE_H_PADDING,
    right: PAGE_H_PADDING,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 8,
    color: C.gray400,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers formatage — SANS Intl ni toLocaleString (instables en contexte PDF)
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number): string => {
  const fixed = Math.round(n * 100) / 100;
  const [int, dec] = fixed.toFixed(2).split(".");
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${intFormatted},${dec} \u20AC`;
};

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS_FR[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
};

const fmtQty = (n: number): string => {
  const fixed = Math.round(n * 1000) / 1000;
  return fixed % 1 === 0
    ? String(fixed)
    : fixed.toString().replace(".", ",");
};

const buildAddress = (
  street: string | null,
  zip: string | null,
  city: string | null,
  country: string | null,
): string =>
  [street, [zip, city].filter(Boolean).join(" "), country]
    .filter(Boolean)
    .join("\n");

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export const InvoiceDocument = ({
  invoice,
  issuer,
  client,
}: InvoiceDocumentProps) => {
  const isCreditNote = invoice.document_type === "credit_note";

  // ── Résolution du scénario TVA et des mentions légales
  // Priorité : vat_scenario explicite snapshottté > qualification automatique
  const resolvedScenario = invoice.vat_scenario
    ? invoice.vat_scenario
    : qualifyVatScenario({
        sellerCountry: issuer.country_code as CountryCode,
        sellerVatScheme: invoice.issuer_vat_scheme ?? "normal",
        buyerCountry: client.country_code ?? issuer.country_code,
        buyerIsVatLiable: !!client.vat_number,
        supplyType: "services",
      });

  const vatResult = legalMentionsResolver(resolvedScenario, invoice.subtotal);

  // ── Adresses
  const issuerAddress = buildAddress(
    issuer.street,
    issuer.zip_code,
    issuer.city,
    issuer.country_code,
  );
  const clientLabel = client.company || client.name;
  const clientAddress = buildAddress(
    client.street,
    client.zip_code,
    client.city,
    client.country_code,
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{issuer.company_name}</Text>
            {issuerAddress ? (
              <Text style={s.companyMeta}>{issuerAddress}</Text>
            ) : null}
            {issuer.vat_number ? (
              <Text style={s.companyMeta}>TVA {issuer.vat_number}</Text>
            ) : null}
            {issuer.email ? (
              <Text style={s.companyMeta}>{issuer.email}</Text>
            ) : null}
          </View>

          {isCreditNote ? (
            <View style={s.creditNoteBadge}>
              <Text style={s.creditNoteBadgeText}>NOTE DE CRÉDIT</Text>
            </View>
          ) : (
            <View style={s.invoiceBadge}>
              <Text style={s.invoiceBadgeText}>FACTURE</Text>
            </View>
          )}
        </View>

        <View style={isCreditNote ? s.accentDividerRed : s.accentDivider} />

        {/* ── Référence facture d'origine (note de crédit uniquement) */}
        {isCreditNote && invoice.linked_invoice_number ? (
          <View style={s.linkedInvoiceBlock}>
            <Text style={s.linkedInvoiceLabel}>Réf. facture annulée :</Text>
            <Text style={s.linkedInvoiceValue}>{invoice.linked_invoice_number}</Text>
          </View>
        ) : null}

        {/* ── Métadonnées ───────────────────────────────────────── */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>
              {isCreditNote ? "N° Note de crédit" : "N° Facture"}
            </Text>
            <Text style={s.metaValueBold}>{invoice.invoice_number}</Text>
          </View>

          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Date d'émission</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.issue_date)}</Text>
          </View>

          {/* Date de prestation — obligatoire légalement si différente de issue_date */}
          {invoice.service_date &&
          invoice.service_date !== invoice.issue_date ? (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Date de prestation</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.service_date)}</Text>
            </View>
          ) : null}

          {!isCreditNote ? (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Date d'échéance</Text>
              <Text style={s.metaValue}>
                {invoice.due_date ? fmtDate(invoice.due_date) : "À réception"}
              </Text>
            </View>
          ) : null}

          <View style={[s.metaBlock, { flex: 2 }]}>
            <Text style={s.metaLabel}>Facturé à</Text>
            <Text style={s.metaValueBold}>{clientLabel}</Text>
            {client.company && client.name !== clientLabel ? (
              <Text style={s.metaValueSmall}>{client.name}</Text>
            ) : null}
            {clientAddress ? (
              <Text style={s.metaValueSmall}>{clientAddress}</Text>
            ) : null}
            {client.vat_number ? (
              <Text style={s.metaValueSmall}>TVA {client.vat_number}</Text>
            ) : null}
            {client.email ? (
              <Text style={s.metaValueSmall}>{client.email}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Table des lignes ──────────────────────────────────── */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colDesc]}>Description</Text>
          <Text style={[s.thText, s.colQty]}>Qté</Text>
          <Text style={[s.thText, s.colUnit]}>Prix unit.</Text>
          <Text style={[s.thText, s.colVat]}>TVA</Text>
          <Text style={[s.thText, s.colTotal]}>Montant HT</Text>
        </View>

        {invoice.items.map((item, idx) => {
          const lineTotal = item.quantity * item.unit_price;
          const isLast = idx === invoice.items.length - 1;
          return (
            <View
              key={idx}
              style={[s.tableRow, isLast ? s.tableRowLast : {}]}
              wrap={false}
            >
              <Text style={[s.tdText, s.colDesc]}>{item.description}</Text>
              <Text style={[s.tdText, s.colQty]}>{fmtQty(item.quantity)}</Text>
              <Text style={[s.tdText, s.colUnit]}>{fmt(item.unit_price)}</Text>
              <Text style={[s.tdTextMuted, s.colVat]}>{item.vat_rate}%</Text>
              <Text style={[s.tdText, s.colTotal]}>{fmt(lineTotal)}</Text>
            </View>
          );
        })}

        {/* ── Totaux ────────────────────────────────────────────── */}
        <View style={s.totalsSection}>
          <View style={s.totalsBox}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Sous-total HT</Text>
              <Text style={s.totalsValue}>{fmt(invoice.subtotal)}</Text>
            </View>

            {/* Si autoliquidation : TVA = 0 et on l'explique */}
            {vatResult.vatDueByCustomer ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>TVA</Text>
                <Text style={s.totalsValue}>0,00 € (autoliquidation)</Text>
              </View>
            ) : (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>TVA</Text>
                <Text style={s.totalsValue}>{fmt(invoice.vat_amount)}</Text>
              </View>
            )}

            <View style={s.totalsDivider} />
            <View style={s.totalsRow}>
              <Text style={s.totalLabel}>
                {isCreditNote ? "Total à rembourser" : "Total TTC"}
              </Text>
              <Text style={isCreditNote ? s.totalValueRed : s.totalValue}>
                {fmt(invoice.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Mention légale TVA — OBLIGATOIRE selon scénario ───── */}
        {/* Base légale : AR n°1 art. 53 §§3-4 (BE) | CGI art. 289 + BOFiP (FR) */}
        {vatResult.legalMention ? (
          <View style={s.legalMentionBlock}>
            <Text style={s.legalMentionText}>{vatResult.legalMention}</Text>
            {vatResult.legalRef ? (
              <Text style={s.legalMentionRef}>{vatResult.legalRef}</Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Mention note de crédit BE — AR n°1 art. 54 ──────────── */}
        {isCreditNote && issuer.country_code === "BE" ? (
          <View style={s.legalMentionBlock}>
            <Text style={s.legalMentionText}>
              TVA à reverser à l&apos;État dans la mesure où elle a été initialement déduite
            </Text>
            <Text style={s.legalMentionRef}>AR n°1, art. 54</Text>
          </View>
        ) : null}

        {/* ── Mention note de crédit FR — CGI art. 289 I-5 ──────────── */}
        {isCreditNote && issuer.country_code === "FR" && invoice.linked_invoice_number ? (
          <View style={s.legalMentionBlock}>
            <Text style={s.legalMentionText}>
              Document annulant et remplaçant la facture n° {invoice.linked_invoice_number}
              {invoice.linked_invoice_number ? "" : ""}
            </Text>
            <Text style={s.legalMentionRef}>CGI art. 289 I-5 | BOFiP TVA-DECLA-30-20-20</Text>
          </View>
        ) : null}

        {/* ── IBAN ──────────────────────────────────────────────── */}
        {issuer.iban ? (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Coordonnées bancaires</Text>
            <Text style={s.notesText}>IBAN : {issuer.iban}</Text>
          </View>
        ) : null}

        {/* ── Notes ─────────────────────────────────────────────── */}
        {invoice.notes ? (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── Footer ────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {issuer.company_name}
            {issuer.vat_number ? ` · TVA ${issuer.vat_number}` : ""}
          </Text>
          <Text style={s.footerText}>{invoice.invoice_number}</Text>
        </View>

      </Page>
    </Document>
  );
};