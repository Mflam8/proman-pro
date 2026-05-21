import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { customer_id, inquiry_id, phone, conversation_id } = body || {};

    let messages = [];

    if (conversation_id) {
      messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ conversation_id }, '-created_date', 50);
    } else if (customer_id) {
      messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ customer_id }, '-created_date', 50);
    } else if (phone) {
      messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ phone }, '-created_date', 50);
    }

    const orderedMessages = messages
      .slice(0, 50)
      .sort((a, b) => new Date(a.timestamp || a.created_date) - new Date(b.timestamp || b.created_date));

    const recentMessages = orderedMessages.slice(-50);

    if (recentMessages.length === 0) {
      return Response.json({ error: 'No messages found' }, { status: 404 });
    }

    let previousAnalysis = [];
    if (conversation_id) {
      previousAnalysis = await base44.asServiceRole.entities.ConversationAnalysis.filter({ conversation_id }, '-created_date', 1);
    } else if (customer_id) {
      previousAnalysis = await base44.asServiceRole.entities.ConversationAnalysis.filter({ customer_id }, '-created_date', 1);
    } else if (phone) {
      previousAnalysis = await base44.asServiceRole.entities.ConversationAnalysis.filter({ phone }, '-created_date', 1);
    }

    const previousSummary = previousAnalysis[0]?.summary || '';
    const transcript = recentMessages
      .map((msg) => {
        const role = msg.direction === 'outbound' ? (msg.sender_type === 'agent' ? 'AGENTE' : 'BOT') : 'CLIENTE';
        const text = msg.text || msg.texto_mensaje || msg.caption || '[sin texto]';
        const ts = msg.timestamp || msg.created_date;
        return `${ts} | ${role}: ${text}`;
      })
      .join('\n');

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza esta conversación completa de WhatsApp para operación de servicios técnicos. Usa los últimos 20-50 mensajes y el resumen previo para entender contexto, intención real y riesgo operativo.\n\nResumen previo:\n${previousSummary || 'Sin resumen previo'}\n\nConversación:\n${transcript}`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          intent: { type: 'string' },
          service: { type: 'string' },
          urgency: { type: 'string', enum: ['baja', 'media', 'alta', 'urgente'] },
          direction_or_location: { type: 'string' },
          names: { type: 'array', items: { type: 'string' } },
          dates: { type: 'array', items: { type: 'string' } },
          payments: { type: 'array', items: { type: 'string' } },
          suggested_action: { type: 'string', enum: ['crear_inquiry', 'vincular_job', 'actualizar_estado', 'marcar_urgente', 'ignorar', 'dar_seguimiento'] },
          suggested_next_reply: { type: 'string' },
          requires_human_review: { type: 'boolean' },
          ai_confidence_score: { type: 'number' },
          operational_risk: { type: 'string', enum: ['bajo', 'medio', 'alto', 'critico'] },
          escalation_needed: { type: 'boolean' },
          unread_customer_message: { type: 'boolean' },
          pending_customer_response: { type: 'boolean' },
          risks_detected: { type: 'array', items: { type: 'string' } },
          pending_from_customer: { type: 'string' },
          sla_warning: { type: 'boolean' }
        },
        required: ['summary', 'intent', 'service', 'urgency', 'suggested_action', 'suggested_next_reply']
      }
    });

    const saved = await base44.asServiceRole.entities.ConversationAnalysis.create({
      customer_id: customer_id || recentMessages[0]?.customer_id || null,
      inquiry_id: inquiry_id || recentMessages.find((m) => m.trabajo_id || m.job_id)?.trabajo_id || recentMessages.find((m) => m.trabajo_id || m.job_id)?.job_id || null,
      conversation_id: conversation_id || recentMessages[0]?.conversation_id || null,
      phone: phone || recentMessages[0]?.phone || recentMessages[0]?.from_phone || '',
      summary: analysis.summary,
      intent: analysis.intent,
      service: analysis.service,
      urgency: analysis.urgency,
      direction_or_location: analysis.direction_or_location || '',
      names: analysis.names || [],
      dates: analysis.dates || [],
      payments: analysis.payments || [],
      suggested_action: analysis.suggested_action,
      suggested_next_reply: analysis.suggested_next_reply || '',
      requires_human_review: analysis.requires_human_review || false,
      ai_confidence_score: analysis.ai_confidence_score ?? 0,
      operational_risk: analysis.operational_risk || 'medio',
      escalation_needed: analysis.escalation_needed || false,
      unread_customer_message: analysis.unread_customer_message || false,
      pending_customer_response: analysis.pending_customer_response || false,
      risks_detected: analysis.risks_detected || [],
      pending_from_customer: analysis.pending_from_customer || '',
      sla_warning: analysis.sla_warning || false,
      previous_analysis_summary: previousSummary,
      analyzed_messages_count: recentMessages.length,
      status: 'pending',
      raw_analysis: JSON.stringify(analysis)
    });

    return Response.json({ success: true, analysis: saved, source_messages: recentMessages.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});