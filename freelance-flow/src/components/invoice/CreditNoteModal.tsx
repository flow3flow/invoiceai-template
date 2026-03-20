// src/components/invoice/CreditNoteModal.tsx

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

export interface CreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  originalTotal: number;
  documentLabel?: string;
}

const CreditNoteModal = ({
  isOpen,
  onClose,
  onConfirm,
  originalInvoiceNumber,
  originalInvoiceDate,
  originalTotal,
  documentLabel = "Note de crédit",
}: CreditNoteModalProps) => {
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setShowError(false);
    }
  }, [isOpen]);

  const handleCancel = () => {
    setReason("");
    setShowError(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!reason.trim()) {
      setShowError(true);
      return;
    }
    onConfirm(reason.trim());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Émettre une {documentLabel}</DialogTitle>
          <DialogDescription>
            Réf. facture : {originalInvoiceNumber} du {originalInvoiceDate} —{" "}
            {originalTotal.toFixed(2)} €
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Cette action est irréversible. Une {documentLabel} sera générée et la
            facture originale passera en statut annulé.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="credit-note-reason">Motif de la correction</Label>
          <Textarea
            id="credit-note-reason"
            placeholder="Ex : Erreur de montant, prestation annulée..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setShowError(false);
            }}
          />
          {showError && (
            <p className="text-sm text-destructive">Ce champ est requis</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={handleConfirm}
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreditNoteModal;