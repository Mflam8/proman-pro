import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileDown, ExternalLink } from "lucide-react";
import { openPdfFromBase64 } from "@/utils/openPdfFromBase64";

export default function GenerateInvoiceButton({ inquiry }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await base44.functions.invoke('generateInvoice', {
        inquiryId: inquiry.id,
        invoiceDate: invoiceDate
      });

      if (response.data.success) {
        await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
        await queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });

        if (response.data.pdf_base64) {
          openPdfFromBase64(response.data.pdf_base64, response.data.filename);
        } else if (response.data.pdf_url) {
          window.open(response.data.pdf_url, '_blank');
        } else {
          setError('No se pudo abrir la factura generada');
        }
      } else {
        setError(response.data?.details || response.data?.error || 'Error al generar factura');
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.details || err?.response?.data?.error || err.message;
      setError('Error al generar factura: ' + errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium text-proman-navy">Fecha de Factura</Label>
        <Input 
          type="date" 
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button 
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-proman-yellow text-proman-navy hover:opacity-90"
      >
        <FileDown className="w-4 h-4 mr-2" />
        {isGenerating ? 'Generando Factura...' : 'Generar Factura con IVA'}
      </Button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
      {inquiry.quote_pdf_url && (
        <a href={inquiry.quote_pdf_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <Button type="button" variant="outline" size="sm" className="w-full text-xs">
            <ExternalLink className="w-3 h-3 mr-1" />
            Ver Última Factura Generada
          </Button>
        </a>
      )}
    </div>
  );
}