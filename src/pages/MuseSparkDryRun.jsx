import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";

export default function MuseSparkDryRun() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [sourceMessages, setSourceMessages] = useState(0);
  const [error, setError] = useState("");

  const runPreview = async () => {
    const confirmed = window.confirm(
      "Se enviarán a Meta Model API hasta 30 mensajes recientes y captions únicamente de la conversación autorizada. El análisis quedará como vista previa y no escribirá datos en PROMAN. ¿Continuar?"
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const result = await base44.functions.invoke("analyzeAuthorizedConversationDryRun", {});
      const payload = result?.data || result;
      if (!payload?.success || !payload?.analysis) {
        throw new Error(payload?.error || "Muse Spark no devolvió un análisis utilizable.");
      }
      setAnalysis(payload.analysis);
      setSourceMessages(payload.source_messages || 0);
    } catch (e) {
      setError(e?.message || "No se pudo completar el análisis de prueba.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Prueba puntual de Muse Spark
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Conversación seleccionada: la única autorizada para esta prueba.</p>
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              La función de servidor enviará hasta 30 mensajes recientes y captions a Meta Model API.
              Solo lee esta conversación, exige revisión humana y no guarda ni actualiza datos en PROMAN.
            </p>
            <Button onClick={runPreview} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Analizando…" : "Ejecutar vista previa"}
            </Button>
            {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
          </CardContent>
        </Card>

        {analysis && (
          <Card>
            <CardHeader><CardTitle>Resultado sin guardar · {sourceMessages} mensajes</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>Resumen:</strong> {analysis.summary}</p>
              <div className="flex flex-wrap gap-2">
                {analysis.intent && <Badge variant="outline">Intención: {analysis.intent}</Badge>}
                {analysis.service && <Badge variant="outline">Servicio: {analysis.service}</Badge>}
                {analysis.urgency && <Badge variant="outline">Urgencia: {analysis.urgency}</Badge>}
                <Badge variant="secondary">Revisión humana requerida</Badge>
              </div>
              {analysis.direction_or_location && <p><strong>Ubicación:</strong> {analysis.direction_or_location}</p>}
              {analysis.detected_schedule && <p><strong>Horario:</strong> {analysis.detected_schedule}</p>}
              {analysis.detected_price != null && <p><strong>Monto mencionado (por confirmar):</strong> {analysis.detected_price}</p>}
              {analysis.payments?.length > 0 && <p><strong>Referencias a pagos:</strong> {analysis.payments.join(", ")}</p>}
              {analysis.missing_fields?.length > 0 && <div><strong>Datos faltantes:</strong><ul className="list-disc pl-5">{analysis.missing_fields.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
              {analysis.field_evidence?.length > 0 && (
                <div className="space-y-2 rounded-md border bg-white p-3">
                  <strong>Evidencia cotejada con mensajes fuente</strong>
                  {analysis.field_evidence.map((item, i) => (
                    <p key={`${item.message_record_id}-${i}`}>
                      <span className="font-medium">{item.field}:</span> “{item.quote}”
                      <span className="block text-xs text-slate-500">Mensaje {item.message_record_id}</span>
                    </p>
                  ))}
                </div>
              )}
              {(!analysis.field_evidence || analysis.field_evidence.length === 0) && (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3">No hay citas literales verificadas; los datos requieren revisión.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
