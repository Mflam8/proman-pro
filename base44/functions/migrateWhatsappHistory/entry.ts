import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const webhookEvents = await base44.asServiceRole.entities.WebhookEvent.filter({ event_type: 'fallback_unhandled' }, '-created_date', 200);
    const results = [];

    for (const item of webhookEvents) {
      const payload = JSON.parse(item.raw_payload || '{}');
      const metadata = payload.metadata || {};
      const contacts = payload.contacts || [];
      const messageEchoes = payload.message_echoes || [];

      for (const msg of messageEchoes) {
        const contactPhone = contacts?.[0]?.wa_id || msg?.to || '';
        const phoneNumberId = metadata?.phone_number_id || '';
        const stableConversationKey = `${contactPhone}_${phoneNumberId}`;
        const metaMessageId = msg?.id || '';

        const existing = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ message_id: metaMessageId });
        if (existing.length > 0) {
          results.push({ webhook_event_id: item.id, skipped: true, reason: 'already_exists', message_id: metaMessageId });
          continue;
        }

        let customer = null;
        const found = contactPhone ? await base44.asServiceRole.entities.Customer.filter({ phone: contactPhone }) : [];
        if (found.length > 0) {
          customer = found[0];
        }

        let conversation = null;
        if (customer) {
          const convs = await base44.asServiceRole.entities.WhatsappConversation.filter({ customer_id: customer.id, subject: stableConversationKey });
          conversation = convs[0] || await base44.asServiceRole.entities.WhatsappConversation.create({
            customer_id: customer.id,
            is_open: true,
            channel: 'whatsapp',
            last_message_at: new Date(Number(msg.timestamp) * 1000).toISOString(),
            subject: stableConversationKey,
            notes: `ck:${stableConversationKey}`
          });
        }

        const saved = await base44.asServiceRole.entities.BitacoraWhatsApp.create({
          mensaje_id: metaMessageId,
          message_id: metaMessageId,
          customer_id: customer?.id || null,
          conversation_id: conversation?.id || null,
          from_phone: msg?.from || metadata?.display_phone_number || '',
          to_phone: msg?.to || contactPhone,
          contact_phone: contactPhone,
          phone: contactPhone,
          author_phone: null,
          texto_mensaje: msg?.text?.body || msg?.reaction?.emoji || '',
          text: msg?.text?.body || msg?.reaction?.emoji || '',
          caption: msg?.image?.caption || msg?.video?.caption || null,
          media_url: msg?.image?.url || msg?.video?.url || msg?.audio?.url || msg?.document?.url || null,
          mime_type: msg?.image?.mime_type || msg?.video?.mime_type || msg?.audio?.mime_type || msg?.document?.mime_type || null,
          timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
          message_timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
          meta_timestamp: String(msg.timestamp || ''),
          message_type: msg?.type || 'text',
          channel: 'whatsapp',
          channel_id: phoneNumberId,
          tenant_id: 'default',
          direction: 'outbound',
          sender_type: 'bot',
          raw_payload: JSON.stringify(msg)
        });

        if (conversation) {
          await base44.asServiceRole.entities.WhatsappConversation.update(conversation.id, {
            last_message_at: saved.timestamp,
            last_message_id: saved.id,
            subject: stableConversationKey,
            notes: `ck:${stableConversationKey}`
          });
        }

        results.push({ webhook_event_id: item.id, skipped: false, message_id: metaMessageId, bitacora_id: saved.id });
      }
    }

    return Response.json({ success: true, migrated: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});