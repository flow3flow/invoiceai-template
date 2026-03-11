export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface InvoiceData {
  companyName: string;
  companyAddress: string;
  companyVat: string;
  companyEmail: string;
  companyLogo: string | null;
  clientName: string;
  clientAddress: string;
  clientVat: string;
  clientEmail: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: LineItem[];
  notes: string;
  paymentMethod: string;
  iban: string;
}
