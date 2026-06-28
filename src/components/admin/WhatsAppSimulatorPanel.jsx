import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, MessageSquareText } from "lucide-react";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function StatusBadge({ ok, label }) {
  return <Badge className={ok ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>{label}</Badge>;
}

export default function WhatsAppSimulatorPanel({ onSimulated }) {
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("Cliente de prueba");
  const [message, setMessage] = useState("Hola, necesito limpieza de campana para mañana por la tarde en San Salvador.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const simulatedPhone = phone || `+5037${String(Date.now()).slice(-7)}`;
      const messageId = `internal_test_${Date.now()}`;
      const timestamp = String(Math.floor(Date.now() / 1000));
      const response = await base44.functions.invoke('n8nWebhook', {
        event: 'message_received',
        data: {
          phone: simulatedPhone,
          message,
          messageId,
          timestamp,
          message_type: 'text',
          customerHints: { name: customerName },
          source: { platform: 'whatsapp', simulator: true, origin: 'internal_test' }
        }
      });
      const webhook = response.data || response;
      let conversation = null;
      let analysis = null;
      let inquiry = null;
      let workOrder = null;

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const [conversationResult, inquiryResult, analysisList, workOrderList, storedMessages] = await Promise.all([
          webhook.conversation_id ? base44.entities.WhatsappConversation.get(webhook.conversation_id) : Promise.resolve(null),
          webhook.inquiry_id ? base44.entities.ClientInquiry.get(webhook.inquiry_id) : Promise.resolve(null),
          webhook.conversation_id ? base44.entities.ConversationAnalysis.filter({ conversation_id: webhook.conversation_id }, '-created_date', 1) : Promise.resolve([]),
          webhook.inquiry_id ? base44.entities.WorkOrder.filter({ inquiry_id: webhook.inquiry_id }, '-updated_date', 1) : Promise.resolve([]),
          base44.entities.BitacoraWhatsApp.filter({ message_id: messageId }, '-created_date', 5)
        ]);

        conversation = conversationResult;
        inquiry = inquiryResult;
        analysis = analysisList[0] || null;
        workOrder = workOrderList[0] || null;

        const data = {
          success: true,
          input: {
            phone: simulatedPhone,
            customerName,
            message,
            messageId,
            messageType: 'text'
          },
          webhook,
          pipeline: {
            conversation: { ready: Boolean(conversation), id: conversation?.id || webhook.conversation_id || null },
            analysis: { ready: Boolean(analysis), id: analysis?.id || null, intent: analysis?.intent || null, service: analysis?.service || null },
            inquiry: { ready: Boolean(inquiry), id: inquiry?.id || webhook.inquiry_id || null, status: inquiry?.status || null, commercial_status: inquiry?.commercial_status || null },
            work_order: { ready: Boolean(workOrder), id: workOrder?.id || null, workflow_stage: workOrder?.workflow_stage || null, status: workOrder?.status || null },
            duplicate_messages: storedMessages.length,
            duplicate_detected: storedMessages.length > 1
          }
        };

        setResult(data);
        if (conversation && analysis && inquiry && workOrder) break;
        await wait(1500);
      }
      onSimulated?.();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'No se pudo simular el mensaje.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><FlaskConical className="w-4 h-4" />Simular mensaje WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">Deja el teléfono vacío para crear un cliente nuevo, o escribe uno existente para reutilizarlo sin salir de la app.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Teléfono existente o vacío" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Nombre del cliente" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensaje entrante" />
        <Button onClick={handleSimulate} disabled={loading || !message.trim()} className="bg-proman-navy text-white hover:bg-proman-navy/90">
          <MessageSquareText className="w-4 h-4 mr-2" />
          {loading ? 'Simulando...' : 'Simular mensaje WhatsApp'}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result?.success && (
          <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge ok={result.pipeline?.conversation?.ready} label="Conversation" />
              <StatusBadge ok={result.pipeline?.analysis?.ready} label="ConversationAnalysis" />
              <StatusBadge ok={result.pipeline?.inquiry?.ready} label="ClientInquiry" />
              <StatusBadge ok={result.pipeline?.work_order?.ready} label="WorkOrder" />
              <StatusBadge ok={!result.pipeline?.duplicate_detected} label="Sin duplicados" />
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p><strong>Teléfono:</strong> {result.input?.phone}</p>
              <p><strong>Conversation:</strong> {result.pipeline?.conversation?.id || 'Pendiente'}</p>
              <p><strong>Analysis:</strong> {result.pipeline?.analysis?.id || 'Pendiente'}</p>
              <p><strong>Inquiry:</strong> {result.pipeline?.inquiry?.id || 'Pendiente'}</p>
              <p><strong>Work Order:</strong> {result.pipeline?.work_order?.id || 'Pendiente'}</p>
              <p><strong>Pipeline stage:</strong> {result.pipeline?.work_order?.workflow_stage || 'Pendiente'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}