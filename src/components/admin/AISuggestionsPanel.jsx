import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { analyzeConversation } from "@/functions/analyzeConversation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

export default function AISuggestionsPanel({ inquiry, customer, phone, onOpenCreateInquiry, onMarkUrgent }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = React.useState(false);

  const { data: analyses = [] } = useQuery({
    queryKey: ['conversationAnalysis', inquiry?.id, customer?.id, phone],
    queryFn: async () => {
      if (inquiry?.id) return base44.entities.ConversationAnalysis.filter({ inquiry_id: inquiry.id }, '-created_date');
      if (customer?.id) return base44.entities.ConversationAnalysis.filter({ customer_id: customer.id }, '-created_date');
      if (phone) return base44.entities.ConversationAnalysis.filter({ phone }, '-created_date');
      return [];
    },
    enabled: !!inquiry || !!customer || !!phone,
    initialData: []
  });

  const latest = analyses[0] || null;

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      await analyzeConversation({
        inquiry_id: inquiry?.id || null,
        customer_id: customer?.id || null,
        conversation_id: null,
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
    await base44.entities.ConversationAnalysis.update(latest.id, { status: 'applied' });
    queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });
    queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
    queryClient.invalidateQueries({ queryKey: ['conversationAnalysis'] });
  };

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
              {latest.direction_or_location && <div><span className="font-semibold">Dirección/Zona:</span> {latest.direction_or_location}</div>}
              {latest.names?.length > 0 && <div><span className="font-semibold">Nombres:</span> {latest.names.join(', ')}</div>}
              {latest.dates?.length > 0 && <div><span className="font-semibold">Fechas:</span> {latest.dates.join(', ')}</div>}
              {latest.payments?.length > 0 && <div><span className="font-semibold">Pagos:</span> {latest.payments.join(', ')}</div>}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button type="button" onClick={onOpenCreateInquiry} className="bg-proman-yellow text-proman-navy hover:opacity-90">Crear Inquiry</Button>
              <Button type="button" variant="outline" onClick={handleUpdateJob}>Actualizar Job</Button>
              <Button type="button" variant="outline" onClick={handleIgnore}>Ignorar</Button>
              <Button type="button" variant="destructive" onClick={onMarkUrgent}>
                <AlertTriangle className="w-4 h-4 mr-2" />Marcar urgente
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}