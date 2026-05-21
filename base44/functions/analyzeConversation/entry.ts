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
      messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ conversation_id }, '-message_timestamp', 50);
    } else if (customer_id) {
      messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ customer_id }, '-message_timestamp', 50);
    } else if (phone) {
      messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ phone }, '-message_timestamp', 50);
    }

    const recentMessages = messages
      .slice(0, 50)
      .sort((a, b) => new Date(a.message_timestamp || a.timestamp || a.created_date) - new Date(b.message_timestamp || b.timestamp || b.created_date))
      .slice(-20);

    if (recentMessages.length === 0) {
      return Response.json({ error: 'No messages found' }, { status: 404 });
    }

    const transcript = recentMessages
      .map((msg) => {
        const role = msg.direction === 'outbound' ? (msg.sender_type === 'agent' ? 'AGENTE' : 'BOT') : 'CLIENTE';
        const text = msg.text || msg.texto_mensaje || msg.caption || '[sin texto]';
        const ts = msg.message_timestamp || msg.timestamp || msg.created_date;
        return `${ts} | ${role}: ${text}`;
      })
      .join('\n');

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza esta conversación de WhatsApp de un negocio de servicios y responde en JSON.\n\nDebes:\n- generar un resumen claro\n- detectar intención principal\n- extraer dirección o zona\n- extraer servicio solicitado\n- detectar urgencia\n- extraer nombres mencionados\n- extraer fechas/horarios\n- extraer pagos o montos\n- sugerir una acción administrativa\n\nConversación:\n${transcript}`,
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
          suggested_action: { type: 'string', enum: ['crear_inquiry', 'actualizar_job', 'ignorar', 'marcar_urgente', 'dar_seguimiento'] }
        },
        required: ['summary', 'intent', 'service', 'urgency', 'suggested_action']
      }
    });

    const saved = await base44.asServiceRole.entities.ConversationAnalysis.create({
      customer_id: customer_id || recentMessages[0]?.customer_id || null,
      inquiry_id: inquiry_id || recentMessages.find((m) => m.trabajo_id || m.job_id)?.trabajo_id || recentMessages.find((m) => m.trabajo_id || m.job_id)?.job_id || null,
      conversation_id: conversation_id || recentMessages[0]?.conversation_id || null,
      phone: phone || recentMessages[0]?.phone || recentMessages[0]?.contact_phone || recentMessages[0]?.from_phone || '',
      summary: analysis.summary,
      intent: analysis.intent,
      service: analysis.service,
      urgency: analysis.urgency,
      direction_or_location: analysis.direction_or_location || '',
      names: analysis.names || [],
      dates: analysis.dates || [],
      payments: analysis.payments || [],
      suggested_action: analysis.suggested_action,
      analyzed_messages_count: recentMessages.length,
      status: 'pending',
      raw_analysis: JSON.stringify(analysis)
    });

    return Response.json({ success: true, analysis: saved, source_messages: recentMessages.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});