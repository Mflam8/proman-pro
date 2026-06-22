import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ACTIVE_STATUSES = [
  'agendado',
  'evaluacion_agendada',
  'trabajo_aprobado',
  'en_ruta',
  'en_sitio',
  'en_proceso'
];

function getEventDateTime(date, time) {
  if (!date) return null;
  const startTime = time || '08:00';
  const start = `${date}T${startTime}:00`;
  return start;
}

function getEndDateTime(date, time, durationHours) {
  const start = new Date(getEventDateTime(date, time));
  const duration = Number(durationHours) > 0 ? Number(durationHours) : 2;
  const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
  return end.toISOString();
}

function buildDescription(inquiry, customer) {
  const customerName = customer?.full_name || inquiry.client_name || 'Cliente';
  const customerPhone = customer?.phone || inquiry.phone || 'No disponible';
  return [
    `Cliente: ${customerName}`,
    `Teléfono: ${customerPhone}`,
    `Servicio: ${inquiry.service_type || inquiry.rubro || 'Trabajo'}`,
    `Ubicación: ${inquiry.location_name || inquiry.location || 'No definida'}`,
    inquiry.address ? `Dirección: ${inquiry.address}` : null,
    inquiry.message ? `Detalles: ${inquiry.message}` : null,
    inquiry.assigned_to ? `Asignado a: ${inquiry.assigned_to}` : null,
    `Estado: ${inquiry.status || 'nuevo'}`,
    `Trabajo ID: ${inquiry.id}`
  ].filter(Boolean).join('\n');
}

async function logSystemError(base44, { message, details, severity = 'error', relatedEntityId, context }) {
  await base44.asServiceRole.entities.SystemError.create({
    source_type: 'function',
    source_name: 'syncInquiryToGoogleCalendar',
    severity,
    status: 'open',
    message,
    details: details || '',
    related_entity: 'ClientInquiry',
    related_entity_id: relatedEntityId || '',
    context_json: JSON.stringify(context || {}),
    occurred_at: new Date().toISOString()
  });
}

Deno.serve(async (req) => {
  let base44 = null;
  let inquiryId = '';

  try {
    base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    inquiryId = payload?.inquiryId || '';
    const user = await base44.auth.me().catch(() => null);

    if (!user || (user.role !== 'admin' && user.employee_type !== 'Supervisor')) {
      await logSystemError(base44, {
        message: 'La sincronización con Google Calendar fue bloqueada por permisos.',
        details: 'La función requiere admin o supervisor autenticado. Si la ejecuta una automatización, fallará con 403.',
        severity: 'critical',
        relatedEntityId: inquiryId,
        context: { inquiryId }
      });
      return Response.json({ error: 'Forbidden: Admin or Supervisor access required' }, { status: 403 });
    }

    if (!inquiryId) {
      await logSystemError(base44, {
        message: 'La sincronización con Google Calendar se ejecutó sin inquiryId.',
        details: 'Falta el dato inquiryId en el payload.',
        severity: 'warning'
      });
      return Response.json({ error: 'inquiryId is required' }, { status: 400 });
    }

    const inquiry = await base44.asServiceRole.entities.ClientInquiry.get(inquiryId);
    if (!inquiry) {
      await logSystemError(base44, {
        message: 'La sincronización con Google Calendar recibió un trabajo inexistente.',
        details: 'No se encontró el ClientInquiry solicitado.',
        severity: 'warning',
        relatedEntityId: inquiryId
      });
      return Response.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    const shouldSync = Boolean(inquiry.scheduled_date) && ACTIVE_STATUSES.includes(inquiry.status);
    const customer = inquiry.customer_id ? await base44.asServiceRole.entities.Customer.get(inquiry.customer_id) : null;
    const existingLinks = await base44.asServiceRole.entities.CalendarSyncState.filter({ inquiry_id: inquiry.id });
    const existingLink = existingLinks[0] || null;

    const connection = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    if (!connection?.accessToken) {
      await logSystemError(base44, {
        message: 'No hay conexión activa con Google Calendar.',
        details: 'La cuenta autorizada no devolvió accessToken.',
        severity: 'critical',
        relatedEntityId: inquiry.id
      });
      return Response.json({ error: 'Google Calendar is not connected' }, { status: 500 });
    }

    const headers = {
      'Authorization': `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json'
    };

    if (!shouldSync) {
      if (existingLink?.google_event_id) {
        const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingLink.google_event_id}`, {
          method: 'DELETE',
          headers
        });

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorText = await deleteResponse.text();
          await logSystemError(base44, {
            message: 'No se pudo quitar el evento de Google Calendar.',
            details: errorText,
            relatedEntityId: inquiry.id
          });
          return Response.json({ error: errorText }, { status: 500 });
        }

        await base44.asServiceRole.entities.CalendarSyncState.delete(existingLink.id);
      }

      return Response.json({ success: true, action: 'removed_or_skipped' });
    }

    const eventPayload = {
      summary: `${inquiry.service_type || inquiry.rubro || 'Trabajo'} - ${customer?.full_name || inquiry.client_name || 'Cliente'}`,
      location: [inquiry.location_name, inquiry.location, inquiry.address].filter(Boolean).join(', '),
      description: buildDescription(inquiry, customer),
      start: {
        dateTime: getEventDateTime(inquiry.scheduled_date, inquiry.scheduled_start_time),
        timeZone: 'UTC'
      },
      end: {
        dateTime: getEndDateTime(inquiry.scheduled_date, inquiry.scheduled_start_time, inquiry.estimated_duration_hours),
        timeZone: 'UTC'
      }
    };

    let googleEventId = existingLink?.google_event_id;
    let action = 'created';

    if (googleEventId) {
      const updateResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(eventPayload)
      });

      if (updateResponse.ok) {
        action = 'updated';
      } else {
        googleEventId = null;
      }
    }

    if (!googleEventId) {
      const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers,
        body: JSON.stringify(eventPayload)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        await logSystemError(base44, {
          message: 'No se pudo crear el evento en Google Calendar.',
          details: errorText,
          relatedEntityId: inquiry.id
        });
        return Response.json({ error: errorText }, { status: 500 });
      }

      const createdEvent = await createResponse.json();
      googleEventId = createdEvent.id;
      action = 'created';
    }

    if (existingLink) {
      await base44.asServiceRole.entities.CalendarSyncState.update(existingLink.id, {
        google_event_id: googleEventId,
        last_synced_at: new Date().toISOString()
      });
    } else {
      await base44.asServiceRole.entities.CalendarSyncState.create({
        inquiry_id: inquiry.id,
        google_event_id: googleEventId,
        last_synced_at: new Date().toISOString()
      });
    }

    return Response.json({ success: true, action, google_event_id: googleEventId });
  } catch (error) {
    if (base44) {
      await logSystemError(base44, {
        message: 'Falló la sincronización con Google Calendar.',
        details: error.message,
        severity: 'critical',
        relatedEntityId: inquiryId
      });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});