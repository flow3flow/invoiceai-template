import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, User, Building2, FileText, CreditCard } from "lucide-react";
import type { InvoiceData, LineItem } from "@/types/invoice";
import { useLanguage } from "@/contexts/LanguageContext";

interface InvoiceFormProps {
  invoice: InvoiceData;
  onUpdate: (updates: Partial<InvoiceData>) => void;
}

export function InvoiceForm({ invoice, onUpdate }: InvoiceFormProps) {
  const { t } = useLanguage();

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...invoice.lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ lineItems: newItems });
  };

  const addLineItem = () => {
    onUpdate({ lineItems: [...invoice.lineItems, { description: "", quantity: 1, unitPrice: 0, vatRate: 21 }] });
  };

  const removeLineItem = (index: number) => {
    if (invoice.lineItems.length <= 1) return;
    onUpdate({ lineItems: invoice.lineItems.filter((_, i) => i !== index) });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onUpdate({ companyLogo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {t("form.yourInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("form.companyName")}</Label>
              <Input placeholder="Your Company" value={invoice.companyName} onChange={(e) => onUpdate({ companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("form.vatNumber")}</Label>
              <Input placeholder="BE0123456789" value={invoice.companyVat} onChange={(e) => onUpdate({ companyVat: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("form.address")}</Label>
            <Input placeholder="Street, City, Country" value={invoice.companyAddress} onChange={(e) => onUpdate({ companyAddress: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("form.email")}</Label>
              <Input type="email" placeholder="you@company.com" value={invoice.companyEmail} onChange={(e) => onUpdate({ companyEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("form.logo")}</Label>
              <Input type="file" accept="image/*" onChange={handleLogoUpload} className="cursor-pointer" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <User className="h-5 w-5 text-primary" />
            {t("form.clientInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("form.clientName")}</Label>
              <Input placeholder="Client Company" value={invoice.clientName} onChange={(e) => onUpdate({ clientName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("form.vatNumber")}</Label>
              <Input placeholder="FR12345678901" value={invoice.clientVat} onChange={(e) => onUpdate({ clientVat: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("form.address")}</Label>
            <Input placeholder="Street, City, Country" value={invoice.clientAddress} onChange={(e) => onUpdate({ clientAddress: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("form.email")}</Label>
            <Input type="email" placeholder="client@company.com" value={invoice.clientEmail} onChange={(e) => onUpdate({ clientEmail: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {t("form.invoiceDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("form.invoiceNumber")}</Label>
              <Input value={invoice.invoiceNumber} onChange={(e) => onUpdate({ invoiceNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("form.date")}</Label>
              <Input type="date" value={invoice.invoiceDate} onChange={(e) => onUpdate({ invoiceDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("form.paymentTerms")}</Label>
              <Select value={invoice.dueDate} onValueChange={(v) => onUpdate({ dueDate: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 {t("form.days")}</SelectItem>
                  <SelectItem value="30">30 {t("form.days")}</SelectItem>
                  <SelectItem value="60">60 {t("form.days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <Label className="text-base font-semibold">{t("form.lineItems")}</Label>
            {invoice.lineItems.map((item, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_80px_100px_100px_40px] items-end rounded-lg bg-secondary/30 p-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("form.description")}</Label>
                  <Input placeholder={t("form.description")} value={item.description} onChange={(e) => updateLineItem(index, "description", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("form.qty")}</Label>
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateLineItem(index, "quantity", Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("form.unitPrice")}</Label>
                  <Input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => updateLineItem(index, "unitPrice", Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("form.vat")}</Label>
                  <Select value={String(item.vatRate)} onValueChange={(v) => updateLineItem(index, "vatRate", Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                      <SelectItem value="21">21%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLineItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> {t("form.addService")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            {t("form.paymentNotes")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("form.iban")}</Label>
            <Input placeholder="BE68 5390 0754 7034" value={invoice.iban} onChange={(e) => onUpdate({ iban: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("form.notes")}</Label>
            <Textarea placeholder="..." value={invoice.notes} onChange={(e) => onUpdate({ notes: e.target.value })} rows={3} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
