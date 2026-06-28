import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function uniqueList(values) {
  return [...new Set((values || []).filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function inferRubro(service = '') {
  const text = String(service || '').toLowerCase();
  if (/(hospital|cl[ií]nica|salud)/.test(text)) return 'Hospitales';
  if (/(restaurante|cocina|comedor)/.test(text)) return 'Restaurantes';
  if (/(empresa|local|negocio|oficina|comercial)/.test(text)) return 'Comercial';
  if (/(urgente|emergencia)/.test(text)) return 'Emergencias';
  return 'Hogar';
}

function inferPriority(urgency = 'media') {
  if (urgency === 'urgente') return 'urgente';
  if (urgency === 'alta') return 'alta';
  if (urgency === 'baja') return 'baja';
  return 'media';
}

function detectApproval(analysis) {
  const text = `${analysis.intent || ''} ${analysis.summary || ''} ${analysis.suggested_next_reply || ''}`.toLowerCase();
  const negatives = ['cancel', 'rechaz', 'perdid', 'no acepta', 'no aprueba', 'no desea'];
  if (negatives.some((token) => text.includes(token))) return false;
  const positives = ['aprueba', 'aprob', 'acepta', 'confirm', 'autoriza', 'reserve', 'reservar', 'agenda'];
  return positives.some((token) => text.includes(token));
}

function needsInformation(analysis) {
  const missing = uniqueList(analysis.missing_fields);
  if (missing.length > 0) return true;
  return !analysis.service || analysis.service === 'unknown' || !analysis.phone || !analysis.customer_id;
}

function getWorkflowHint(analysis, requiresReview, approved) {
  if (approved) return 'Customer Approved';
  if (requiresReview) return 'Pending Review';
  if (needsInformation(analysis)) return 'Needs Information';
  if (analysis.service && analysis.service !== 'unknown') return 'Ready for Quote';
  return 'New Conversation';
}

function buildCreatePayload(analysis, requiresReview, approved) {
  const serviceType = analysis.service && analysis.service !== 'unknown' ? analysis.service : 'Pendiente de clasificar';
  const summary = analysis.summary || analysis.suggested_next_reply || analysis.intent || 'Nueva conversación de WhatsApp';
  const preferredTime = analysis.detected_schedule || (analysis.dates || [])[0] || null;
  const status = approved ? 'trabajo_aprobado' : serviceType !== 'Pendiente de clasificar' ? 'pendiente_cotizacion' : 'nuevo';
  const commercialStatus = approved ? 'aprobado' : serviceType !== 'Pendiente de clasificar' ? 'cotizacion_pendiente' : 'nuevo';

  return {
    customer_id: analysis.customer_id || null,
    client_name: analysis.detected_name || (analysis.names || [])[0] || 'Cliente por confirmar',
    phone: analysis.phone || '',
    source_conversation_id: analysis.conversation_id || null,
    source: 'whatsapp_bot',
    lead_source: 'whatsapp',
    rubro: inferRubro(serviceType),
    service_type: serviceType,
    message: summary,
    descripcion_libre: summary,
    preferred_time: preferredTime,
    location_name: analysis.direction_or_location || null,
    address: analysis.detected_address || null,
    priority: inferPriority(analysis.urgency),
    confidence: analysis.ai_confidence_score ?? analysis.confidence_score ?? 0,
    human_review_status: requiresReview ? 'pending_review' : 'not_required',
    next_best_action: analysis.pending_from_customer || analysis.suggested_next_reply || null,
    missing_fields: uniqueList(analysis.missing_fields),
    commercial_status: commercialStatus,
    work_status: 'nuevo',
    conversation_status: analysis.unread_customer_message ? 'abierta' : 'pendiente_equipo',
    status,
    approved_at: approved ? new Date().toISOString() : null
  };
}

function buildUpdatePayload(existing, analysis, requiresReview, approved) {
  const serviceType = analysis.service && analysis.service !== 'unknown' ? analysis.service : existing.service_type;
  const missing = uniqueList([...(existing.missing_fields || []), ...(analysis.missing_fields || [])]);
  const payload = {
    customer_id: existing.customer_id || analysis.customer_id || null,
    client_name: existing.client_name || analysis.detected_name || (analysis.names || [])[0] || null,
    phone: existing.phone || analysis.phone || null,
    source_conversation_id: existing.source_conversation_id || analysis.conversation_id || null,
    service_type: serviceType || existing.service_type,
    message: existing.message || analysis.summary || null,
    descripcion_libre: existing.descripcion_libre || analysis.summary || null,
    preferred_time: existing.preferred_time || analysis.detected_schedule || (analysis.dates || [])[0] || null,
    location_name: existing.location_name || analysis.direction_or_location || null,
    address: existing.address || analysis.detected_address || null,
    priority: inferPriority(analysis.urgency || existing.priority),
    confidence: Math.max(existing.confidence || 0, analysis.ai_confidence_score ?? analysis.confidence_score ?? 0),
    human_review_status: requiresReview ? 'pending_review' : (existing.human_review_status === 'approved' ? 'approved' : 'not_required'),
    next_best_action: analysis.pending_from_customer || analysis.suggested_next_reply || existing.next_best_action || null,
    missing_fields: missing,
    conversation_status: analysis.unread_customer_message ? 'abierta' : (existing.conversation_status || 'pendiente_equipo')
  };

  if (!existing.rubro && serviceType) payload.rubro = inferRubro(serviceType);
  if (approved) {
    payload.status = 'trabajo_aprobado';
    payload.commercial_status = 'aprobado';
    payload.approved_at = existing.approved_at || new Date().toISOString();
  } else if (requiresReview && existing.human_review_status !== 'approved') {
    if (!['agendado', 'en_ruta', 'en_sitio', 'en_proceso', 'completado', 'terminado', 'cerrado', 'pagado'].includes(existing.status)) {
      payload.status = serviceType && serviceType !== 'unknown' ? 'pendiente_cotizacion' : 'nuevo';
    }
    payload.commercial_status = serviceType && serviceType !== 'unknown' ? 'cotizacion_pendiente' : 'nuevo';
    payload.approved_at = null;
  } else if (!existing.commercial_status || existing.commercial_status === 'nuevo') {
    payload.commercial_status = serviceType && serviceType !== 'unknown' ? 'cotizacion_pendiente' : 'nuevo';
  }
  if ((!existing.status || existing.status === 'nuevo') && serviceType && serviceType !== 'unknown') {
    payload.status = 'pendiente_cotizacion';
  }
  return payload;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const addTimelineEvent = async ({ conversationId, eventType, title, description, relatedEntityId = null, metadata = {} }) => {
      if (!conversationId) return;
      await base44.asServiceRole.entities.ConversationTimelineEvent.create({
        conversation_id: conversationId,
        event_type: eventType,
        title,
        description,
        source: metadata.status === 'error' ? 'system' : 'ai',
        related_entity_id: relatedEntityId,
        metadata_json: JSON.stringify(metadata)
      });
    };

    const logFailure = async ({ conversationId, message, details, relatedEntityId = null }) => {
      await addTimelineEvent({
        conversationId,
        eventType: 'pipeline_inquiry_sync_failed',
        title: message,
        description: details,
        relatedEntityId,
        metadata: { status: 'error' }
      });
      await base44.asServiceRole.entities.SystemError.create({
        source_type: 'function',
        source_name: 'syncInquiryFromConversationAnalysis',
        severity: 'error',
        status: 'open',
        message,
        details,
        related_entity: 'ClientInquiry',
        related_entity_id: relatedEntityId,
        occurred_at: new Date().toISOString()
      });
    };

    let analysis = body?.data || null;
    if (!analysis && body?.analysis_id) {
      analysis = await base44.asServiceRole.entities.ConversationAnalysis.get(body.analysis_id);
    }
    if (!analysis && body?.event?.entity_id) {
      analysis = await base44.asServiceRole.entities.ConversationAnalysis.get(body.event.entity_id);
    }

    if (!analysis) {
      return Response.json({ error: 'ConversationAnalysis not provided' }, { status: 400 });
    }

    const confidence = analysis.ai_confidence_score ?? analysis.confidence_score ?? 0;
    const requiresReview = analysis.requires_human_review || confidence < 0.72;
    const approved = !requiresReview && detectApproval(analysis);

    let inquiry = null;
    if (analysis.inquiry_id) {
      inquiry = await base44.asServiceRole.entities.ClientInquiry.get(analysis.inquiry_id);
    }

    if (!inquiry && analysis.conversation_id) {
      const byConversation = await base44.asServiceRole.entities.ClientInquiry.filter({ source_conversation_id: analysis.conversation_id }, '-updated_date', 1);
      inquiry = byConversation[0] || null;
    }

    if (!inquiry && analysis.customer_id) {
      const related = await base44.asServiceRole.entities.ClientInquiry.filter({ customer_id: analysis.customer_id }, '-updated_date', 5);
      inquiry = related.find((item) => !['cerrado', 'cancelado', 'perdido', 'pagado'].includes(item.status)) || related[0] || null;
    }

    let result;
    const wasCreated = !inquiry;
    if (inquiry) {
      const updateData = buildUpdatePayload(inquiry, analysis, requiresReview, approved);
      result = await base44.asServiceRole.entities.ClientInquiry.update(inquiry.id, updateData);
    } else {
      const createData = buildCreatePayload(analysis, requiresReview, approved);
      result = await base44.asServiceRole.entities.ClientInquiry.create(createData);
    }

    const conversationId = analysis.conversation_id || result.source_conversation_id || inquiry?.source_conversation_id || null;
    await addTimelineEvent({
      conversationId,
      eventType: 'pipeline_inquiry_synced',
      title: wasCreated ? 'ClientInquiry creado/actualizado' : 'ClientInquiry creado/actualizado',
      description: `${wasCreated ? 'Creado' : 'Actualizado'} · ${result.service_type || 'Sin servicio'} · ${requiresReview ? 'Revisión pendiente' : 'Listo'}`,
      relatedEntityId: result.id,
      metadata: { status: 'success', inquiry_id: result.id, created: wasCreated, requires_review: requiresReview }
    });

    if (analysis.inquiry_id !== result.id || analysis.human_review_status !== (requiresReview ? 'pending_review' : 'approved')) {
      await base44.asServiceRole.entities.ConversationAnalysis.update(analysis.id, {
        inquiry_id: result.id,
        human_review_status: requiresReview ? 'pending_review' : 'approved',
        status: requiresReview ? 'reviewed' : 'applied'
      });
    }

    return Response.json({
      success: true,
      inquiry_id: result.id,
      created: !inquiry,
      requires_review: requiresReview,
      approved_detected: approved,
      workflow_hint: getWorkflowHint(analysis, requiresReview, approved)
    });
  } catch (error) {
    let fallbackBody = {};
    try {
      fallbackBody = await req.clone().json();
    } catch {}
    const fallbackConversationId = fallbackBody?.data?.conversation_id || fallbackBody?.conversation_id || null;
    const fallbackEntityId = fallbackBody?.analysis_id || fallbackBody?.event?.entity_id || null;
    try {
      const base44 = createClientFromRequest(req);
      if (fallbackConversationId) {
        await base44.asServiceRole.entities.ConversationTimelineEvent.create({
          conversation_id: fallbackConversationId,
          event_type: 'pipeline_inquiry_sync_failed',
          title: 'Falló la sincronización hacia ClientInquiry',
          description: error.message,
          source: 'system',
          related_entity_id: fallbackEntityId,
          metadata_json: JSON.stringify({ status: 'error' })
        });
      }
      await base44.asServiceRole.entities.SystemError.create({
        source_type: 'function',
        source_name: 'syncInquiryFromConversationAnalysis',
        severity: 'error',
        status: 'open',
        message: 'Falló la sincronización hacia ClientInquiry',
        details: error.message,
        related_entity: 'ConversationAnalysis',
        related_entity_id: fallbackEntityId,
        occurred_at: new Date().toISOString()
      });
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});