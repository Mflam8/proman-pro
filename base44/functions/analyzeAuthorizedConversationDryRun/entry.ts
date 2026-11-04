import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MODEL = 'muse-spark-1.3';
// Deliberately limited to the single operator-authorized test conversation.
const CONVERSATION_ID = '6ab19175bcd4a293f9f6ce11';

const responseSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    intent: { type: 'string' },
    service: { type: 'string' },
    urgency: { type: 'string', enum: ['baja', 'media', 'alta', 'urgente'] },
    direction_or_location: { type: 'string' },
    detected_address: { type: 'string' },
    detected_schedule: { type: 'string' },
    detected_price: { type: 'number' },
    payments: { type: 'array', items: { type: 'string' } },
    missing_fields: { type: 'array', items: { type: 'string' } },
    field_evidence: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message_record_id: { type: 'string' },
          quote: { type: 'string' }
        },
        required: ['field', 'message_record_id', 'quote']
      }
    }
  },
  required: ['summary', 'intent', 'service', 'urgency', 'missing_fields', 'field_evidence']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const apiKey = Deno.env.get('MODEL_API_KEY');
    if (!apiKey) return Response.json({ error: 'MODEL_API_KEY is not configured' }, { status: 503 });

    const rows = await base44.asServiceRole.entities.BitacoraWhatsApp.filter(
      { conversation_id: CONVERSATION_ID },
      '-created_date',
      30
    );
    const messages = [...rows].sort(
      (a, b) => new Date(a.timestamp || a.created_date) - new Date(b.timestamp || b.created_date)
    );
    if (messages.length === 0) return Response.json({ error: 'No messages found' }, { status: 404 });

    const transcript = messages.map((msg) => {
      const role = msg.direction === 'outbound'
        ? (msg.sender_type === 'agent' ? 'AGENTE' : 'BOT')
        : 'CLIENTE';
      const text = msg.event_type === 'reaction'
        ? `[reacción ${msg.reaction_emoji || ''}]`
        : msg.event_type === 'status'
          ? `[estado ${msg.delivery_status || ''}]`
          : (msg.text || msg.texto_mensaje || msg.caption || '[sin texto]');
      return `[record_id:${msg.id}][timestamp:${msg.timestamp || msg.created_date}] ${role}: ${text}`;
    }).join('\n');

    const response = await fetch('https://api.meta.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'developer',
            content: 'Analiza esta conversación de una empresa de servicios. Propón únicamente hechos respaldados por los mensajes. No infieras cobros realizados, asignaciones ni finalización. Cada dato operativo debe incluir una cita literal y el ID de mensaje que la contiene.'
          },
          {
            role: 'user',
            content: `Analiza solo estos mensajes recientes. Separa hechos explícitos de pendientes. Si falta evidencia, indícalo en missing_fields.\n\n${transcript}`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'proman_authorized_preview', schema: responseSchema, strict: false }
        }
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return Response.json({ error: `Meta Model API request failed (${response.status}): ${detail.slice(0, 250)}` }, { status: 502 });
    }

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string' || !raw.trim()) {
      return Response.json({ error: 'Meta Model API returned no analysis content' }, { status: 502 });
    }

    let analysis;
    try {
      analysis = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'Meta Model API returned invalid JSON' }, { status: 502 });
    }

    const sourceTextById = new Map(
      messages.map((msg) => [msg.id, String(msg.text || msg.texto_mensaje || msg.caption || '')])
    );
    const proposed = Array.isArray(analysis.field_evidence) ? analysis.field_evidence : [];
    const verified = proposed.filter((item) => {
      const sourceText = sourceTextById.get(item?.message_record_id);
      return Boolean(sourceText && item?.quote && sourceText.includes(item.quote.trim()));
    });
    analysis.field_evidence = verified;
    analysis.requires_human_review = true;

    // This function is intentionally read-only: no analysis, state, timeline, or inquiry writes.
    return Response.json({
      success: true,
      model: MODEL,
      source_messages: messages.length,
      analysis
    });
  } catch (error) {
    return Response.json({
      error: String(error?.message || error).slice(0, 500)
    }, { status: 500 });
  }
});
