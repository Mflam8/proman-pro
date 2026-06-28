import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PROMPT_VERSION = 'conversation-intelligence-v2';
const ANALYSIS_MODEL = 'automatic';
const MIN_ANALYSIS_INTERVAL_MS = 3 * 60 * 1000;
const LONG_SILENCE_MS = 6 * 60 * 60 * 1000;
const SHORT_NOISE = ['ok', 'gracias', '👍', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿'];
const SHORT_SILENCE_OR_NOISE = new Set(SHORT_NOISE);

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isSkippableNoiseMessage(message) {
  const text = normalizeText(message?.text || message?.texto_mensaje || message?.caption);
  const type = message?.message_type || 'text';
  if (!text && ['sticker', 'reaction'].includes(type)) return true;
  if (SHORT_SILENCE_OR_NOISE.has?.(text)) return true;
  if (SHORT_NOISE.includes(text)) return true;
  return text.length > 0 && text.length <= 2;
}

function detectSignalFlags(messages) {
  const joined = messages.map((m) => `${m.text || m.texto_mensaje || m.caption || ''}`).join(' ').toLowerCase();
  return {
    hasDate: /(mañana|hoy|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|\d{1,2}[:.]\d{2}|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})/.test(joined),
    hasPayment: /(pago|abono|transfer|depósito|deposito|factura|comprobante|saldo|\$\d+)/.test(joined),
    hasLocation: /(dirección|direccion|ubicación|ubicacion|maps|waze|colonia|avenida|pasaje|casa|local|km\s?\d+)/.test(joined),
    hasUrgency: /(urgente|emergencia|ya|ahora|rápido|rapido|hoy mismo|inmediato)/.test(joined)
  };
}

