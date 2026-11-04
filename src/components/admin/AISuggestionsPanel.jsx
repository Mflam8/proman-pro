import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { analyzeConversation } from "@/functions/analyzeConversation.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, AlertTriangle, Link2, Copy } from "lucide-react";
import ConversationTimeline from "./ConversationTimeline";

export default function AISuggestionsPanel({ inquiry, customer, phone, conversationId, compact = false, onOpenCreateInquiry }) {
  const [copiedReply, setCopiedReply] = useState(false);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [linkJobId, setLinkJobId] = useState("");
  const [previewAnalysis, setPreviewAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  const { data: analyses = [] } = useQuery({
    queryKey: ['conversationAnalysis', inquiry?.id, customer?.id, phone, conversationId],
    queryFn: async () => {
      if (conversationId) return base44.entities.ConversationAnalysis.filter({ conversation_id: conversationId }, '-created_date');
      if (inquiry?.id) return base44.entities.ConversationAnalysis.filter({ inquiry_id: inquiry.id }, '-created_date');
      if (customer?.id) return base44.entities.ConversationAnalysis.filter({ customer_id: customer.id }, '-created_date');
      if (phone) return base44.entities.ConversationAnalysis.filter({ phone }, '-created_date');
      return [];
    },
    enabled: !!inquiry || !!customer || !!phone || !!conversationId,
    initialData: []
  });

  const latest = previewAnalysis || analyses[0] || null;
  let fieldEvidence = Array.isArray(latest?.field_evidence) ? latest.field_evidence : [];
  if (fieldEvidence.length === 0) {
    try {
      const parsed = JSON.parse(latest?.field_evidence_json || '[]');
      fieldEvidence = Array.isArray(parsed) ? parsed : [];
    } catch {}
  }

  const handleAnalyze = async () => {
    if (!conversationId) {
      setAnalysisError('Esta ficha no tiene una conversación vinculada para probar.');
      return;
    }
    const approvedToSend = window.confirm(
      'La prueba enviará a Meta Model API hasta 30 mensajes recientes y captions de esta conversación para analizarlos con Muse Spark. No guardará el análisis ni modificará el trabajo. ¿Continuar?'
    );
    if (!approvedToSend) return;

    setLoading(true);
    setAnalysisError('');
    setPreviewAnalysis(null);
    try {
      const result = await analyzeConversation({
        inquiry_id: inquiry?.id || null,
        customer_id: customer?.id || null,
        conversation_id: conversationId,
        phone: phone || customer?.phone || inquiry?.phone || null,
        trigger_reason: 'manual_review_preview',
        dry_run: true
      });
      const payload = result?.data || result;
      if (!payload?.success || !payload?.analysis) {
        throw new Error(payload?.error || 'Muse Spark no devolvió un análisis utilizable.');
      }
      setPreviewAnalysis({
        ...payload.analysis,
        _dryRun: true,
        _sourceMessages: payload.source_messages
      });
    } catch (error) {
      setAnalysisError(error?.message || 'No se pudo completar la prueba con Muse Spark.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggestedReply = async () => {
    if (!latest?.suggested_next_reply) return;
    await navigator.clipboard.writeText(latest.suggested_next_reply);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 1500);
  };

  const handleIgnore = async () => {
    if (!latest) return;
    await base44.entities.ConversationAnalysis.update(latest.id, { status: 'ignored' });
    queryClient.invalidateQueries({ queryKey: ['conversationAnalysis'] });
  };

  const handleUpdateJob = async () => {
    if (!latest || !inquiry?.id) return;

    if (previewAnalysis?._dryRun) {
      const changes = [
        previewAnalysis.service && `servicio: ${previewAnalysis.service}`,
        previewAnalysis.urgency && `prioridad: ${previewAnalysis.urgency}`,
        previewAnalysis.detected_address && `dirección: ${previewAnalysis.detected_address}`,
        previewAnalysis.detected_schedule && `horario mencionado: ${previewAnalysis.detected_schedule}`
      ].filter(Boolean);
      if (changes.length === 0) {
        setAnalysisError('La prueba no produjo campos suficientes para actualizar esta ficha.');
        return;
      }
      const approvedToApply = window.confirm(
        `Se actualizará la ficha de trabajo existente con: ${changes.join('; ')}. El monto, pagos y asignación no se registrarán automáticamente. ¿Confirmas aplicar estos cambios?`
      );
      if (!approvedToApply) return;

      const snapshot = {
        source: 'Muse Spark preview reviewed by operator',
        source_conversation_id: conversationId,
        detected_service: previewAnalysis.service || null,
        detected_urgency: previewAnalysis.urgency || null,
        detected_location: previewAnalysis.direction_or_location || null,
        detected_address: previewAnalysis.detected_address || null,
        detected_price: previewAnalysis.detected_price ?? null,
        detected_schedule: previewAnalysis.detected_schedule || null,
        detected_amounts: previewAnalysis.payments || [],
        missing_fields: previewAnalysis.missing_fields || [],
        field_evidence: previewAnalysis.field_evidence || [],
        source_message_count: previewAnalysis._sourceMessages || null,
        reviewed_at: new Date().toISOString()
      };
      const patch = {
        human_review_status: 'approved',
        approved_operational_snapshot: JSON.stringify(snapshot),
        notes: [inquiry.notes, `Muse Spark revisado: ${previewAnalysis.summary}`].filter(Boolean).join('\\n\\n')
      };
      if (previewAnalysis.service && previewAnalysis.service !== 'unknown') patch.service_type = previewAnalysis.service;
      if (previewAnalysis.urgency) patch.priority = previewAnalysis.urgency;
      if (previewAnalysis.detected_address) patch.address = previewAnalysis.detected_address;
      if (previewAnalysis.direction_or_location) patch.location_name = previewAnalysis.direction_or_location;
      if (previewAnalysis.detected_schedule) patch.preferred_time = previewAnalysis.detected_schedule;
      if (previewAnalysis.suggested_next_reply) patch.next_best_action = previewAnalysis.suggested_next_reply;

      await base44.entities.ClientInquiry.update(inquiry.id, patch);
      queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      queryClient.invalidateQueries({ queryKey: ['conversationAnalysis'] });
      setPreviewAnalysis(null);
      setAnalysisError('');
      return;
    }

    await base44.entities.ClientInquiry.update(inquiry.id, {
      service_type: latest.service || inquiry.service_type,
      priority: latest.urgency || inquiry.priority,
      human_review_status: 'approved',
      approved_operational_snapshot: JSON.stringify({
        detected_service: latest.service,
        detected_urgency: latest.urgency,
        detected_location: latest.direction_or_location,
        detected_amounts: latest.payments,
        detected_dates: latest.dates,
        ai_confidence: latest.ai_confidence_score,
        missing_fields: latest.missing_fields || []
      }),
      notes: [inquiry.notes, `IA revisada y aprobada: ${latest.summary}`].filter(Boolean).join('\n\n')
    });
    await base44.entities.ConversationAnalysis.update(latest.id, { status: 'reviewed', inquiry_id: inquiry.id });
    queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });
    queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
    queryClient.invalidateQueries({ queryKey: ['conversationAnalysis'] });
  };

  const handleMarkUrgent = async () => {
    if (!latest) return;
    if (inquiry?.id) {
      await base44.entities.ClientInquiry.update(inquiry.id, { priority: 'urgente' });
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
    }
    await base44.entities.ConversationAnalysis.update(latest.id, { status: 'reviewed', urgency: 'urgente' });
    queryClient.invalidateQueries({ queryKey: ['conversationAnalysis'] });
  };

  const handleLinkJob = async () => {
    if (!latest || !linkJobId) return;
    await base44.entities.ConversationAnalysis.update(latest.id, { inquiry_id: linkJobId, status: 'reviewed' });
    queryClient.invalidateQueries({ queryKey: ['conversationAnalysis'] });
    setLinkJobId('');
  };

  if (compact) {
    return (
      <Card className="border border-fuchsia-200 bg-fuchsia-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" />Conversation Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!latest ? <p className="text-slate-600">Sin análisis todavía.</p> : (
            <>
              <div><span className="font-semibold">Último resumen IA:</span> {latest.summary}</div>
              <div><span className="font-semibold">Última intención:</span> {latest.intent}</div>
              {latest.risks_detected?.length > 0 && <div><span className="font-semibold">Riesgos:</span> {latest.risks_detected.join(', ')}</div>}
              <div><span className="font-semibold">Pendiente del cliente:</span> {latest.pending_from_customer || 'Sin pendiente claro'}</div>
              <div><span className="font-semibold">SLA warning:</span> {latest.sla_warning ? 'Sí' : 'No'}</div>
              <div><span className="font-semibold">Última actividad WhatsApp:</span> {latest.created_date ? new Date(latest.created_date).toLocaleString() : 'N/A'}</div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-fuchsia-500 bg-fuchsia-50/40">
      <CardHeader className="bg-fuchsia-500 text-white">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><Sparkles className="w-5 h-5" />AI Suggestions</span>
          <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={loading || !conversationId} className="bg-white text-fuchsia-700 hover:bg-fuchsia-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Probar Muse Spark'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {!latest ? (
          <p className="text-sm text-slate-600">Aún no hay análisis. Presiona “Analizar” para generar sugerencias.</p>
        ) : (
          <>
            <div className="space-y-2 text-sm">
              {analysisError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{analysisError}</div>}
              {previewAnalysis?._dryRun && <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-sm text-blue-800">Vista previa sin guardar · {previewAnalysis._sourceMessages || 0} mensajes consultados</div>}
              <div><span className="font-semibold">Resumen IA:</span> {latest.summary}</div>
              {fieldEvidence.length > 0 && (
                <div className="rounded-lg border bg-white p-3 space-y-2">
                  <div className="font-semibold">Evidencia verificada en la conversación</div>
                  {fieldEvidence.map((item, index) => (
                    <div key={`${item.message_record_id}-${item.field}-${index}`} className="text-slate-700">
                      <span className="font-medium">{item.field}:</span> “{item.quote}”
                      <span className="block text-xs text-slate-500">Mensaje {item.message_record_id}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge>{latest.intent}</Badge>
                {latest.service && <Badge variant="outline">{latest.service}</Badge>}
                {latest.urgency && <Badge className="bg-red-100 text-red-800">{latest.urgency}</Badge>}
                {latest.suggested_action && <Badge className="bg-amber-100 text-amber-800">{latest.suggested_action}</Badge>}
              </div>
              {latest.direction_or_location && <div><span className="font-semibold">Dirección detectada:</span> {latest.direction_or_location}</div>}
              {latest.payments?.length > 0 && <div><span className="font-semibold">Pagos detectados:</span> {latest.payments.join(', ')}</div>}
              {latest.dates?.length > 0 && <div><span className="font-semibold">Fechas detectadas:</span> {latest.dates.join(', ')}</div>}
              {latest.risks_detected?.length > 0 && <div><span className="font-semibold">Riesgos:</span> {latest.risks_detected.join(', ')}</div>}
              <div className="flex flex-wrap gap-2">
                {latest.requires_human_review && <Badge className="bg-slate-200 text-slate-800">Revisión humana</Badge>}
                {latest.escalation_needed && <Badge className="bg-orange-100 text-orange-800">Escalamiento</Badge>}
                {latest.unread_customer_message && <Badge className="bg-blue-100 text-blue-800">Mensaje no leído</Badge>}
                {latest.pending_customer_response && <Badge className="bg-yellow-100 text-yellow-800">Esperando cliente</Badge>}
                {latest.operational_risk && <Badge className="bg-rose-100 text-rose-800">Riesgo {latest.operational_risk}</Badge>}
                <Badge variant="outline">Confianza {(Number(latest.ai_confidence_score || 0) * 100).toFixed(0)}%</Badge>
              </div>
              {latest.suggested_next_reply && (
                <div className="space-y-2">
                  <div><span className="font-semibold">Suggested Next Reply:</span> {latest.suggested_next_reply}</div>
                  <Button type="button" variant="outline" onClick={handleUseSuggestedReply}>
                    <Copy className="w-4 h-4 mr-2" />{copiedReply ? 'Respuesta copiada' : 'Usar respuesta sugerida'}
                  </Button>
                </div>
              )}
              <div className="text-xs text-slate-500">
                Trigger: {latest.trigger_reason || 'manual'} · Prompt: {latest.ai_prompt_version || 'N/A'} · Modelo: {latest.analysis_model || 'N/A'} · Tokens: {latest.token_usage || 0} · Duración: {latest.analysis_duration_ms || 0}ms
              </div>
            </div>

            <div className="grid gap-2 pt-2 border-t">
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={onOpenCreateInquiry} disabled={!!previewAnalysis} className="bg-proman-yellow text-proman-navy hover:opacity-90">Crear Inquiry</Button>
                <Button type="button" variant="outline" onClick={handleUpdateJob} disabled={!inquiry?.id}>{previewAnalysis ? 'Aplicar a ficha' : inquiry?.human_review_status === 'approved' ? '✓ Aprobado' : 'Aprobar IA'}</Button>
                <Button type="button" variant="destructive" onClick={handleMarkUrgent} disabled={!!previewAnalysis}>
                  <AlertTriangle className="w-4 h-4 mr-2" />Marcar urgente
                </Button>
                <Button type="button" variant="outline" onClick={handleIgnore} disabled={!!previewAnalysis}>Ignorar</Button>
              </div>
              <div className="flex gap-2">
                <Input value={linkJobId} onChange={(e) => setLinkJobId(e.target.value)} placeholder="ID de Job para vincular" />
                <Button type="button" variant="outline" onClick={handleLinkJob} disabled={!!previewAnalysis}>
                  <Link2 className="w-4 h-4 mr-2" />Vincular a Job
                </Button>
              </div>
            </div>

            {conversationId && <ConversationTimeline conversationId={conversationId} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}