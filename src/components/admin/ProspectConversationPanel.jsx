import React from "react";
import WhatsAppConversationPanel from "@/components/admin/WhatsAppConversationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProspectConversationPanel({ customer, latestMessage, inquiry }) {
  return (
    <div className="space-y-4">
      <Card className="border-2 border-amber-400 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Prospecto en conversación</span>
            <Badge className="bg-amber-500 text-white">Sin trabajo creado</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div><span className="font-semibold">Nombre:</span> {customer?.full_name || inquiry?.client_name || "Sin nombre"}</div>
          <div><span className="font-semibold">Teléfono:</span> {customer?.phone || inquiry?.phone || "—"}</div>
          <div><span className="font-semibold">Estado:</span> {inquiry?.status || "nuevo"}</div>
          <div><span className="font-semibold">Servicio:</span> {inquiry?.service_type || "Por definir"}</div>
          <div className="md:col-span-2"><span className="font-semibold">Último mensaje:</span> {latestMessage?.text || latestMessage?.texto_mensaje || "Sin mensaje visible"}</div>
        </CardContent>
      </Card>

      <WhatsAppConversationPanel
        customerId={customer?.id || inquiry?.customer_id}
        inquiryId={inquiry?.id}
        phone={customer?.phone || inquiry?.phone}
      />
    </div>
  );
}