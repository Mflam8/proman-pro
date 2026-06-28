import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * PROMAN - Webhook robusto para N8N
 * 
 * Eventos soportados:
 * - new_lead         → Crea Customer + ClientInquiry
 * - message_received → Guarda en BitacoraWhatsApp + ProgressLog
 * - status_update    → Actualiza estado de ClientInquiry
 * - payment_confirmed→ Crea Payment vinculado al trabajo
 * - customer_query   → Consulta datos del cliente (historial, trabajos activos)
 * - service_query    → Consulta precios y servicios disponibles
 * 
 * Autenticación: Header X-N8N-Secret debe coincidir con N8N_WEBHOOK_SECRET
 */

// Helper: qué debe hacer N8N según el rol del remitente
function roleToAction(role) {
  const actions = {
    ceo:        'log_only',           // Solo registrar, no responder con bot
    admin:      'log_only',
    technician: 'technician_flow',    // Flujo de técnico (avances, fotos)
    corporate:  'corporate_flow',     // Flujo corporativo (agendamiento)
    corporate_customer: 'corporate_flow',
    recurring_customer: 'handle_existing_customer',
    new_lead:   'handle_new_lead',    // Flujo completo de calificación
  };
  return actions[role] || 'handle_new_lead';
}

Deno.serve(async (req) => {
  // Solo POST
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  const safeStringify = (value) => {
    try {
      return JSON.stringify(value || {});
    } catch {
      return '{}';
    }
  };

  const addTimelineEvent = async ({ conversationId, eventType, title, description, relatedEntityId = null, metadata = {} }) => {
    if (!conversationId) return;
    await base44.asServiceRole.entities.ConversationTimelineEvent.create({
      conversation_id: conversationId,
      event_type: eventType,
      title,
      description,
      source: metadata.status === 'error' ? 'system' : 'webhook',
      related_entity_id: relatedEntityId,
      metadata_json: safeStringify(metadata)
    });
  };

  const logPipelineFailure = async ({ conversationId, sourceName, eventType, message, details, relatedEntityId = null, relatedEntity = null }) => {
    if (conversationId) {
      await addTimelineEvent({
        conversationId,
        eventType,
        title: message,
        description: details,
        relatedEntityId,
        metadata: { status: 'error', source_name: sourceName }
      });
    }

    await base44.asServiceRole.entities.SystemError.create({
      source_type: 'function',
      source_name: sourceName,
      severity: 'error',
      status: 'open',
      message,
      details,
      related_entity: relatedEntity,
      related_entity_id: relatedEntityId,
      occurred_at: new Date().toISOString()
    });
  };

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { event, data } = body;

  const normalizePhone = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/[^\d]/g, '');
    if (!digits) return '';
    if (digits.startsWith('503')) return `+${digits}`;
    if (digits.length === 8) return `+503${digits}`;
    return `+${digits}`;
  };

  const normalizeEventType = (parsedEvent) => {
    if (parsedEvent.parsed_type === 'status') return 'status';
    if (parsedEvent.message_type === 'reaction' || parsedEvent.parsed_type?.includes('reaction')) return 'reaction';
    if (['image', 'video', 'audio', 'document'].includes(parsedEvent.message_type)) return 'media';
    if (parsedEvent.direction === 'outbound') return 'message_echo';
    return 'message';
  };

  const ANALYSIS_NOISE = new Set(['ok', 'gracias', '👍', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿', 'sent', 'delivered', 'read']);
  const normalizeMessageContent = (value) => String(value || '').trim().toLowerCase();
  const hasUsefulCustomerContent = ({ eventType, messageType = 'text', text = '', caption = '', mediaUrl = null, direction = 'inbound', senderType = 'customer' }) => {
    if (direction !== 'inbound' || senderType !== 'customer') return false;
    if (!['message', 'media'].includes(eventType)) return false;
    if (['reaction', 'status'].includes(messageType)) return false;
    const normalized = normalizeMessageContent(text || caption);
    if (normalized) return normalized.length > 2 && !ANALYSIS_NOISE.has(normalized);
    return Boolean(mediaUrl);
  };

  const listActiveCustomersByPhone = async (rawPhone) => {
    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedPhone) return [];

    const searches = await Promise.all([
      base44.asServiceRole.entities.Customer.filter({ phone: normalizedPhone }),
      base44.asServiceRole.entities.Customer.filter({ normalized_phone: normalizedPhone }),
      base44.asServiceRole.entities.Customer.filter({ wa_id: normalizedPhone }),
      base44.asServiceRole.entities.Customer.filter({ canonical_wa_id: normalizedPhone })
    ]);

    const unique = new Map();
    searches.flat().forEach((customer) => {
      if (customer?.id && customer.activo !== false) {
        unique.set(customer.id, customer);
      }
    });

    return [...unique.values()];
  };

  const chooseCanonicalCustomer = async (customers) => {
    if (customers.length === 0) return null;
    if (customers.length === 1) return customers[0];

    const scored = await Promise.all(customers.map(async (customer) => {
      const [messages, conversations, inquiries] = await Promise.all([
        base44.asServiceRole.entities.BitacoraWhatsApp.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.WhatsappConversation.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.ClientInquiry.filter({ customer_id: customer.id })
      ]);

      return {
        customer,
        score: (messages.length * 10) + (conversations.length * 3) + (inquiries.length * 5)
      };
    }));

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.customer.created_date || 0).getTime() - new Date(b.customer.created_date || 0).getTime();
    });

    return scored[0].customer;
  };

  const mergeCustomerIntoCanonical = async (canonical, duplicate) => {
    const [messages, conversations, inquiries, analyses] = await Promise.all([
      base44.asServiceRole.entities.BitacoraWhatsApp.filter({ customer_id: duplicate.id }),
      base44.asServiceRole.entities.WhatsappConversation.filter({ customer_id: duplicate.id }),
      base44.asServiceRole.entities.ClientInquiry.filter({ customer_id: duplicate.id }),
      base44.asServiceRole.entities.ConversationAnalysis.filter({ customer_id: duplicate.id })
    ]);

    for (const message of messages) {
      await base44.asServiceRole.entities.BitacoraWhatsApp.update(message.id, { customer_id: canonical.id });
    }

    for (const conversation of conversations) {
      await base44.asServiceRole.entities.WhatsappConversation.update(conversation.id, { customer_id: canonical.id });
    }

    for (const inquiry of inquiries) {
      await base44.asServiceRole.entities.ClientInquiry.update(inquiry.id, { customer_id: canonical.id });
    }

    for (const analysis of analyses) {
      await base44.asServiceRole.entities.ConversationAnalysis.update(analysis.id, { customer_id: canonical.id });
    }

    const mergeNote = `Merged into ${canonical.id} on ${new Date().toISOString()}`;
    await base44.asServiceRole.entities.Customer.update(duplicate.id, {
      activo: false,
      notes: duplicate.notes ? `${duplicate.notes}\n${mergeNote}` : mergeNote
    });
  };

  const ensureCanonicalCustomer = async ({ phone, customerName, channel = 'whatsapp' }) => {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return null;

    let customers = await listActiveCustomersByPhone(normalizedPhone);

    if (customers.length === 0) {
      await base44.asServiceRole.entities.Customer.create({
        full_name: customerName || 'Sin nombre',
        phone: normalizedPhone,
        normalized_phone: normalizedPhone,
        wa_id: normalizedPhone,
        canonical_wa_id: normalizedPhone,
        preferred_contact: 'whatsapp',
        source: 'whatsapp_bot',
        channel
      });
      customers = await listActiveCustomersByPhone(normalizedPhone);
    }

    const canonical = await chooseCanonicalCustomer(customers);
    if (!canonical) return null;

    const patch = {};
    if (!canonical.phone) patch.phone = normalizedPhone;
    if (!canonical.normalized_phone) patch.normalized_phone = normalizedPhone;
    if (!canonical.wa_id) patch.wa_id = normalizedPhone;
    if (!canonical.canonical_wa_id) patch.canonical_wa_id = normalizedPhone;
    if ((!canonical.full_name || canonical.full_name === 'Sin nombre') && customerName) patch.full_name = customerName;
    if (canonical.channel !== channel) patch.channel = channel;

    if (Object.keys(patch).length > 0) {
      await base44.asServiceRole.entities.Customer.update(canonical.id, patch);
    }

    for (const customer of customers) {
      if (customer.id !== canonical.id) {
        await mergeCustomerIntoCanonical(canonical, customer);
      }
    }

    const refreshed = await base44.asServiceRole.entities.Customer.filter({ id: canonical.id });
    return refreshed[0] || { ...canonical, ...patch };
  };

  const findCanonicalCustomer = async (phone) => {
    const customers = await listActiveCustomersByPhone(phone);
    return chooseCanonicalCustomer(customers);
  };

  // Soporte enriquecido (compatibilidad con nuevo formato de n8n)
  try {
    const rawPayload = data?.raw_payload || body;
    const metadata = rawPayload?.metadata || data?.metadata || {};
    const contacts = rawPayload?.contacts || data?.contacts || [];
    const messages = rawPayload?.messages || data?.messages || [];
    const messageEchoes = rawPayload?.message_echoes || data?.message_echoes || [];
    const statuses = rawPayload?.statuses || data?.statuses || [];
    const phoneNumberId = data?.phone_number_id || data?.meta?.phone_number_id || metadata?.phone_number_id || '';
    const channel = (data?.channel || 'whatsapp').toLowerCase();
    const channelId = normalizePhone(metadata?.display_phone_number || data?.display_phone_number || phoneNumberId || '');
    const tenantId = data?.tenant_id || body?.tenant_id || 'default';
    const customerName = data?.name || data?.customerName || data?.contact?.name || contacts?.[0]?.profile?.name || '';
    const contactPhone = normalizePhone(contacts?.[0]?.wa_id || messageEchoes?.[0]?.to || messages?.[0]?.from || data?.contact?.phone || data?.phone || data?.to || data?.from || data?.recipient_id || null);
    const reason = data?.reason || '';

    const normalizedEvents = [
      ...messages.map((msg) => ({
        parsed_type: msg?.reaction ? 'reaction' : 'inbound',
        event_type: msg?.reaction ? 'reaction' : (msg?.type && msg?.type !== 'text' ? 'media' : 'message'),
        meta_message_id: msg?.id || data?.message_id || data?.messageId || null,
        message_id: msg?.id || data?.message_id || data?.messageId || null,
        provider_message_id: msg?.id || data?.message_id || data?.messageId || null,
        status_event_id: null,
        direction: 'inbound',
        sender_type: 'customer',
        from_phone: msg?.from || contactPhone || '',
        to_phone: metadata?.display_phone_number || '',
        contact_phone: contacts?.[0]?.wa_id || msg?.from || contactPhone || '',
        wa_id: contacts?.[0]?.wa_id || msg?.from || contactPhone || '',
        author_phone: msg?.author_phone || null,
        message_type: msg?.reaction ? 'reaction' : (msg?.type || data?.message_type || 'text'),
        text: msg?.reaction ? '' : (msg?.text?.body || msg?.body || data?.message?.text || data?.message || ''),
        caption: msg?.image?.caption || msg?.video?.caption || data?.message?.caption || null,
        media_url: data?.media_url || msg?.image?.url || msg?.video?.url || msg?.audio?.url || msg?.document?.url || null,
        media_id: data?.media_id || msg?.image?.id || msg?.video?.id || msg?.audio?.id || msg?.document?.id || null,
        mime_type: data?.mime_type || msg?.image?.mime_type || msg?.video?.mime_type || msg?.audio?.mime_type || msg?.document?.mime_type || null,
        target_message_id: msg?.reaction?.message_id || null,
        reaction_emoji: msg?.reaction?.emoji || null,
        timestamp: msg?.timestamp || data?.timestamp || data?.meta?.timestamp || Date.now(),
        raw_payload: msg,
      })),
      ...messageEchoes.map((msg) => ({
        parsed_type: msg?.reaction ? 'reaction_echo' : 'outbound',
        event_type: msg?.reaction ? 'reaction' : 'message_echo',
        meta_message_id: msg?.id || null,
        message_id: msg?.id || null,
        provider_message_id: msg?.id || null,
        status_event_id: null,
        direction: 'outbound',
        sender_type: data?.sender_type || 'bot',
        from_phone: msg?.from || metadata?.display_phone_number || '',
        to_phone: msg?.to || contacts?.[0]?.wa_id || contactPhone || '',
        contact_phone: contacts?.[0]?.wa_id || msg?.to || contactPhone || '',
        wa_id: contacts?.[0]?.wa_id || msg?.to || contactPhone || '',
        author_phone: msg?.author_phone || null,
        message_type: msg?.reaction ? 'reaction' : (msg?.type || 'text'),
        text: msg?.reaction ? '' : (msg?.text?.body || ''),
        caption: msg?.image?.caption || msg?.video?.caption || null,
        media_url: msg?.image?.url || msg?.video?.url || msg?.audio?.url || msg?.document?.url || null,
        media_id: msg?.image?.id || msg?.video?.id || msg?.audio?.id || msg?.document?.id || null,
        mime_type: msg?.image?.mime_type || msg?.video?.mime_type || msg?.audio?.mime_type || msg?.document?.mime_type || null,
        target_message_id: msg?.reaction?.message_id || null,
        reaction_emoji: msg?.reaction?.emoji || null,
        timestamp: msg?.timestamp || Date.now(),
        raw_payload: msg,
      })),
      ...statuses.map((statusItem) => ({
        parsed_type: 'status',
        event_type: 'status',
        meta_message_id: statusItem?.id || null,
        message_id: statusItem?.id || null,
        provider_message_id: statusItem?.id || null,
        status_event_id: `${statusItem?.id || 'status'}_${statusItem?.status || 'unknown'}_${statusItem?.timestamp || Date.now()}`,
        direction: 'outbound',
        sender_type: 'bot',
        from_phone: metadata?.display_phone_number || '',
        to_phone: statusItem?.recipient_id || contactPhone || '',
        contact_phone: contacts?.[0]?.wa_id || statusItem?.recipient_id || contactPhone || '',
        wa_id: contacts?.[0]?.wa_id || statusItem?.recipient_id || contactPhone || '',
        author_phone: null,
        message_type: 'status',
        text: statusItem?.status || data?.status || '',
        caption: null,
        media_url: null,
        media_id: null,
        mime_type: null,
        target_message_id: statusItem?.id || null,
        reaction_emoji: null,
        timestamp: statusItem?.timestamp || data?.timestamp || Date.now(),
        raw_payload: statusItem,
      }))
    ];

    if (normalizedEvents.length > 0) {
      const results = [];

      for (const parsedEvent of normalizedEvents) {
        parsedEvent.from_phone = normalizePhone(parsedEvent.from_phone);
        parsedEvent.to_phone = normalizePhone(parsedEvent.to_phone);
        parsedEvent.contact_phone = normalizePhone(parsedEvent.contact_phone);
        parsedEvent.wa_id = normalizePhone(parsedEvent.wa_id);
        parsedEvent.event_type = normalizeEventType(parsedEvent);

        const tsNum = Number(parsedEvent.timestamp || Date.now());
        const timestampISO = new Date(tsNum < 1e12 ? tsNum * 1000 : tsNum).toISOString();
        const stableConversationKey = `${parsedEvent.contact_phone || 'unknown'}_${channelId || 'unknown'}`;

        console.log(`${parsedEvent.parsed_type} parsed`, JSON.stringify({
          meta_message_id: parsedEvent.meta_message_id,
          direction: parsedEvent.direction,
          sender_type: parsedEvent.sender_type,
          from_phone: parsedEvent.from_phone,
          to_phone: parsedEvent.to_phone,
          contact_phone: parsedEvent.contact_phone,
          conversation_key: stableConversationKey,
        }));

        const wh = await base44.asServiceRole.entities.WebhookEvent.create({
          event: event || '',
          event_type: parsedEvent.event_type,
          phone: parsedEvent.contact_phone || '',
          message_id: parsedEvent.message_id || '',
          direction: parsedEvent.direction,
          conversation_key: stableConversationKey,
          reason: reason || '',
          raw_payload: JSON.stringify(parsedEvent.raw_payload || {})
        });

        const customer = parsedEvent.contact_phone
          ? await ensureCanonicalCustomer({
              phone: parsedEvent.contact_phone,
              customerName,
              channel
            })
          : null;

        let conv = null;
        if (customer) {
          const exactConvs = await base44.asServiceRole.entities.WhatsappConversation.filter({ customer_id: customer.id, subject: stableConversationKey });
          const openConvs = exactConvs.length > 0
            ? exactConvs
            : await base44.asServiceRole.entities.WhatsappConversation.filter({ customer_id: customer.id, is_open: true });

          const matchedConv = openConvs
            .filter((item) => item.subject === stableConversationKey || item.subject?.startsWith(`${parsedEvent.contact_phone}_`) || item.notes?.includes(`ck:${parsedEvent.contact_phone}_`))
            .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime())[0];

          conv = matchedConv || await base44.asServiceRole.entities.WhatsappConversation.create({
            customer_id: customer.id,
            is_open: true,
            channel: 'whatsapp',
            last_message_at: timestampISO,
            notes: `ck:${stableConversationKey}`,
            subject: stableConversationKey
          });

          if (conv.subject !== stableConversationKey || conv.notes !== `ck:${stableConversationKey}`) {
            await base44.asServiceRole.entities.WhatsappConversation.update(conv.id, {
              subject: stableConversationKey,
              notes: `ck:${stableConversationKey}`
            });
          }

          await addTimelineEvent({
            conversationId: conv.id,
            eventType: 'pipeline_webhook_received',
            title: 'Webhook recibido',
            description: `${parsedEvent.event_type} ${parsedEvent.direction === 'inbound' ? 'entrante' : 'saliente'}`,
            relatedEntityId: wh.id,
            metadata: { status: 'success', webhook_event_id: wh.id, event_type: parsedEvent.event_type }
          });
          await addTimelineEvent({
            conversationId: conv.id,
            eventType: 'pipeline_conversation_grouped',
            title: 'Conversación agrupada',
            description: stableConversationKey,
            relatedEntityId: conv.id,
            metadata: { status: 'success', conversation_key: stableConversationKey }
          });
        }

        const duplicateCandidates = parsedEvent.provider_message_id
          ? await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ provider_message_id: parsedEvent.provider_message_id })
          : [];
        const duplicateByMessage = parsedEvent.message_id
          ? await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ message_id: parsedEvent.message_id })
          : [];
        const duplicateByStatus = parsedEvent.status_event_id
          ? await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ status_event_id: parsedEvent.status_event_id })
          : [];
        const duplicateWebhookEvent = parsedEvent.message_id
          ? await base44.asServiceRole.entities.WebhookEvent.filter({ message_id: parsedEvent.message_id, event_type: parsedEvent.event_type, conversation_key: stableConversationKey })
          : [];
        const duplicate = duplicateCandidates[0] || duplicateByMessage[0] || duplicateByStatus[0] || null;
        const isDuplicateWebhook = duplicateWebhookEvent.length > 1;

        if (duplicate || isDuplicateWebhook) {
          console.log('duplicate skipped', JSON.stringify({ message_id: parsedEvent.message_id, meta_message_id: parsedEvent.meta_message_id, event_type: parsedEvent.event_type }));
          if (parsedEvent.event_type === 'status') {
            await base44.asServiceRole.entities.BitacoraWhatsApp.update(duplicate.id, {
              delivery_status: (parsedEvent.text || '').toLowerCase(),
              timestamp: timestampISO,
              status_event_id: parsedEvent.status_event_id || duplicate.status_event_id,
              provider_timestamp: String(parsedEvent.timestamp || ''),
              event_type: 'status',
              target_message_id: parsedEvent.target_message_id || duplicate.target_message_id
            });
          }
          await base44.asServiceRole.entities.WebhookEvent.update(wh.id, { processed_ok: true });
          results.push({ webhook_event_id: wh.id, duplicate: true, conversation_id: conv?.id || null, message_id: duplicate.id });
          continue;
        }

        let savedMsg = null;
        if (['message', 'media', 'reaction', 'message_echo'].includes(parsedEvent.event_type)) {
          savedMsg = await base44.asServiceRole.entities.BitacoraWhatsApp.create({
            mensaje_id: parsedEvent.message_id || parsedEvent.meta_message_id || `${parsedEvent.contact_phone || 'unk'}_${Date.now()}`,
            message_id: parsedEvent.meta_message_id || parsedEvent.message_id || `${parsedEvent.contact_phone || 'unk'}_${Date.now()}`,
            provider_message_id: parsedEvent.provider_message_id || parsedEvent.message_id || parsedEvent.meta_message_id || null,
            status_event_id: parsedEvent.status_event_id || null,
            customer_id: customer?.id || null,
            conversation_id: conv?.id || null,
            trabajo_id: null,
            job_id: null,
            wa_id: parsedEvent.wa_id || parsedEvent.contact_phone || '',
            from_phone: parsedEvent.from_phone || '',
            to_phone: parsedEvent.to_phone || '',
            contact_phone: parsedEvent.contact_phone || '',
            author_phone: parsedEvent.author_phone || null,
            phone: parsedEvent.contact_phone || '',
            texto_mensaje: parsedEvent.event_type === 'reaction' ? '' : (parsedEvent.text || ''),
            text: parsedEvent.event_type === 'reaction' ? '' : (parsedEvent.text || ''),
            caption: parsedEvent.caption || null,
            media_url: parsedEvent.media_url || null,
            media_id: parsedEvent.media_id || null,
            mime_type: parsedEvent.mime_type || null,
            timestamp: timestampISO,
            message_timestamp: timestampISO,
            provider_timestamp: String(parsedEvent.timestamp || ''),
            meta_timestamp: String(parsedEvent.timestamp || ''),
            message_type: parsedEvent.message_type || 'text',
            event_type: parsedEvent.event_type,
            target_message_id: parsedEvent.target_message_id || null,
            reaction_emoji: parsedEvent.reaction_emoji || null,
            channel,
            channel_id: channelId,
            tenant_id: tenantId,
            direction: parsedEvent.direction,
            sender_type: parsedEvent.sender_type,
            raw_payload: JSON.stringify(parsedEvent.raw_payload || {})
          });

          if (conv) {
            await base44.asServiceRole.entities.WhatsappConversation.update(conv.id, {
              last_message_at: timestampISO,
              last_message_id: savedMsg.id,
              subject: stableConversationKey,
              notes: `ck:${stableConversationKey}`
            });
          }
        }

        if (parsedEvent.event_type === 'status') {
          await base44.asServiceRole.entities.DeliveryReceipt.create({
            provider_message_id: parsedEvent.meta_message_id || parsedEvent.message_id || '',
            recipient_id: parsedEvent.contact_phone || '',
            status: (parsedEvent.text || '').toLowerCase() || 'sent',
            timestamp: timestampISO,
            raw_payload: JSON.stringify(parsedEvent.raw_payload || {})
          });
          if (conv) {
            await base44.asServiceRole.entities.WhatsappConversation.update(conv.id, { last_message_at: timestampISO });
          }
        }

        if (conv?.id && ['message', 'media', 'message_echo', 'reaction', 'status'].includes(parsedEvent.event_type) && !isDuplicateWebhook) {
          const timelineTitle = parsedEvent.event_type === 'reaction'
            ? 'Reacción recibida'
            : parsedEvent.event_type === 'status'
              ? 'Estado de entrega actualizado'
              : parsedEvent.event_type === 'media'
                ? 'Archivo recibido'
                : parsedEvent.event_type === 'message_echo'
                  ? 'Mensaje enviado por equipo'
                  : 'Mensaje recibido';
          const timelineDescription = parsedEvent.event_type === 'reaction'
            ? `${parsedEvent.reaction_emoji || ''} sobre ${parsedEvent.target_message_id || 'mensaje'}`
            : parsedEvent.event_type === 'status'
              ? (parsedEvent.text || 'actualización de entrega')
              : (parsedEvent.text || parsedEvent.caption || parsedEvent.message_type || 'evento WhatsApp');
          await base44.asServiceRole.entities.ConversationTimelineEvent.create({
            conversation_id: conv.id,
            event_type: parsedEvent.event_type,
            title: timelineTitle,
            description: timelineDescription,
            source: 'webhook',
            related_entity_id: savedMsg?.id || null,
            metadata_json: JSON.stringify({
              direction: parsedEvent.direction,
              sender_type: parsedEvent.sender_type,
              message_type: parsedEvent.message_type,
              target_message_id: parsedEvent.target_message_id || null,
              delivery_status: parsedEvent.event_type === 'status' ? (parsedEvent.text || '').toLowerCase() : null
            })
          });
        }

        if (conv?.id && hasUsefulCustomerContent({
          eventType: parsedEvent.event_type,
          messageType: parsedEvent.message_type,
          text: parsedEvent.text,
          caption: parsedEvent.caption,
          mediaUrl: parsedEvent.media_url,
          direction: parsedEvent.direction,
          senderType: parsedEvent.sender_type
        })) {
          try {
            await base44.asServiceRole.functions.invoke('analyzeConversation', {
              conversation_id: conv.id,
              customer_id: customer?.id || null,
              inquiry_id: null,
              phone: parsedEvent.contact_phone || null,
              trigger_reason: parsedEvent.event_type === 'media' ? 'new_customer_media' : 'new_customer_message',
              internal_invocation: true
            });
          } catch (error) {
            await logPipelineFailure({
              conversationId: conv.id,
              sourceName: 'analyzeConversation',
              eventType: 'pipeline_analysis_failed',
              message: 'Falló el análisis IA automático',
              details: error.message,
              relatedEntityId: savedMsg?.id || wh.id,
              relatedEntity: 'WhatsappConversation'
            });
          }
        }

        await base44.asServiceRole.entities.WebhookEvent.update(wh.id, { processed_ok: true });
        results.push({ webhook_event_id: wh.id, duplicate: false, conversation_id: conv?.id || null, message_id: savedMsg?.id || null, event_type: parsedEvent.event_type });
      }

      return Response.json({ ok: true, parsed: results });
    }
  } catch (e) {
    // Si falla el nuevo formato, continuamos con el switch clásico
    console.warn('Enriched handler failed, falling back to legacy:', e?.message || e);
  }

  if (!event || !data) {
    console.log('fallback triggered', JSON.stringify({ reason: 'Missing event or data fields' }));
    return Response.json({ error: 'Missing event or data fields' }, { status: 400 });
  }

  console.log(`📥 N8N Event: ${event}`, JSON.stringify(data).slice(0, 200));

  try {
    switch (event) {

      // ─────────────────────────────────────────────
      // 1. NUEVO LEAD desde WhatsApp/Ads
      // ─────────────────────────────────────────────
      case 'new_lead': {
        const { phone, name, message, lead_source = 'ads', rubro = 'Hogar', location } = data;

        if (!phone) return Response.json({ error: 'phone is required' }, { status: 400 });

        const normalizedPhone = normalizePhone(phone);
        const existing = await listActiveCustomersByPhone(normalizedPhone);
        const customer = await ensureCanonicalCustomer({
          phone: normalizedPhone,
          customerName: name,
          channel: 'whatsapp'
        });

        if (existing.length > 0) {
          console.log(`♻️ Cliente existente encontrado: ${customer.id}`);
        } else {
          console.log(`✅ Nuevo cliente creado: ${customer.id}`);
        }

        // Crear ClientInquiry (trabajo/solicitud)
        const inquiry = await base44.asServiceRole.entities.ClientInquiry.create({
          customer_id: customer.id,
          client_name: customer.full_name,
          phone: customer.phone,
          lead_source,
          source: 'whatsapp_bot',
          rubro,
          message: message || '',
          status: 'nuevo',
          priority: 'media',
          ...(location && { location }),
        });

        // Registrar en bitácora
        await base44.asServiceRole.entities.ProgressLog.create({
          inquiry_id: inquiry.id,
          log_type: 'whatsapp',
          message_text: message || '(sin mensaje)',
          from_phone: phone,
          timestamp: new Date().toISOString(),
          created_by: 'n8n_bot',
        });

        // Track new lead creation via WhatsApp
        await base44.analytics.track({
          eventName: 'whatsapp_new_lead_created',
          properties: {
            lead_source,
            rubro,
            is_new_customer: existing.length === 0,
            has_message: !!message,
          },
        });

        return Response.json({
          success: true,
          event,
          customer_id: customer.id,
          inquiry_id: inquiry.id,
          is_new_customer: existing.length === 0,
        });
      }

      // ─────────────────────────────────────────────
      // 2. MENSAJE RECIBIDO (guardar conversación)
      // ─────────────────────────────────────────────
      case 'message_received': {
        // Safe logging (no PII beyond phone + preview)
        try {
          const preview = typeof data?.message === 'string' ? data.message.slice(0, 60) : (typeof data?.text === 'string' ? data.text.slice(0, 60) : undefined);
          console.log('📥 message_received payload (safe):', JSON.stringify({ phone: data?.phone || data?.from || data?.wa_id, preview, hasSource: !!data?.source }).slice(0, 200));
        } catch {}

        const {
          phone,
          message,
          messageId,
          from,
          wa_id,
          text,
          timestamp,
          message_type = 'text',
          customerHints,
          source
        } = data;

        const resolvedPhone = phone || from || wa_id;
        const resolvedMessage = message || text;

        if (!resolvedPhone || !resolvedMessage) {
          return Response.json({ error: 'phone and message are required' }, { status: 400 });
        }

        const normalizedPhone = normalizePhone(resolvedPhone);
        const stableConversationKey = `${normalizedPhone || 'unknown'}_legacy`;
        const webhookLog = await base44.asServiceRole.entities.WebhookEvent.create({
          event: event || 'message_received',
          event_type: ['image', 'video', 'audio', 'document'].includes(message_type) ? 'media' : 'message',
          phone: normalizedPhone || '',
          message_id: messageId || '',
          direction: 'inbound',
          conversation_key: stableConversationKey,
          reason: 'legacy_message_received',
          raw_payload: safeStringify(data)
        });

        // 1) Upsert Customer by phone or wa_id
        const customer = await ensureCanonicalCustomer({
          phone: resolvedPhone,
          customerName: customerHints?.name,
          channel: 'whatsapp'
        });

        // 4) Create or reuse open conversation
        const openConvs = await base44.asServiceRole.entities.WhatsappConversation.filter({ customer_id: customer.id, is_open: true });
        const nowISO = timestamp ? new Date((String(timestamp).length < 13 ? Number(timestamp) * 1000 : Number(timestamp))).toISOString() : new Date().toISOString();
        let conversation = openConvs.find((item) => item.subject === stableConversationKey || item.notes?.includes(`ck:${stableConversationKey}`)) || openConvs[0];
        if (!conversation) {
          conversation = await base44.asServiceRole.entities.WhatsappConversation.create({
            customer_id: customer.id,
            is_open: true,
            channel: 'whatsapp',
            last_message_at: nowISO,
            notes: `ck:${stableConversationKey}`,
            subject: stableConversationKey
          });
        } else if (conversation.subject !== stableConversationKey || conversation.notes !== `ck:${stableConversationKey}`) {
          await base44.asServiceRole.entities.WhatsappConversation.update(conversation.id, {
            subject: stableConversationKey,
            notes: `ck:${stableConversationKey}`
          });
        }

        await addTimelineEvent({
          conversationId: conversation.id,
          eventType: 'pipeline_webhook_received',
          title: 'Webhook recibido',
          description: 'message_received entrante',
          relatedEntityId: webhookLog.id,
          metadata: { status: 'success', webhook_event_id: webhookLog.id, event_type: 'message' }
        });
        await addTimelineEvent({
          conversationId: conversation.id,
          eventType: 'pipeline_conversation_grouped',
          title: 'Conversación agrupada',
          description: stableConversationKey,
          relatedEntityId: conversation.id,
          metadata: { status: 'success', conversation_key: stableConversationKey }
        });

        // Heuristics: classify service, detect priority, compute missing info & next step
        const txt = (resolvedMessage || '').toLowerCase();
        const has = (s) => txt.includes(s);
        const hasAny = (...arr) => arr.some((k) => has(k));
        const classify = () => {
          if (hasAny('impermeab', 'filtra', 'gotera', 'humedad', 'techo', 'membrana', 'manto')) return 'impermeabilizacion';
          if (hasAny('cisterna', 'tanque', 'aljibe')) return 'limpieza_cisterna';
          if (hasAny('trampa de grasa', 'trampa grasa', 'grasa') || (has('restaurante') && has('grasa'))) return 'trampa_grasa';
          if (hasAny('remodel', 'azulej', 'cerám', 'ceram', 'constru', 'ampliaci')) return 'remodelacion';
          if (hasAny('cotiz', 'presupuesto', 'inspecc', 'evaluar', 'visita')) return 'inspeccion / cotizacion';
          if (hasAny('mantenim', 'fuga', 'tuber', 'plomer', 'electric', 'pintur', 'reparar', 'arreglar')) return 'mantenimiento_general';
          return 'unknown';
        };
        const detectPriority = () => hasAny('urgente', 'emerg', 'inund', 'fuga', 'ya', 'ahora', 'hoy') ? 'urgente' : 'media';
        const hasPhotos = hasAny('foto', 'imagen', 'video');
        const hasMeasurements = hasAny('m2', 'metros', 'medida', 'dimension', 'ancho', 'largo', 'alto', 'cm', 'mt', 'metro');
        const hasLocation = hasAny('ubic', 'direc', 'colonia', 'mapa', 'waze', 'google maps', 'san salvador', 'sss') || /\d{2}\.?\d*,\s?-?\d{2}\.?\d*/.test(txt);
        const hasSchedule = hasAny('hora', 'cita', 'cuando', 'mañana', 'tarde', 'hoy', 'fecha', 'programar', 'agendar');

        const serviceType = classify();
        const priority = detectPriority();
        const missing = [];
        const needsPhotos = ['impermeabilizacion', 'remodelacion', 'trampa_grasa', 'limpieza_cisterna'].includes(serviceType);
        const needsMeasurements = ['impermeabilizacion', 'remodelacion', 'limpieza_cisterna'].includes(serviceType);
        if (needsPhotos && !hasPhotos) missing.push('photos');
        if (needsMeasurements && !hasMeasurements) missing.push('measurements');
        if (!hasLocation) missing.push('location');
        if (!hasSchedule) missing.push('schedule');

        const nextStep = (() => {
          if (priority === 'urgente') return 'escalate_to_human';
          if (missing.includes('photos')) return 'ask_for_photos';
          if (missing.includes('measurements')) return 'ask_for_measurements';
          if (missing.includes('location')) return 'ask_for_location';
          if (missing.includes('schedule')) return 'ask_for_schedule';
          return 'prepare_quote';
        })();

        // 2) Create or reuse OPEN inquiry and attach message
        const openStatuses = [
          'nuevo','pendiente_cotizacion','pendiente_agenda','evaluacion_agendada','evaluacion_pendiente','evaluacion_realizada',
          'cotizacion_pendiente','cotizacion_realizada','pendiente_aprobacion','trabajo_aprobado','agendado','en_ruta','en_sitio','en_proceso'
        ];
        const allInquiries = await base44.asServiceRole.entities.ClientInquiry.filter({ customer_id: customer.id });
        let inquiry = allInquiries.find(j => openStatuses.includes(j.status));
        if (!inquiry) {
          inquiry = await base44.asServiceRole.entities.ClientInquiry.create({
            customer_id: customer.id,
            client_name: customer.full_name,
            phone: customer.phone,
            source_conversation_id: conversation.id,
            lead_source: (source?.platform === 'whatsapp' ? 'whatsapp' : 'whatsapp'),
            source: 'whatsapp_bot',
            rubro: 'Hogar',
            message: resolvedMessage,
            descripcion_libre: resolvedMessage,
            status: 'nuevo',
            priority,
            service_type: serviceType,
            next_step: nextStep,
            missing_info: missing,
            ...(source?.ad_id ? { ad_id: source.ad_id } : {}),
            ...(source?.ad_name ? { ad_name: source.ad_name } : {}),
            ...(source?.campaign_id ? { campaign_id: source.campaign_id } : {}),
            ...(source?.entryPoint ? { entry_point: source.entryPoint } : {}),
            ...(source?.entry_point ? { entry_point: source.entry_point } : {})
          });
        } else {
          // Update inquiry with latest context if fields are empty
          const patch = { last_message_at: nowISO };
          if (!inquiry.source_conversation_id) patch.source_conversation_id = conversation.id;
          if (!inquiry.service_type && serviceType !== 'unknown') patch.service_type = serviceType;
          if (!inquiry.next_step) patch.next_step = nextStep;
          if (!Array.isArray(inquiry.missing_info) || inquiry.missing_info.length === 0) patch.missing_info = missing;
          if (priority === 'urgente' && inquiry.priority !== 'urgente') patch.priority = 'urgente';
          if (Object.keys(patch).length > 0) {
            await base44.asServiceRole.entities.ClientInquiry.update(inquiry.id, patch);
          }
        }

        // 2) + 3) Store message in BitacoraWhatsApp with optional ad source, link to conversation & inquiry
        const incomingMensajeId = messageId || `${resolvedPhone}_${Date.now()}`;
        if (messageId) {
          const dup = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ mensaje_id: messageId });
          if (dup.length > 0) {
            await base44.asServiceRole.entities.WhatsappConversation.update(conversation.id, { last_message_at: nowISO, last_message_id: dup[0].id });
            await base44.asServiceRole.entities.WebhookEvent.update(webhookLog.id, { processed_ok: true });
            return Response.json({ success: true, event, customer_id: customer.id, inquiry_id: inquiry.id, service_type: serviceType, next_step: nextStep, missing_info: missing, conversation_id: conversation.id, message_id: dup[0].id, duplicate: true });
          }
        }

        // Descarga y guarda medios si aplica
        let mediaUrl = null;
        let mimeType = data.mime_type || data.image?.mime_type || data.video?.mime_type || data.audio?.mime_type || data.document?.mime_type || null;
        const mediaId = data.media_id || data.image?.id || data.video?.id || data.audio?.id || data.document?.id || null;
        const caption = data.caption || data.image?.caption || data.video?.caption || null;
        const messageTypeGuessed = message_type || (data.image ? 'image' : data.video ? 'video' : data.audio ? 'audio' : data.document ? 'document' : 'text');

        try {
          const waToken = Deno.env.get('META_WHATSAPP_TOKEN');
          if (mediaId && waToken) {
            // 1) Obtener URL temporal del media
            const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
              headers: { Authorization: `Bearer ${waToken}` }
            });
            if (metaRes.ok) {
              const metaJson = await metaRes.json();
              if (metaJson.url) {
                const binRes = await fetch(metaJson.url, { headers: { Authorization: `Bearer ${waToken}` } });
                if (binRes.ok) {
                  const blob = await binRes.blob();
                  const fileName = `${mediaId}.${(mimeType || '').split('/')[1] || 'bin'}`;
                  const file = new File([blob], fileName, { type: mimeType || 'application/octet-stream' });
                  const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
                  mediaUrl = uploaded.file_url;
                }
              }
            }
          } else if (data.media_url) {
            // Re-subir media remoto para tener URL propia
            const remoteRes = await fetch(data.media_url);
            if (remoteRes.ok) {
              const blob = await remoteRes.blob();
              const ext = (mimeType || 'application/octet-stream').split('/')[1] || 'bin';
              const file = new File([blob], `wa_${Date.now()}.${ext}`, { type: mimeType || 'application/octet-stream' });
              const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
              mediaUrl = uploaded.file_url;
            }
          }
        } catch (e) {
          console.warn('Media handling failed:', e?.message || e);
        }

        const msgRecord = await base44.asServiceRole.entities.BitacoraWhatsApp.create({
          mensaje_id: incomingMensajeId,
          message_id: messageId || incomingMensajeId,
          customer_id: customer.id,
          conversation_id: conversation.id,
          trabajo_id: inquiry.id,
          job_id: inquiry.id,
          from_phone: resolvedPhone,
          phone: resolvedPhone,
          texto_mensaje: resolvedMessage,
          text: resolvedMessage,
          caption: caption || null,
          media_url: mediaUrl,
          mime_type: mimeType,
          timestamp: nowISO,
          message_type: messageTypeGuessed,
          is_group: false,
          procesado: false,
          channel: 'whatsapp',
          direction: 'inbound',
          sender_type: 'customer',
          raw_payload: JSON.stringify(data),
          ...(source?.ad_id ? { ad_id: source.ad_id } : {}),
          ...(source?.ad_name ? { ad_name: source.ad_name } : {}),
          ...(source?.campaign_id ? { campaign_id: source.campaign_id } : {}),
          ...(source?.entryPoint ? { entry_point: source.entryPoint } : {}),
          ...(source?.entry_point ? { entry_point: source.entry_point } : {})
        });

        await base44.asServiceRole.entities.WhatsappConversation.update(conversation.id, {
          last_message_at: nowISO,
          last_message_id: msgRecord.id,
          subject: stableConversationKey,
          notes: `ck:${stableConversationKey}`
        });

        if (hasUsefulCustomerContent({
          eventType: ['image', 'video', 'audio', 'document'].includes(messageTypeGuessed) ? 'media' : 'message',
          messageType: messageTypeGuessed,
          text: resolvedMessage,
          caption,
          mediaUrl,
          direction: 'inbound',
          senderType: 'customer'
        })) {
          try {
            await base44.asServiceRole.functions.invoke('analyzeConversation', {
              conversation_id: conversation.id,
              customer_id: customer.id,
              inquiry_id: inquiry.id,
              phone: customer.phone || normalizedPhone || null,
              trigger_reason: ['image', 'video', 'audio', 'document'].includes(messageTypeGuessed) ? 'legacy_customer_media' : 'legacy_customer_message',
              internal_invocation: true
            });
          } catch (error) {
            await logPipelineFailure({
              conversationId: conversation.id,
              sourceName: 'analyzeConversation',
              eventType: 'pipeline_analysis_failed',
              message: 'Falló el análisis IA automático',
              details: error.message,
              relatedEntityId: msgRecord.id,
              relatedEntity: 'ClientInquiry'
            });
          }
        }

        await base44.asServiceRole.entities.WebhookEvent.update(webhookLog.id, { processed_ok: true });

        return Response.json({
          success: true,
          event,
          customer_id: customer.id,
          inquiry_id: inquiry.id,
          service_type: serviceType,
          next_step: nextStep,
          missing_info: missing,
          conversation_id: conversation.id,
          message_id: msgRecord.id
        });
      }

      // ─────────────────────────────────────────────
      // 3. ACTUALIZACIÓN DE ESTADO del trabajo
      // ─────────────────────────────────────────────
      case 'status_update': {
        const { inquiry_id, status, notes, employee_id } = data;

        if (!inquiry_id || !status) return Response.json({ error: 'inquiry_id and status are required' }, { status: 400 });

        const updateData = { status };
        if (notes) updateData.notes = notes;
        if (employee_id) updateData.assigned_to_employee_id = employee_id;

        await base44.asServiceRole.entities.ClientInquiry.update(inquiry_id, updateData);

        // Registrar el cambio en bitácora
        await base44.asServiceRole.entities.ProgressLog.create({
          inquiry_id,
          log_type: 'cambio_estado',
          message_text: `Estado actualizado a: ${status}${notes ? ` | Nota: ${notes}` : ''}`,
          timestamp: new Date().toISOString(),
          created_by: 'n8n_bot',
        });

        return Response.json({ success: true, event, inquiry_id, new_status: status });
      }

      // ─────────────────────────────────────────────
      // 4. PAGO CONFIRMADO
      // ─────────────────────────────────────────────
      case 'payment_confirmed': {
        const { inquiry_id, amount, payment_method = 'efectivo', notes, collected_by } = data;

        if (!inquiry_id || !amount) return Response.json({ error: 'inquiry_id and amount are required' }, { status: 400 });

        const payment = await base44.asServiceRole.entities.Payment.create({
          inquiry_id,
          amount_paid: parseFloat(amount),
          payment_method,
          payment_date: new Date().toISOString().split('T')[0],
          notes: notes || '',
          collected_by: collected_by || 'n8n_bot',
          recorded_by: 'n8n_bot',
        });

        // Actualizar estado del trabajo a pagado
        await base44.asServiceRole.entities.ClientInquiry.update(inquiry_id, {
          payment_status: 'pagado',
        });

        return Response.json({ success: true, event, payment_id: payment.id });
      }

      // ─────────────────────────────────────────────
      // 5. CONSULTA DE CLIENTE (para contexto del bot)
      // ─────────────────────────────────────────────
      case 'customer_query': {
        const { phone, customer_id } = data;

        if (!phone && !customer_id) return Response.json({ error: 'phone or customer_id required' }, { status: 400 });

        let customer = null;
        if (customer_id) {
          const results = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
          customer = results[0] || null;
        } else {
          customer = await findCanonicalCustomer(phone);
        }

        if (!customer) {
          return Response.json({ success: true, found: false, customer: null, active_jobs: [] });
        }

        // Obtener trabajos activos
        const activeStatuses = ['nuevo', 'agendado', 'en_ruta', 'en_sitio', 'en_proceso', 'pendiente_aprobacion', 'trabajo_aprobado'];
        const allJobs = await base44.asServiceRole.entities.ClientInquiry.filter({ customer_id: customer.id });
        const activeJobs = allJobs.filter(j => activeStatuses.includes(j.status));
        const recentJobs = allJobs.slice(0, 5); // últimos 5

        return Response.json({
          success: true,
          found: true,
          customer: {
            id: customer.id,
            full_name: customer.full_name,
            phone: customer.phone,
            customer_type: customer.customer_type,
            total_jobs: customer.total_jobs || allJobs.length,
            is_vip: customer.is_vip,
            status: customer.status,
          },
          active_jobs: activeJobs.map(j => ({
            id: j.id,
            status: j.status,
            rubro: j.rubro,
            message: j.message,
            scheduled_date: j.scheduled_date,
          })),
          recent_jobs: recentJobs.map(j => ({
            id: j.id,
            status: j.status,
            rubro: j.rubro,
            final_amount: j.final_amount,
            scheduled_date: j.scheduled_date,
          })),
        });
      }

      // ─────────────────────────────────────────────
      // 6. IDENTIFICAR REMITENTE (quién escribe)
      // Llama esto PRIMERO antes de procesar cualquier mensaje
      // ─────────────────────────────────────────────
      case 'identify_sender': {
        const { phone } = data;
        if (!phone) return Response.json({ error: 'phone is required' }, { status: 400 });

        // 1. Buscar en TrustedDirectory (CEO, técnico, corporativo, admin)
        const trusted = await base44.asServiceRole.entities.TrustedDirectory.filter({ phone_number: phone, active: true });
        if (trusted.length > 0) {
          const u = trusted[0];
          return Response.json({
            success: true,
            identified: true,
            role: u.role,
            name: u.name,
            related_id: u.related_id,
            action: roleToAction(u.role),
          });
        }

        // 2. Buscar en clientes existentes
        const c = await findCanonicalCustomer(phone);
        if (c) {
          const isCorporate = c.customer_type === 'corporativo' || c.customer_type === 'contrato' || c.customer_type === 'comercial';
          return Response.json({
            success: true,
            identified: true,
            role: isCorporate ? 'corporate_customer' : 'recurring_customer',
            name: c.full_name,
            related_id: c.id,
            customer_type: c.customer_type,
            is_vip: c.is_vip,
            action: isCorporate ? 'corporate_flow' : 'handle_existing_customer',
          });
        }

        // 3. Número desconocido = lead nuevo
        return Response.json({
          success: true,
          identified: false,
          role: 'new_lead',
          name: null,
          related_id: null,
          action: 'handle_new_lead',
        });
      }

      // ─────────────────────────────────────────────
      // 7. MENSAJE DE GRUPO DE TRABAJO
      // Guarda mensajes de grupos de WhatsApp de técnicos
      // ─────────────────────────────────────────────
      case 'group_message': {
        const { group_phone, author_phone, message, message_id, media_url, inquiry_id } = data;

        if (!group_phone || !message) return Response.json({ error: 'group_phone and message required' }, { status: 400 });

        // Intentar identificar el autor dentro del grupo
        const trusted = await base44.asServiceRole.entities.TrustedDirectory.filter({ phone_number: author_phone, active: true });
        const authorName = trusted.length > 0 ? trusted[0].name : author_phone;

        // Guardar en BitacoraWhatsApp como mensaje de grupo
        await base44.asServiceRole.entities.BitacoraWhatsApp.create({
          mensaje_id: message_id || `grp_${group_phone}_${Date.now()}`,
          trabajo_id: inquiry_id || null,
          from_phone: group_phone,
          author_phone: author_phone || null,
          texto_mensaje: `[${authorName}] ${message}`,
          media_url: media_url || null,
          timestamp: new Date().toISOString(),
          message_type: media_url ? 'image' : 'text',
          is_group: true,
          procesado: !!inquiry_id,
        });

        // Si está vinculado a un trabajo, también en ProgressLog
        if (inquiry_id) {
          await base44.asServiceRole.entities.ProgressLog.create({
            inquiry_id,
            log_type: 'whatsapp',
            message_text: message,
            from_phone: group_phone,
            author_phone: author_phone || null,
            timestamp: new Date().toISOString(),
            ...(media_url && { media_url }),
            notes: `Grupo: ${group_phone} | Autor: ${authorName}`,
            created_by: 'n8n_bot',
          });
        }

        // Registrar metadatos extendidos
        await base44.asServiceRole.entities.BitacoraWhatsApp.create({
          mensaje_id: message_id || `grp_${group_phone}_${Date.now()}`,
          message_id: message_id || `grp_${group_phone}_${Date.now()}`,
          from_phone: group_phone,
          phone: group_phone,
          customer_id: null,
          trabajo_id: inquiry_id || null,
          job_id: inquiry_id || null,
          texto_mensaje: `[${authorName}] ${message}`,
          text: `[${authorName}] ${message}`,
          media_url: media_url || null,
          mime_type: null,
          timestamp: new Date().toISOString(),
          message_type: media_url ? 'image' : 'text',
          channel: 'whatsapp',
          direction: 'inbound',
          sender_type: 'agent',
          is_group: true,
          procesado: !!inquiry_id,
          raw_payload: JSON.stringify(data)
        });

        return Response.json({ success: true, event, author_identified: trusted.length > 0, author_name: authorName });
      }

      // ─────────────────────────────────────────────
      // 8. MARCAR CONVERSACIÓN PARA REVISIÓN HUMANA
      // Cuando el bot no puede resolver o detecta urgencia
      // ─────────────────────────────────────────────
      case 'flag_for_review': {
        const { inquiry_id, phone, reason, priority = 'media' } = data;

        if (!inquiry_id && !phone) return Response.json({ error: 'inquiry_id or phone required' }, { status: 400 });

        let targetInquiryId = inquiry_id;

        // Si no hay inquiry_id pero hay phone, buscar el trabajo activo más reciente
        if (!targetInquiryId && phone) {
          const customer = await findCanonicalCustomer(phone);
          if (customer) {
            const jobs = await base44.asServiceRole.entities.ClientInquiry.filter({ customer_id: customer.id });
            const active = jobs.find(j => ['nuevo', 'pendiente_agenda', 'agendado'].includes(j.status));
            targetInquiryId = active?.id || jobs[0]?.id;
          }
        }

        if (targetInquiryId) {
          await base44.asServiceRole.entities.ClientInquiry.update(targetInquiryId, {
            priority: priority === 'urgente' ? 'urgente' : 'alta',
            notes: `⚠️ REQUIERE REVISIÓN: ${reason || 'Bot no pudo resolver'} | ${new Date().toLocaleString('es-SV')}`,
          });

          await base44.asServiceRole.entities.ProgressLog.create({
            inquiry_id: targetInquiryId,
            log_type: 'coordinacion',
            message_text: `⚠️ Conversación marcada para revisión humana. Motivo: ${reason || 'No especificado'}`,
            timestamp: new Date().toISOString(),
            created_by: 'n8n_bot',
          });
        }

        return Response.json({ success: true, event, inquiry_id: targetInquiryId, flagged: true });
      }

      // ─────────────────────────────────────────────
      // 9. CONSULTA DE SERVICIOS Y PRECIOS
      // ─────────────────────────────────────────────
      case 'service_query': {
        const { rubro, service_name } = data;

        let services = await base44.asServiceRole.entities.Service.filter({ is_active: true });

        if (rubro) {
          services = services.filter(s => s.rubros && s.rubros.includes(rubro));
        }
        if (service_name) {
          services = services.filter(s => s.service_name?.toLowerCase().includes(service_name.toLowerCase()));
        }

        return Response.json({
          success: true,
          count: services.length,
          services: services.map(s => ({
            id: s.id,
            service_name: s.service_name,
            rubros: s.rubros,
            base_price: s.base_price,
            price_range_min: s.price_range_min,
            price_range_max: s.price_range_max,
            tipo_precio: s.tipo_precio,
            requiere_visita: s.requiere_visita,
            description: s.description,
          })),
        });
      }

      // ─────────────────────────────────────────────
      // Evento desconocido
      // ─────────────────────────────────────────────
      default:
        console.log('fallback triggered', JSON.stringify({ reason: 'Unknown event', event }));
        return Response.json({
          error: `Unknown event: ${event}`,
          supported_events: [
            'identify_sender',
            'new_lead',
            'message_received',
            'group_message',
            'status_update',
            'payment_confirmed',
            'customer_query',
            'service_query',
            'flag_for_review',
          ],
        }, { status: 400 });
    }

  } catch (error) {
    console.error(`❌ Error processing event ${event}:`, error);
    return Response.json({ error: error.message, event }, { status: 500 });
  }
});