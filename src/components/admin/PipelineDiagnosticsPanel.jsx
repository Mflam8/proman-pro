import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock3, Workflow } from 'lucide-react';

const formatStamp = (value) => value ? new Date(value).toLocaleString('es-SV') : 'Pendiente';
const normPhone = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? `+${digits}` : '';
};

function StageRow({ label, successAt, errorEvent, detail, optional = false }) {
  const status = errorEvent ? 'error' : successAt ? 'success' : optional ? 'idle' : 'pending';
  const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? AlertCircle : Clock3;
  const badgeClass = status === 'success'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : status === 'error'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="rounded-lg border p-3 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium text-slate-900">{label}</span>
        </div>
        <Badge variant="outline" className={badgeClass}>{status === 'success' ? 'OK' : status === 'error' ? 'Error' : optional ? 'Sin evento' : 'Pendiente'}</Badge>
      </div>
      <p className="text-xs text-slate-500 mt-2">{formatStamp(successAt || errorEvent?.created_date)}</p>
      {(errorEvent?.description || detail) && <p className="text-xs text-slate-600 mt-1">{errorEvent?.description || detail}</p>}
    </div>
  );
}

export default function PipelineDiagnosticsPanel({ conversationId, inquiryId, phone }) {
  const normalizedPhone = normPhone(phone);

  const { data: webhookEvents = [] } = useQuery({
    queryKey: ['pipelineWebhookEvents', normalizedPhone],
    queryFn: () => normalizedPhone ? base44.entities.WebhookEvent.filter({ phone: normalizedPhone }, '-created_date', 10) : [],
    enabled: !!normalizedPhone,
    initialData: []
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['pipelineTimeline', conversationId],
    queryFn: () => conversationId ? base44.entities.ConversationTimelineEvent.filter({ conversation_id: conversationId }, '-created_date', 50) : [],
    enabled: !!conversationId,
    initialData: []
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ['pipelineAnalyses', conversationId, inquiryId],
    queryFn: () => conversationId
      ? base44.entities.ConversationAnalysis.filter({ conversation_id: conversationId }, '-created_date', 5)
      : inquiryId
        ? base44.entities.ConversationAnalysis.filter({ inquiry_id: inquiryId }, '-created_date', 5)
        : [],
    enabled: !!conversationId || !!inquiryId,
    initialData: []
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ['pipelineInquiries', inquiryId, conversationId],
    queryFn: () => inquiryId
      ? base44.entities.ClientInquiry.filter({ id: inquiryId }, '-updated_date', 1)
      : conversationId
        ? base44.entities.ClientInquiry.filter({ source_conversation_id: conversationId }, '-updated_date', 5)
        : [],
    enabled: !!inquiryId || !!conversationId,
    initialData: []
  });

  const latestInquiry = inquiries[0] || null;
  const { data: workOrders = [] } = useQuery({
    queryKey: ['pipelineWorkOrders', latestInquiry?.id || inquiryId],
    queryFn: () => (latestInquiry?.id || inquiryId) ? base44.entities.WorkOrder.filter({ inquiry_id: latestInquiry?.id || inquiryId }, '-updated_date', 2) : [],
    enabled: !!latestInquiry?.id || !!inquiryId,
    initialData: []
  });

  const latestWebhook = webhookEvents.find((item) => ['message', 'media'].includes(item.event_type)) || webhookEvents[0] || null;
  const latestAnalysis = analyses[0] || null;
  const latestWorkOrder = workOrders[0] || null;
  const findEvent = (eventType) => timeline.find((item) => item.event_type === eventType) || null;
  const lastBotResponse = timeline.find((item) => item.event_type === 'message_echo') || null;

  return (
    <Card className="border-2 border-sky-500 bg-sky-50/40">
      <CardHeader className="bg-sky-500 text-white">
        <CardTitle className="flex items-center gap-2 text-base"><Workflow className="w-5 h-5" />Diagnóstico del pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="grid gap-3 md:grid-cols-2">
          <StageRow label="Webhook recibido" successAt={latestWebhook?.created_date} errorEvent={latestWebhook && latestWebhook.processed_ok === false ? { created_date: latestWebhook.created_date, description: latestWebhook.description || latestWebhook.reason || 'Pendiente de procesamiento' } : null} detail={latestWebhook ? `${latestWebhook.event_type} · ${latestWebhook.direction}` : ''} />
          <StageRow label="Conversación agrupada" successAt={findEvent('pipeline_conversation_grouped')?.created_date || (conversationId ? latestWebhook?.created_date : null)} errorEvent={null} detail={conversationId || 'Sin conversación vinculada'} />
          <StageRow label="Análisis IA ejecutado" successAt={latestAnalysis?.created_date} errorEvent={findEvent('pipeline_analysis_failed')} detail={latestAnalysis?.intent || ''} />
          <StageRow label="ConversationAnalysis creado/actualizado" successAt={latestAnalysis?.updated_date || latestAnalysis?.created_date} errorEvent={findEvent('pipeline_analysis_failed')} detail={latestAnalysis?.service || latestAnalysis?.summary || ''} />
          <StageRow label="ClientInquiry creado/actualizado" successAt={findEvent('pipeline_inquiry_synced')?.created_date || latestInquiry?.updated_date} errorEvent={findEvent('pipeline_inquiry_sync_failed')} detail={latestInquiry ? `${latestInquiry.service_type || 'Sin servicio'} · ${latestInquiry.status || 'sin estado'}` : ''} />
          <StageRow label="Work Order creada/actualizada" successAt={findEvent('pipeline_work_order_synced')?.created_date || latestWorkOrder?.updated_date} errorEvent={findEvent('pipeline_work_order_sync_failed')} detail={latestWorkOrder ? `${latestWorkOrder.workflow_stage || 'Sin etapa'} · ${latestWorkOrder.status || 'sin estado'}` : ''} />
          <StageRow label="Respuesta automática enviada" successAt={lastBotResponse?.created_date} errorEvent={null} detail={lastBotResponse?.description || ''} optional />
        </div>
      </CardContent>
    </Card>
  );
}