function shouldAnalyze({ latestMessage, lastAnalysis, lastState, recentMessages, trigger_reason }) {
  if (!latestMessage) return { run: false, reason: 'no_message' };
  if (latestMessage.direction !== 'inbound' || latestMessage.sender_type !== 'customer') return { run: false, reason: 'not_customer_inbound' };
  if (latestMessage.message_type === 'status' || latestMessage.event_type === 'status') return { run: false, reason: 'status_message' };
  if (latestMessage.message_type === 'reaction' || latestMessage.event_type === 'reaction') return { run: false, reason: 'reaction_message' };
  if (isSkippableNoiseMessage(latestMessage)) return { run: false, reason: 'noise_message' };

  const now = new Date(latestMessage.timestamp || latestMessage.created_date).getTime();
  const lastAnalysisAt = lastAnalysis?.created_date ? new Date(lastAnalysis.created_date).getTime() : 0;
  const sinceLastAnalysis = now - lastAnalysisAt;
  const flags = detectSignalFlags(recentMessages);
  const currentIntent = normalizeText(lastState?.current_intent);
  const previousIntent = normalizeText(lastAnalysis?.intent || lastState?.current_intent);
  const silenceGap = recentMessages.length >= 2
    ? now - new Date(recentMessages[recentMessages.length - 2].timestamp || recentMessages[recentMessages.length - 2].created_date).getTime()
    : 0;

  if (!lastAnalysis) return { run: true, reason: 'no_recent_analysis' };
  if (lastAnalysis.requires_human_review) return { run: true, reason: 'requires_human_review' };
  if (lastAnalysis.unread_customer_message) return { run: true, reason: 'unread_customer_message' };
  if (flags.hasUrgency && sinceLastAnalysis > 30 * 1000) return { run: true, reason: 'urgency_detected' };
  if ((flags.hasDate || flags.hasPayment || flags.hasLocation) && sinceLastAnalysis > 60 * 1000) return { run: true, reason: 'new_structured_signal' };
  if (silenceGap > LONG_SILENCE_MS) return { run: true, reason: 'customer_returned_after_long_time' };
  if (currentIntent && previousIntent && currentIntent !== previousIntent && sinceLastAnalysis > 60 * 1000) return { run: true, reason: 'intent_changed' };
  if (sinceLastAnalysis >= MIN_ANALYSIS_INTERVAL_MS) return { run: true, reason: trigger_reason || 'rate_limit_window_passed' };
  return { run: false, reason: 'rate_limited' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startedAt = Date.now();
    const body = await req.json();
    const { customer_id, inquiry_id, phone, conversation_id, trigger_reason } = body || {};

    let messages = [];
    if (conversation_id) messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ conversation_id }, '-created_date', 30);
    else if (customer_id) messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ customer_id }, '-created_date', 30);
    else if (phone) messages = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ phone }, '-created_date', 30);

    const recentMessages = messages
      .slice(0, 30)
      .sort((a, b) => new Date(a.timestamp || a.created_date) - new Date(b.timestamp || b.created_date));

    if (recentMessages.length === 0) {
      return Response.json({ error: 'No messages found' }, { status: 404 });
    }

    const resolvedConversationId = conversation_id || recentMessages[0]?.conversation_id || null;
    const latestMessage = recentMessages[recentMessages.length - 1];

    const previousAnalyses = resolvedConversationId
      ? await base44.asServiceRole.entities.ConversationAnalysis.filter({ conversation_id: resolvedConversationId }, '-created_date', 1)
      : customer_id
        ? await base44.asServiceRole.entities.ConversationAnalysis.filter({ customer_id }, '-created_date', 1)
        : await base44.asServiceRole.entities.ConversationAnalysis.filter({ phone }, '-created_date', 1);

    const stateList = resolvedConversationId
      ? await base44.asServiceRole.entities.ConversationOperationalState.filter({ conversation_id: resolvedConversationId }, '-created_date', 1)
      : [];

    const lastAnalysis = previousAnalyses[0] || null;
    const lastState = stateList[0] || null;
    const decision = shouldAnalyze({ latestMessage, lastAnalysis, lastState, recentMessages, trigger_reason });

    if (!decision.run) {
      return Response.json({ success: true, skipped: true, reason: decision.reason });
    }

    const rollingSummary = lastState?.rolling_summary || lastAnalysis?.summary || '';
    const transcript = recentMessages
      .map((msg) => {
        const role = msg.direction === 'outbound' ? (msg.sender_type === 'agent' ? 'AGENTE' : 'BOT') : 'CLIENTE';
        const text = msg.event_type === 'reaction'
          ? `[reacción ${msg.reaction_emoji || ''}]`
          : msg.event_type === 'status'
            ? `[estado ${msg.delivery_status || msg.text || ''}]`
            : (msg.text || msg.texto_mensaje || msg.caption || '[sin texto]');
        return `${role}: ${text}`;
      })
      .join('\n');

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: ANALYSIS_MODEL,
      prompt: `Eres un asistente de inteligencia operacional para WhatsApp de una empresa de servicios técnicos.\n\nDebes analizar SOLO para resumir, detectar, priorizar y sugerir.\nNO debes asumir automatización peligrosa.\nNO crear trabajos, NO cobrar, NO cerrar, NO asignar técnicos.\n\nRolling summary previo:\n${rollingSummary || 'Sin resumen previo'}\n\nEstado previo:\n- intención actual: ${lastState?.current_intent || 'desconocida'}\n- servicio actual: ${lastState?.current_service || 'desconocido'}\n- urgencia actual: ${lastState?.current_urgency || 'media'}\n- pendiente del cliente: ${lastState?.pending_customer_request || 'ninguno'}\n- pendientes abiertos: ${(lastState?.unresolved_items || []).join(', ') || 'ninguno'}\n\nMensajes recientes:\n${transcript}\n\nResponde con continuidad operacional, poco ruido y criterio conservador.`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          rolling_summary: { type: 'string' },
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
          confidence_score: { type: 'number' },
          operational_risk: { type: 'string', enum: ['bajo', 'medio', 'alto', 'critico'] },
          escalation_needed: { type: 'boolean' },
          unread_customer_message: { type: 'boolean' },
          pending_customer_response: { type: 'boolean' },
          risks_detected: { type: 'array', items: { type: 'string' } },
          pending_from_customer: { type: 'string' },
          unresolved_items: { type: 'array', items: { type: 'string' } },
          sla_warning: { type: 'boolean' }
        },
        required: ['summary', 'rolling_summary', 'intent', 'service', 'urgency', 'suggested_action', 'suggested_next_reply']
      }
    });

    const addTimelineEvent = async ({ eventType, title, description, relatedEntityId = null, metadata = {} }) => {
      if (!resolvedConversationId) return;
      await base44.asServiceRole.entities.ConversationTimelineEvent.create({
        conversation_id: resolvedConversationId,
        event_type: eventType,
        title,
        description,
        source: metadata.status === 'error' ? 'system' : 'ai',
        related_entity_id: relatedEntityId,
        metadata_json: JSON.stringify(metadata)
      });
    };

    const duration = Date.now() - startedAt;
    const saved = await base44.asServiceRole.entities.ConversationAnalysis.create({
      customer_id: customer_id || recentMessages[0]?.customer_id || null,
      inquiry_id: inquiry_id || recentMessages.find((m) => m.trabajo_id || m.job_id)?.trabajo_id || recentMessages.find((m) => m.trabajo_id || m.job_id)?.job_id || null,
      conversation_id: resolvedConversationId,
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
      ai_confidence_score: analysis.ai_confidence_score ?? analysis.confidence_score ?? 0,
      operational_risk: analysis.operational_risk || 'medio',
      escalation_needed: analysis.escalation_needed || false,
      unread_customer_message: analysis.unread_customer_message ?? true,
      pending_customer_response: analysis.pending_customer_response || false,
      risks_detected: analysis.risks_detected || [],
      pending_from_customer: analysis.pending_from_customer || '',
      sla_warning: analysis.sla_warning || false,
      previous_analysis_summary: rollingSummary,
      analyzed_messages_count: recentMessages.length,
      trigger_reason: decision.reason,
      ai_prompt_version: PROMPT_VERSION,
      analysis_model: ANALYSIS_MODEL,
      confidence_score: analysis.confidence_score ?? analysis.ai_confidence_score ?? 0,
      token_usage: Math.ceil((`${rollingSummary}\n${transcript}`).length / 4),
      analysis_duration_ms: duration,
      status: 'pending',
      raw_analysis: JSON.stringify(analysis)
    });

    if (resolvedConversationId) {
      if (lastState) {
        await base44.asServiceRole.entities.ConversationOperationalState.update(lastState.id, {
          customer_id: customer_id || recentMessages[0]?.customer_id || null,
          phone: phone || recentMessages[0]?.phone || recentMessages[0]?.from_phone || '',
          rolling_summary: analysis.rolling_summary || analysis.summary,
          current_intent: analysis.intent,
          current_service: analysis.service,
          current_urgency: analysis.urgency,
          pending_customer_request: analysis.pending_from_customer || '',
          unresolved_items: analysis.unresolved_items || analysis.risks_detected || [],
          last_analysis_id: saved.id,
          last_analysis_at: new Date().toISOString()
        });
      } else {
        await base44.asServiceRole.entities.ConversationOperationalState.create({
          conversation_id: resolvedConversationId,
          customer_id: customer_id || recentMessages[0]?.customer_id || null,
          phone: phone || recentMessages[0]?.phone || recentMessages[0]?.from_phone || '',
          rolling_summary: analysis.rolling_summary || analysis.summary,
          current_intent: analysis.intent,
          current_service: analysis.service,
          current_urgency: analysis.urgency,
          pending_customer_request: analysis.pending_from_customer || '',
          unresolved_items: analysis.unresolved_items || analysis.risks_detected || [],
          last_analysis_id: saved.id,
          last_analysis_at: new Date().toISOString()
        });
      }

      await addTimelineEvent({
        eventType: 'conversation_analysis_created',
        title: 'Nuevo análisis IA',
        description: `${analysis.intent} · ${analysis.urgency} · ${analysis.suggested_action}`,
        relatedEntityId: saved.id,
        metadata: { status: 'success', trigger_reason: decision.reason, service: analysis.service, risk: analysis.operational_risk }
      });

      if ((analysis.payments || []).length > 0) {
        await addTimelineEvent({
          eventType: 'payment_detected',
          title: 'Pago detectado',
          description: (analysis.payments || []).join(', '),
          relatedEntityId: saved.id,
          metadata: { status: 'success', payments: analysis.payments }
        });
      }

      if (analysis.direction_or_location) {
        await addTimelineEvent({
          eventType: 'customer_sent_location',
          title: 'Ubicación detectada',
          description: analysis.direction_or_location,
          relatedEntityId: saved.id,
          metadata: { status: 'success', location: analysis.direction_or_location }
        });
      }

      if (analysis.urgency === 'urgente') {
        await addTimelineEvent({
          eventType: 'ai_detected_urgency',
          title: 'Urgencia alta detectada',
          description: analysis.summary,
          relatedEntityId: saved.id,
          metadata: { status: 'success', urgency: analysis.urgency }
        });
      }
    }

    return Response.json({ success: true, analysis: saved, source_messages: recentMessages.length, trigger_reason: decision.reason });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.clone().json().catch(() => ({}));
      const fallbackConversationId = body?.conversation_id || null;
      if (fallbackConversationId) {
        await base44.asServiceRole.entities.ConversationTimelineEvent.create({
          conversation_id: fallbackConversationId,
          event_type: 'pipeline_analysis_failed',
          title: 'Falló el análisis IA automático',
          description: error.message,
          source: 'system',
          related_entity_id: null,
          metadata_json: JSON.stringify({ status: 'error' })
        });
      }
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});