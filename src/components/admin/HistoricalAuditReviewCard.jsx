import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Wrench, DollarSign, CheckCircle2, XCircle, Clock3 } from "lucide-react";

const money = (value) => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(value || 0));
const dateTime = (value) => value ? new Date(value).toLocaleString("es-SV") : "-";

const contractTone = {
  confirmado_en_sistema: "bg-emerald-100 text-emerald-800",
  probable: "bg-blue-100 text-blue-800",
  dudoso: "bg-amber-100 text-amber-800",
  sin_indicio: "bg-slate-100 text-slate-700"
};

const reviewTone = {
  confirmado: "bg-emerald-100 text-emerald-800",
  descartado: "bg-red-100 text-red-800",
  pendiente: "bg-amber-100 text-amber-800"
};

export default function HistoricalAuditReviewCard({ item, reviewStatus = "pendiente", onReview, saving }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-proman-navy">{item.detected_name || item.customer_name || "Conversación sin nombre"}</span>
              <Badge className={contractTone[item.contract_status] || contractTone.sin_indicio}>{item.contract_status_label}</Badge>
              <Badge className={reviewTone[reviewStatus] || reviewTone.pendiente}>Revisión: {reviewStatus}</Badge>
            </div>
            <p className="mt-2 text-sm text-gray-600">{item.audit_summary}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onReview(item, "confirmado")} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />Confirmar
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReview(item, "descartado")} disabled={saving} className="border-red-200 text-red-700 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-2" />Descartar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 font-semibold text-proman-navy"><Phone className="w-4 h-4 text-proman-yellow" />Teléfono</div>
            <p className="mt-1 text-gray-700">{item.detected_phone || item.phone || "No detectado"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 font-semibold text-proman-navy"><MapPin className="w-4 h-4 text-proman-yellow" />Dirección</div>
            <p className="mt-1 text-gray-700">{item.detected_address || "No detectada"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 font-semibold text-proman-navy"><Wrench className="w-4 h-4 text-proman-yellow" />Servicio</div>
            <p className="mt-1 text-gray-700">{item.detected_service || "No detectado"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 font-semibold text-proman-navy"><DollarSign className="w-4 h-4 text-proman-yellow" />Monto</div>
            <p className="mt-1 text-gray-700">Chat: {item.chat_amount ? money(item.chat_amount) : "-"}</p>
            <p className="text-xs text-gray-500">Sistema: {item.system_amount ? money(item.system_amount) : "-"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border bg-white p-3">
            <div className="flex items-center gap-2 font-semibold text-proman-navy"><Clock3 className="w-4 h-4 text-proman-yellow" />Actividad</div>
            <p className="mt-1 text-gray-700">{item.message_count} mensaje(s) en el mes</p>
            <p className="text-xs text-gray-500">Último: {dateTime(item.latest_message_at)}</p>
          </div>
          <div className="rounded-xl border bg-white p-3">
            <div className="font-semibold text-proman-navy">Trabajo relacionado</div>
            <p className="mt-1 text-gray-700">{item.linked_inquiry_count} trabajo(s) vinculado(s)</p>
            <p className="text-xs text-gray-500">Pago registrado: {money(item.recorded_amount)}</p>
          </div>
          <div className="rounded-xl border bg-white p-3">
            <div className="font-semibold text-proman-navy">Razones</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {(item.flags || []).length ? item.flags.map((flag) => <Badge key={flag} variant="outline">{flag}</Badge>) : <span className="text-gray-500">Sin señales fuertes</span>}
            </div>
          </div>
        </div>

        {(item.evidence_snippets || []).length > 0 && (
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-proman-navy mb-3">Fragmentos clave del chat</p>
            <div className="space-y-2">
              {item.evidence_snippets.map((snippet, index) => (
                <div key={`${item.review_key}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700">
                  {snippet}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}