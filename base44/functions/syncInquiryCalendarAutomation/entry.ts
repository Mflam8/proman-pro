import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function logSystemError(base44, { message, details, relatedEntityId, context }) {
  await base44.asServiceRole.entities.SystemError.create({
    source_type: 'automation',
    source_name: 'Sync jobs to Google Calendar',
    severity: 'critical',
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
    const body = await req.json().catch(() => ({}));
    inquiryId = body?.event?.entity_id || '';

    if (!inquiryId) {
      await logSystemError(base44, {
        message: 'La automatización de calendario se ejecutó sin inquiryId.',
        details: 'El evento no incluía event.entity_id.',
        context: body
      });
      return Response.json({ error: 'Missing inquiry id' }, { status: 400 });
    }

    const result = await base44.asServiceRole.functions.invoke('syncInquiryToGoogleCalendar', { inquiryId });

    if (result?.data?.error || result?.error) {
      return Response.json({ error: result?.data?.error || result?.error }, { status: 500 });
    }

    return Response.json({ success: true, result });
  } catch (error) {
    if (base44) {
      await logSystemError(base44, {
        message: 'Falló la automatización de sincronización con Google Calendar.',
        details: error.message,
        relatedEntityId: inquiryId
      });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});