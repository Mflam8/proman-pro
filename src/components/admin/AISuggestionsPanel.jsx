import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { analyzeConversation } from "@/functions/analyzeConversation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, AlertTriangle, Link2 } from "lucide-react";

export default function AISuggestionsPanel({ inquiry, customer, phone, conversationId, compact = false, onOpenCreateInquiry }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [linkJobId, setLinkJobId] = useState("");

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

  const latest = analyses[0] || null;

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      await analyzeConversation({
        inquiry_id: inquiry?.id || null,
        customer_id: customer?.id || null,
        conversation_id: conversationId || null,
        phone: phone || customer?.phone || inquiry?.phone || null,
      });
      queryClient.invalidateQueries({ queryKey: ['conversationAnalysis'] });
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = async () => {
    if (!latest) return;
    await base44.entities.ConversationAnalysis.update(latest.id, { status: 'ignored' });
    queryClient.invalidateQueries({ queryKey: ['conversationAnalysis'] });
  };

  const handleUpdateJob = async () => {
    if (!latest || !inquiry?.id) return;
    await base44.entities.ClientInquiry.update(inquiry.id, {
      service_type: latest.service || inquiry.service_type,
      priority: latest.urgency || inquiry.priority,
      notes: [inquiry.notes, `IA: ${latest.summary}`].filter(Boolean).join('\n\n')
    });
    await base44.entities.ConversationAnalysis.update(latest.id, { status: 'applied', inquiry_id: inquiry.id });
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
          <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={loading} className="bg-white text-fuchsia-700 hover:bg-fuchsia-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analizar'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {!latest ? (
          <p className="text-sm text-slate-600">Aún no hay análisis. Presiona “Analizar” para generar sugerencias.</p>
        ) : (
          <>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">Resumen IA:</span> {latest.summary}</div>
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
              {latest.suggested_next_reply && <div><span className="font-semibold">Suggested Next Reply:</span> {latest.suggested_next_reply}</div>}
            </div>

            <div className="grid gap-2 pt-2 border-t">
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={onOpenCreateInquiry} className="bg-proman-yellow text-proman-navy hover:opacity-90">Crear Inquiry</Button>
                <Button type="button" variant="outline" onClick={handleUpdateJob} disabled={!inquiry?.id}>Actualizar estado</Button>
                <Button type="button" variant="destructive" onClick={handleMarkUrgent}>
                  <AlertTriangle className="w-4 h-4 mr-2" />Marcar urgente
                </Button>
                <Button type="button" variant="outline" onClick={handleIgnore}>Ignorar</Button>
              </div>
              <div className="flex gap-2">
                <Input value={linkJobId} onChange={(e) => setLinkJobId(e.target.value)} placeholder="ID de Job para vincular" />
                <Button type="button" variant="outline" onClick={handleLinkJob}>
                  <Link2 className="w-4 h-4 mr-2" />Vincular a Job
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}