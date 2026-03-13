import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

  // Verificar secret de N8N
  const secret = Deno.env.get('N8N_WEBHOOK_SECRET');
  if (secret) {
    const incomingSecret = req.headers.get('X-N8N-Secret') || req.headers.get('x-n8n-secret');
    if (incomingSecret !== secret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const base44 = createClientFromRequest(req);

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { event, data } = body;

  if (!event || !data) {
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

        // Verificar si ya existe el cliente
        const existing = await base44.asServiceRole.entities.Customer.filter({ phone });
        let customer;

        if (existing.length > 0) {
          customer = existing[0];
          console.log(`♻️ Cliente existente encontrado: ${customer.id}`);
        } else {
          // Crear nuevo cliente
          customer = await base44.asServiceRole.entities.Customer.create({
            full_name: name || 'Sin nombre',
            phone,
            status: 'nuevo',
            customer_type: 'residencial',
            source: 'whatsapp_bot',
            preferred_contact: 'whatsapp',
          });
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

        // 1) Upsert Customer by phone or wa_id
        let customer = null;
        let found = await base44.asServiceRole.entities.Customer.filter({ phone: resolvedPhone });
        if (found.length === 0 && wa_id) {
          const byWa = await base44.asServiceRole.entities.Customer.filter({ wa_id });
          found = byWa;
        }
        if (found.length > 0) {
          customer = found[0];
          if ((!customer.full_name || customer.full_name === 'Sin nombre') && customerHints?.name) {
            await base44.asServiceRole.entities.Customer.update(customer.id, { full_name: customerHints.name });
            customer.full_name = customerHints.name;
          }
        } else {
          customer = await base44.asServiceRole.entities.Customer.create({
            full_name: customerHints?.name || 'Sin nombre',
            phone: resolvedPhone,
            wa_id: wa_id || resolvedPhone,
            preferred_contact: 'whatsapp',
            source: 'whatsapp_bot',
            channel: 'whatsapp'
          });
        }

        // 4) Create or reuse open conversation
        const openConvs = await base44.asServiceRole.entities.WhatsappConversation.filter({ customer_id: customer.id, is_open: true });
        const nowISO = timestamp ? new Date((String(timestamp).length < 13 ? Number(timestamp) * 1000 : Number(timestamp))).toISOString() : new Date().toISOString();
        let conversation = openConvs[0];
        if (!conversation) {
          conversation = await base44.asServiceRole.entities.WhatsappConversation.create({
            customer_id: customer.id,
            is_open: true,
            channel: 'whatsapp',
            last_message_at: nowISO
          });
        }

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
            return Response.json({ success: true, event, customer_id: customer.id, inquiry_id: inquiry.id, service_type: serviceType, next_step: nextStep, missing_info: missing, conversation_id: conversation.id, message_id: dup[0].id, duplicate: true });
          }
        }

        const msgRecord = await base44.asServiceRole.entities.BitacoraWhatsApp.create({
          mensaje_id: incomingMensajeId,
          customer_id: customer.id,
          conversation_id: conversation.id,
          trabajo_id: inquiry.id,
          from_phone: resolvedPhone,
          texto_mensaje: resolvedMessage,
          media_url: null,
          timestamp: nowISO,
          message_type,
          is_group: false,
          procesado: false,
          channel: 'whatsapp',
          direction: 'inbound',
          ...(source?.ad_id ? { ad_id: source.ad_id } : {}),
          ...(source?.ad_name ? { ad_name: source.ad_name } : {}),
          ...(source?.campaign_id ? { campaign_id: source.campaign_id } : {}),
          ...(source?.entryPoint ? { entry_point: source.entryPoint } : {}),
          ...(source?.entry_point ? { entry_point: source.entry_point } : {})
        });

        await base44.asServiceRole.entities.WhatsappConversation.update(conversation.id, {
          last_message_at: nowISO,
          last_message_id: msgRecord.id
        });

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
          const results = await base44.asServiceRole.entities.Customer.filter({ phone });
          customer = results[0] || null;
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
            role: u.role,           // 'ceo' | 'technician' | 'corporate' | 'admin'
            name: u.name,
            related_id: u.related_id,
            action: roleToAction(u.role), // qué debe hacer N8N con este mensaje
          });
        }

        // 2. Buscar en clientes existentes
        const customers = await base44.asServiceRole.entities.Customer.filter({ phone });
        if (customers.length > 0) {
          const c = customers[0];
          const isCorporate = c.customer_type === 'corporativo' || c.customer_type === 'contrato';
          return Response.json({
            success: true,
            identified: true,
            role: isCorporate ? 'corporate_customer' : 'recurring_customer',
            name: c.full_name,
            related_id: c.id,
            customer_type: c.customer_type,
            is_vip: c.is_vip,
            action: 'handle_existing_customer',
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
          const customers = await base44.asServiceRole.entities.Customer.filter({ phone });
          if (customers.length > 0) {
            const jobs = await base44.asServiceRole.entities.ClientInquiry.filter({ customer_id: customers[0].id });
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