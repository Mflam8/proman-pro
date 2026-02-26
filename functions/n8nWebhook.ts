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
        const { phone, message, message_id, media_url, message_type = 'text', inquiry_id, customer_id, is_group = false } = data;

        if (!phone || !message) return Response.json({ error: 'phone and message are required' }, { status: 400 });

        // Guardar en BitacoraWhatsApp (evitar duplicados por mensaje_id)
        if (message_id) {
          const existing = await base44.asServiceRole.entities.BitacoraWhatsApp.filter({ mensaje_id: message_id });
          if (existing.length > 0) {
            return Response.json({ success: true, duplicate: true, message: 'Message already logged' });
          }
        }

        await base44.asServiceRole.entities.BitacoraWhatsApp.create({
          mensaje_id: message_id || `${phone}_${Date.now()}`,
          trabajo_id: inquiry_id || null,
          customer_id: customer_id || null,
          from_phone: phone,
          texto_mensaje: message,
          media_url: media_url || null,
          timestamp: new Date().toISOString(),
          message_type,
          is_group,
          procesado: !!inquiry_id,
        });

        // Si hay inquiry_id, también guardar en ProgressLog
        if (inquiry_id) {
          await base44.asServiceRole.entities.ProgressLog.create({
            inquiry_id,
            log_type: 'whatsapp',
            message_text: message,
            from_phone: phone,
            timestamp: new Date().toISOString(),
            ...(media_url && { media_url }),
            created_by: 'n8n_bot',
          });
        }

        return Response.json({ success: true, event });
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