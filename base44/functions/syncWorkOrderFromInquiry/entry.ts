import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function uniqueList(values) {
  return [...new Set((values || []).filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function buildMapUrl(address, location) {
  const label = [address, location].filter(Boolean).join(', ');
  if (!label) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

function getWorkflowStage(inquiry) {
  if (!inquiry) return 'New Conversation';
  if (['cerrado', 'cancelado', 'perdido'].includes(inquiry.status) || inquiry.work_status === 'cerrado') return 'Closed';
  if (inquiry.payment_status === 'pagado' || inquiry.status === 'pagado') return 'Paid';
  if (['pendiente_facturacion', 'facturado'].includes(inquiry.status) || inquiry.work_status === 'completado' || inquiry.status === 'terminado' || inquiry.status === 'completado') return 'Pending Billing';
  if (['en_ruta', 'en_sitio', 'en_proceso'].includes(inquiry.work_status) || ['en_ruta', 'en_sitio', 'en_proceso'].includes(inquiry.status)) return 'In Progress';
  if ((inquiry.assigned_to || inquiry.assigned_to_employee_id) && inquiry.scheduled_date) return 'Technician Assigned';
  if (inquiry.scheduled_date || inquiry.status === 'agendado' || inquiry.work_status === 'agendado') return 'Scheduled';
  if (inquiry.status === 'trabajo_aprobado' || inquiry.commercial_status === 'aprobado') return 'Customer Approved';
  if (inquiry.quote_pdf_url || inquiry.quoted_at || inquiry.commercial_status === 'cotizado' || inquiry.status === 'cotizacion_realizada') return 'Quote Sent';
  if (inquiry.human_review_status === 'pending_review') return 'Pending Review';
  if ((inquiry.missing_fields || []).length > 0 || (inquiry.missing_info || []).length > 0 || !inquiry.service_type || inquiry.service_type === 'unknown') return 'Needs Information';
  if (inquiry.quote_amount || inquiry.commercial_status === 'cotizacion_pendiente' || inquiry.status === 'pendiente_cotizacion') return 'Ready for Quote';
  return 'New Conversation';
}

function mapStatusFromStage(stage) {
  if (stage === 'Needs Information') return 'draft';
  if (stage === 'Pending Review') return 'draft';
  if (stage === 'Ready for Quote') return 'ready';
  if (stage === 'Quote Sent') return 'ready';
  if (stage === 'Customer Approved') return 'ready';
  if (stage === 'Scheduled') return 'scheduled';
  if (stage === 'Technician Assigned') return 'assigned';
  if (stage === 'In Progress') return 'in_progress';
  if (stage === 'Pending Billing') return 'pending_billing';
  if (stage === 'Paid') return 'paid';
  if (stage === 'Closed') return 'closed';
  return 'draft';
}

function buildMissingFields(inquiry, analysis) {
  const missing = [
    ...(inquiry.missing_fields || []),
    ...(inquiry.missing_info || []),
    ...(analysis?.missing_fields || [])
  ];

  if (!inquiry.address && !inquiry.location_name && !analysis?.detected_address) missing.push('address');
  if (!inquiry.scheduled_date) missing.push('scheduled_date');
  if (!inquiry.scheduled_start_time && !inquiry.preferred_time) missing.push('scheduled_start_time');
  if (!inquiry.assigned_to && !inquiry.assigned_to_employee_id) missing.push('technician_assignment');
  return uniqueList(missing);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    let inquiry = body?.data || null;
    if (!inquiry && body?.inquiry_id) {
      inquiry = await base44.asServiceRole.entities.ClientInquiry.get(body.inquiry_id);
    }
    if (!inquiry && body?.event?.entity_id) {
      inquiry = await base44.asServiceRole.entities.ClientInquiry.get(body.event.entity_id);
    }

    if (!inquiry) {
      return Response.json({ error: 'ClientInquiry not provided' }, { status: 400 });
    }

    const [customer, latestAnalysisList, billingItems, materialItems, employees] = await Promise.all([
      inquiry.customer_id ? base44.asServiceRole.entities.Customer.get(inquiry.customer_id) : Promise.resolve(null),
      inquiry.source_conversation_id
        ? base44.asServiceRole.entities.ConversationAnalysis.filter({ conversation_id: inquiry.source_conversation_id }, '-created_date', 1)
        : base44.asServiceRole.entities.ConversationAnalysis.filter({ inquiry_id: inquiry.id }, '-created_date', 1),
      base44.asServiceRole.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiry.id }),
      base44.asServiceRole.entities.MaterialTrabajo.filter({ inquiry_id: inquiry.id }),
      inquiry.assigned_to ? base44.asServiceRole.entities.Employee.filter({ email: inquiry.assigned_to }, '-created_date', 1) : Promise.resolve([])
    ]);

    const analysis = latestAnalysisList[0] || null;
    const employee = employees[0] || null;
    const workflowStage = getWorkflowStage(inquiry);
    const requestedServices = uniqueList([
      inquiry.service_type,
      ...billingItems.filter((item) => item.tipo_item === 'servicio').map((item) => item.descripcion)
    ]);
    const requiredMaterials = uniqueList([
      ...materialItems.map((item) => item.nombre_material),
      ...billingItems.filter((item) => item.tipo_item === 'material').map((item) => item.descripcion)
    ]);
    const summary = analysis?.summary || inquiry.message || inquiry.descripcion_libre || 'Orden operativa generada automáticamente desde la conversación.';
    const missingOperationalFields = buildMissingFields(inquiry, analysis);
    const workOrderPayload = {
      inquiry_id: inquiry.id,
      customer_id: inquiry.customer_id || null,
      conversation_id: inquiry.source_conversation_id || analysis?.conversation_id || null,
      analysis_id: analysis?.id || null,
      workflow_stage: workflowStage,
      status: mapStatusFromStage(workflowStage),
      customer_name: customer?.full_name || inquiry.client_name || 'Cliente por confirmar',
      company_name: customer?.fiscal_name || inquiry.restaurant_name || null,
      contact_name: customer?.full_name || inquiry.client_name || null,
      contact_phone: customer?.phone || inquiry.phone || null,
      contact_email: customer?.email || null,
      address: inquiry.address || analysis?.detected_address || null,
      location: inquiry.location_name || inquiry.location || analysis?.direction_or_location || null,
      gps_location: null,
      map_url: buildMapUrl(inquiry.address || analysis?.detected_address, inquiry.location_name || inquiry.location || analysis?.direction_or_location),
      scheduled_date: inquiry.scheduled_date || inquiry.visit_date || null,
      scheduled_start_time: inquiry.scheduled_start_time || null,
      estimated_duration_hours: inquiry.estimated_duration_hours || null,
      requested_services: requestedServices,
      equipment_needed: [],
      required_materials: requiredMaterials,
      technician_user_id: inquiry.assigned_to_employee_id || null,
      technician_name: employee?.employee_name || inquiry.assigned_to || null,
      technician_email: inquiry.assigned_to || employee?.email || null,
      special_instructions: inquiry.notes || null,
      customer_observations: inquiry.descripcion_libre || inquiry.message || null,
      safety_notes: uniqueList([...(analysis?.risks_detected || []), inquiry.priority === 'urgente' ? 'Atención prioritaria por urgencia reportada.' : null]).join('\n') || null,
      operational_summary: summary,
      ai_summary: analysis?.summary || null,
      missing_operational_fields: missingOperationalFields,
      admin_notes: inquiry.notes || null,
      before_photo_urls: inquiry.before_image_url ? [inquiry.before_image_url] : [],
      after_photo_urls: inquiry.after_image_url ? [inquiry.after_image_url] : [],
      materials_used_summary: null,
      completion_summary: inquiry.work_notes_done || null,
      completed_at: inquiry.completed_at || null,
      last_synced_at: new Date().toISOString()
    };

    const existing = await base44.asServiceRole.entities.WorkOrder.filter({ inquiry_id: inquiry.id }, '-updated_date', 1);
    const workOrder = existing[0]
      ? await base44.asServiceRole.entities.WorkOrder.update(existing[0].id, workOrderPayload)
      : await base44.asServiceRole.entities.WorkOrder.create(workOrderPayload);

    return Response.json({ success: true, work_order_id: workOrder.id, workflow_stage: workflowStage, status: workOrder.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});