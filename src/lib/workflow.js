export const WORKFLOW_STAGES = [
  { id: 'New Conversation', label: 'Nueva conversación', columnClass: 'bg-slate-100 border-slate-200', badgeClass: 'bg-slate-200 text-slate-800' },
  { id: 'Needs Information', label: 'Falta información', columnClass: 'bg-amber-50 border-amber-200', badgeClass: 'bg-amber-100 text-amber-900' },
  { id: 'Pending Review', label: 'Pendiente revisión', columnClass: 'bg-rose-50 border-rose-200', badgeClass: 'bg-rose-100 text-rose-900' },
  { id: 'Ready for Quote', label: 'Listo para cotizar', columnClass: 'bg-violet-50 border-violet-200', badgeClass: 'bg-violet-100 text-violet-900' },
  { id: 'Quote Sent', label: 'Cotización enviada', columnClass: 'bg-fuchsia-50 border-fuchsia-200', badgeClass: 'bg-fuchsia-100 text-fuchsia-900' },
  { id: 'Customer Approved', label: 'Cliente aprobó', columnClass: 'bg-emerald-50 border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-900' },
  { id: 'Scheduled', label: 'Programado', columnClass: 'bg-sky-50 border-sky-200', badgeClass: 'bg-sky-100 text-sky-900' },
  { id: 'Technician Assigned', label: 'Técnico asignado', columnClass: 'bg-cyan-50 border-cyan-200', badgeClass: 'bg-cyan-100 text-cyan-900' },
  { id: 'In Progress', label: 'En ejecución', columnClass: 'bg-blue-50 border-blue-200', badgeClass: 'bg-blue-100 text-blue-900' },
  { id: 'Pending Billing', label: 'Pendiente facturar', columnClass: 'bg-orange-50 border-orange-200', badgeClass: 'bg-orange-100 text-orange-900' },
  { id: 'Paid', label: 'Pagado', columnClass: 'bg-green-50 border-green-200', badgeClass: 'bg-green-100 text-green-900' },
  { id: 'Closed', label: 'Cerrado', columnClass: 'bg-gray-100 border-gray-200', badgeClass: 'bg-gray-200 text-gray-800' }
];

export function getWorkflowStageMeta(stage) {
  return WORKFLOW_STAGES.find((item) => item.id === stage) || WORKFLOW_STAGES[0];
}

export function getWorkflowStage(inquiry, workOrder) {
  if (workOrder?.workflow_stage) return workOrder.workflow_stage;
  if (!inquiry) return 'New Conversation';
  if (['cerrado', 'cancelado', 'perdido'].includes(inquiry.status) || inquiry.work_status === 'cerrado') return 'Closed';
  if (inquiry.payment_status === 'pagado' || inquiry.status === 'pagado') return 'Paid';
  if (['pendiente_facturacion', 'facturado', 'completado', 'terminado'].includes(inquiry.status) || inquiry.work_status === 'completado') return 'Pending Billing';
  if (['en_ruta', 'en_sitio', 'en_proceso'].includes(inquiry.status) || ['en_ruta', 'en_sitio', 'en_proceso'].includes(inquiry.work_status)) return 'In Progress';
  if ((inquiry.assigned_to || inquiry.assigned_to_employee_id) && inquiry.scheduled_date) return 'Technician Assigned';
  if (inquiry.scheduled_date || inquiry.status === 'agendado' || inquiry.work_status === 'agendado') return 'Scheduled';
  if (inquiry.status === 'trabajo_aprobado' || inquiry.commercial_status === 'aprobado') return 'Customer Approved';
  if (inquiry.quote_pdf_url || inquiry.quoted_at || inquiry.commercial_status === 'cotizado' || inquiry.status === 'cotizacion_realizada') return 'Quote Sent';
  if (inquiry.human_review_status === 'pending_review') return 'Pending Review';
  if ((inquiry.missing_info || []).length > 0 || (inquiry.missing_fields || []).length > 0 || !inquiry.service_type || inquiry.service_type === 'unknown') return 'Needs Information';
  if (inquiry.quote_amount || inquiry.commercial_status === 'cotizacion_pendiente' || inquiry.status === 'pendiente_cotizacion') return 'Ready for Quote';
  return 'New Conversation';
}

export function formatMissingFields(values) {
  return (values || []).map((value) => String(value).replace(/_/g, ' '));
}