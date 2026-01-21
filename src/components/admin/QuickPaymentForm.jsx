import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera } from "lucide-react";

export default function QuickPaymentForm({ onSubmit, isSubmitting, onCancel }) {
  const [formData, setFormData] = useState({
    amount_paid: "",
    mano_de_obra: "",
    materiales: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "efectivo",
    transaction_id: "",
    confirmation_url: "",
    notes: ""
  });
  const [confirmationFile, setConfirmationFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, confirmation_url: file_url }));
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (confirmationFile) {
      handleFileUpload(confirmationFile);
    }
  }, [confirmationFile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const manoDeObra = parseFloat(formData.mano_de_obra) || 0;
    const materiales = parseFloat(formData.materiales) || 0;
    const total = manoDeObra + materiales;
    
    onSubmit({
      ...formData,
      amount_paid: total,
      mano_de_obra: manoDeObra,
      materiales: materiales
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-proman-navy">Desglose del Pago</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-proman-navy mb-2">
              Mano de Obra ($) *
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.mano_de_obra}
              onChange={(e) => setFormData({ ...formData, mano_de_obra: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sobre este monto se calculan porcentajes del técnico
            </p>
          </div>

          <div>
            <Label className="block text-sm font-medium text-proman-navy mb-2">
              Materiales ($)
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.materiales}
              onChange={(e) => setFormData({ ...formData, materiales: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Siempre se registra íntegro
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded p-3 border-2 border-green-500">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total a Pagar:</span>
            <span className="text-2xl font-bold text-green-600">
              ${((parseFloat(formData.mano_de_obra) || 0) + (parseFloat(formData.materiales) || 0)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Fecha de Pago *
        </Label>
        <Input
          type="date"
          required
          value={formData.payment_date}
          onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
        />
      </div>

      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Método de Pago *
        </Label>
        <Select
          value={formData.payment_method}
          onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="transferencia">Transferencia</SelectItem>
            <SelectItem value="deposito">Depósito</SelectItem>
            <SelectItem value="tarjeta">Tarjeta</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          ID de Transacción (Opcional)
        </Label>
        <Input
          value={formData.transaction_id}
          onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
          placeholder="Ej: TRANS-12345"
        />
      </div>

      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Comprobante de Pago (Opcional)
        </Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          {formData.confirmation_url ? (
            <div className="space-y-2">
              <img 
                src={formData.confirmation_url} 
                alt="Comprobante" 
                className="max-h-32 mx-auto rounded"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFormData({ ...formData, confirmation_url: "" })}
              >
                Cambiar imagen
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Camera className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">Subir captura o recibo</p>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setConfirmationFile(e.target.files[0])}
                disabled={isUploading}
                className="cursor-pointer"
              />
              {isUploading && <p className="text-xs text-blue-600">Subiendo...</p>}
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Notas (Opcional)
        </Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Información adicional sobre el pago..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-proman-yellow text-proman-navy hover:opacity-90"
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? "Registrando..." : "Registrar Pago"}
        </Button>
      </div>
    </form>
  );
}