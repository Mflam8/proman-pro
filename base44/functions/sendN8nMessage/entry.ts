import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    let { customer_id, inquiry_id, phone, text, media_url, message_type } = body || {};

    // Resolver teléfono si no viene
    if (!phone) {
      if (customer_id) {
        const cust = (await base44.asServiceRole.entities.Customer.filter({ id: customer_id }))[0];
        phone = cust?.phone || cust?.wa_id || null;
      } else if (inquiry_id) {
        const job = (await base44.asServiceRole.entities.ClientInquiry.filter({ id: inquiry_id }))[0];
        if (job?.customer_id) {
          const cust = (await base44.asServiceRole.entities.Customer.filter({ id: job.customer_id }))[0];
          phone = cust?.phone || cust?.wa_id || null;
          customer_id = job.customer_id;
        }
      }
    }

    if (!phone && !customer_id) {
      return Response.json({ error: 'Missing phone or customer_id' }, { status: 400 });
    }

    const N8N_URL = Deno.env.get('N8N_OUTBOUND_WEBHOOK_URL');
    const N8N_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET');

    if (!N8N_URL) {
      return Response.json({ error: 'Missing N8N_OUTBOUND_WEBHOOK_URL secret' }, { status: 400 });
    }

    const payload = {
      event: 'send_message',
      data: {
        phone,
        customer_id: customer_id || null,
        inquiry_id: inquiry_id || null,
        text: text || null,
        media_url: media_url || null,
        message_type: message_type || (media_url ? 'document' : 'text'),
        sender: user.email,
      }
    };

    const res = await fetch(N8N_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_SECRET ? { 'X-N8N-Secret': N8N_SECRET } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: 'n8n error', details: t }, { status: 502 });
    }

    const customer = customer_id
      ? (await base44.asServiceRole.entities.Customer.filter({ id: customer_id }))[0]
      : phone
        ? (await base44.asServiceRole.entities.Customer.filter({ phone }))[0]
        : null;
    const channelId = Deno.env.get('META_PHONE_NUMBER_ID') || '';
    const stableConversationKey = `${phone || customer?.phone || 'unknown'}_${channelId || 'unknown'}`;
    let conversation = null;

    if (customer) {
      const existingConvs = await base44.asServiceRole.entities.WhatsappConversation.filter({ customer_id: customer.id, subject: stableConversationKey });
      conversation = existingConvs[0] || await base44.asServiceRole.entities.WhatsappConversation.create({
        customer_id: customer.id,
        is_open: true,
        channel: 'whatsapp',
        last_message_at: new Date().toISOString(),
        subject: stableConversationKey,
        notes: `ck:${stableConversationKey}`
      });
    }

    const localMessageId = `out_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const saved = await base44.asServiceRole.entities.BitacoraWhatsApp.create({
      mensaje_id: localMessageId,
      message_id: localMessageId,
      customer_id: customer_id || customer?.id || null,
      conversation_id: conversation?.id || null,
      trabajo_id: inquiry_id || null,
      job_id: inquiry_id || null,
      from_phone: channelId,
      to_phone: phone || customer?.phone || '',
      contact_phone: phone || customer?.phone || '',
      author_phone: user.email,
      phone: phone || customer?.phone || '',
      texto_mensaje: text || '',
      text: text || '',
      media_url: media_url || null,
      timestamp: nowIso,
      message_timestamp: nowIso,
      meta_timestamp: nowIso,
      message_type: message_type || (media_url ? 'document' : 'text'),
      channel: 'whatsapp',
      channel_id: channelId,
      tenant_id: 'default',
      direction: 'outbound',
      sender_type: 'agent',
      delivery_status: 'sent',
      raw_payload: JSON.stringify(payload)
    });

    if (conversation) {
      await base44.asServiceRole.entities.WhatsappConversation.update(conversation.id, {
        last_message_at: nowIso,
        last_message_id: saved.id,
        subject: stableConversationKey,
        notes: `ck:${stableConversationKey}`
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});