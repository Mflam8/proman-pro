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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.employee_type !== 'Supervisor') {
      return Response.json({ error: 'Forbidden: Admin or Supervisor access required' }, { status: 403 });
    }

    const payload = await req.json();
    const inquiryId = payload?.inquiryId;

    if (!inquiryId) {
      return Response.json({ error: 'inquiryId is required' }, { status: 400 });
    }

    const inquiry = await base44.asServiceRole.entities.ClientInquiry.get(inquiryId);
    if (!inquiry) {
      return Response.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    const shouldSync = Boolean(inquiry.scheduled_date) && ACTIVE_STATUSES.includes(inquiry.status);
    const customer = inquiry.customer_id ? await base44.asServiceRole.entities.Customer.get(inquiry.customer_id) : null;
    const existingLinks = await base44.asServiceRole.entities.CalendarSyncState.filter({ inquiry_id: inquiry.id });
    const existingLink = existingLinks[0] || null;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    if (!shouldSync) {
      if (existingLink?.google_event_id) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingLink.google_event_id}`, {
          method: 'DELETE',
          headers
        });
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});