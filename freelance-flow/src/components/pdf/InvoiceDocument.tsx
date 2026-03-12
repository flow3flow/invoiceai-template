import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
  } from "@react-pdf/renderer";
  
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
    subtotal: number;
    vat_amount: number;
    total: number;
    notes: string | null;
    items: PdfInvoiceItem[];
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
    green: "#16A34A",
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
  
    notesSection: {
      marginTop: 32,
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
  
  const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
  
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-BE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  
  const buildAddress = (
    street: string | null,
    zip: string | null,
    city: string | null,
    country: string | null
  ): string =>
    [street, [zip, city].filter(Boolean).join(" "), country]
      .filter(Boolean)
      .join("\n");
  
  export const InvoiceDocument = ({
    invoice,
    issuer,
    client,
  }: InvoiceDocumentProps) => {
    const issuerAddress = buildAddress(
      issuer.street,
      issuer.zip_code,
      issuer.city,
      issuer.country_code
    );
  
    const clientLabel = client.company || client.name;
    const clientAddress = buildAddress(
      client.street,
      client.zip_code,
      client.city,
      client.country_code
    );
  
    return (
      <Document>
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <View style={s.companyBlock}>
              <Text style={s.companyName}>{issuer.company_name}</Text>
              {issuerAddress ? <Text style={s.companyMeta}>{issuerAddress}</Text> : null}
              {issuer.vat_number ? <Text style={s.companyMeta}>TVA {issuer.vat_number}</Text> : null}
              {issuer.email ? <Text style={s.companyMeta}>{issuer.email}</Text> : null}
            </View>
  
            <View style={s.invoiceBadge}>
              <Text style={s.invoiceBadgeText}>FACTURE</Text>
            </View>
          </View>
  
          <View style={s.accentDivider} />
  
          <View style={s.metaRow}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>N° Facture</Text>
              <Text style={s.metaValueBold}>{invoice.invoice_number}</Text>
            </View>
  
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Date d'émission</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.issue_date)}</Text>
            </View>
  
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Date d'échéance</Text>
              <Text style={s.metaValue}>
                {invoice.due_date ? fmtDate(invoice.due_date) : "À réception"}
              </Text>
            </View>
  
            <View style={[s.metaBlock, { flex: 2 }]}>
              <Text style={s.metaLabel}>Facturé à</Text>
              <Text style={s.metaValueBold}>{clientLabel}</Text>
              {client.company && client.name !== clientLabel ? (
                <Text style={s.metaValueSmall}>{client.name}</Text>
              ) : null}
              {clientAddress ? <Text style={s.metaValueSmall}>{clientAddress}</Text> : null}
              {client.vat_number ? <Text style={s.metaValueSmall}>TVA {client.vat_number}</Text> : null}
              {client.email ? <Text style={s.metaValueSmall}>{client.email}</Text> : null}
            </View>
          </View>
  
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
                <Text style={[s.tdText, s.colQty]}>
                  {Number(item.quantity).toLocaleString("fr-BE")}
                </Text>
                <Text style={[s.tdText, s.colUnit]}>{fmt(item.unit_price)}</Text>
                <Text style={[s.tdTextMuted, s.colVat]}>{item.vat_rate}%</Text>
                <Text style={[s.tdText, s.colTotal]}>{fmt(lineTotal)}</Text>
              </View>
            );
          })}
  
          <View style={s.totalsSection}>
            <View style={s.totalsBox}>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Sous-total HT</Text>
                <Text style={s.totalsValue}>{fmt(invoice.subtotal)}</Text>
              </View>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>TVA</Text>
                <Text style={s.totalsValue}>{fmt(invoice.vat_amount)}</Text>
              </View>
              <View style={s.totalsDivider} />
              <View style={s.totalsRow}>
                <Text style={s.totalLabel}>Total TTC</Text>
                <Text style={s.totalValue}>{fmt(invoice.total)}</Text>
              </View>
            </View>
          </View>
  
          {issuer.iban ? (
            <View style={[s.notesSection, { marginTop: 24 }]}>
              <Text style={s.notesLabel}>Coordonnées bancaires</Text>
              <Text style={s.notesText}>IBAN : {issuer.iban}</Text>
            </View>
          ) : null}
  
          {invoice.notes ? (
            <View style={s.notesSection}>
              <Text style={s.notesLabel}>Notes</Text>
              <Text style={s.notesText}>{invoice.notes}</Text>
            </View>
          ) : null}
  
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