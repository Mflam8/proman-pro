import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Wand2 } from "lucide-react";

function extractQuotedItems(messages = []) {
  const priceRegex = /\$\s*([\d,]+(?:\.\d{2})?)/;

  return messages
    .filter((msg) => msg.direction === "outbound")
    .flatMap((msg) => (msg.text || msg.texto_mensaje || "").split("\n"))
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") && priceRegex.test(line))
    .map((line) => {
      const match = line.match(priceRegex);
      const amount = match ? Number(match[1].replace(/,/g, "")) : 0;
      const description = line.replace(/^-\s*/, "").replace(/\s*\$\s*[\d,]+(?:\.\d{2})?.*$/i, "").trim();
      return {
        descripcion: description,
        precio_unitario: amount,
      };
    })
    .filter((item) => item.descripcion && item.precio_unitario > 0);
}

export default function WhatsAppQuoteActions({ inquiryId, customerId, phone }) {
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["waQuoteMessages", inquiryId, customerId, phone],
    queryFn: async () => {
      const byCustomer = customerId ? await base44.entities.BitacoraWhatsApp.filter({ customer_id: customerId }, "timestamp") : [];
      const byJob = inquiryId ? await base44.entities.BitacoraWhatsApp.filter({ trabajo_id: inquiryId }, "timestamp") : [];
      const byPhone = phone ? await base44.entities.BitacoraWhatsApp.filter({ phone }, "timestamp") : [];
      const merged = [...byCustomer, ...byJob, ...byPhone];
      return Array.from(new Map(merged.map((item) => [item.id, item])).values());
    },
    enabled: !!inquiryId,
    initialData: [],
  });

  const quoteItems = React.useMemo(() => extractQuotedItems(messages), [messages]);

  const createQuoteItems = useMutation({
    mutationFn: async () => {
      const existing = await base44.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId });
      const existingDescriptions = new Set(existing.map((item) => (item.descripcion || "").toLowerCase()));
      const newItems = quoteItems.filter((item) => !existingDescriptions.has(item.descripcion.toLowerCase()));

      if (newItems.length === 0) return { created: 0 };

      await base44.entities.DetalleFacturaTrabajo.bulkCreate(
        newItems.map((item, index) => ({
          inquiry_id: inquiryId,
          opcion_numero: 1,
          tipo_item: "servicio",
          descripcion: item.descripcion,
          descripcion_detallada: item.descripcion,
          cantidad: 1,
          unidad_medida: "unidad",
          precio_unitario: item.precio_unitario,
          monto_total_item: item.precio_unitario,
          es_cotizacion: true,
          incluir_iva: false,
          orden: index,
        }))
      );

      return { created: newItems.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingItems", inquiryId] });
    },
  });

  if (quoteItems.length === 0) return null;

  return (
    <Card className="border-2 border-amber-300 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-4 h-4" />
          Cotización detectada en WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {quoteItems.map((item, index) => (
            <div key={`${item.descripcion}-${index}`} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
              <span>{item.descripcion}</span>
              <Badge className="bg-emerald-100 text-emerald-800">${item.precio_unitario.toFixed(2)}</Badge>
            </div>
          ))}
        </div>
        <Button onClick={() => createQuoteItems.mutate()} disabled={createQuoteItems.isPending} className="bg-proman-yellow text-proman-navy hover:opacity-90">
          {createQuoteItems.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Pasar a cotización
        </Button>
      </CardContent>
    </Card>
  );
}