import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const inquiryId = body?.event?.entity_id;

    if (!inquiryId) {
      return Response.json({ error: 'Missing inquiry id' }, { status: 400 });
    }

    const result = await base44.asServiceRole.functions.invoke('syncInquiryToGoogleCalendar', { inquiryId });
    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});