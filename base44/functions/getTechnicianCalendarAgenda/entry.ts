import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CALENDAR_IDS = ['promanservices2026@gmail.com', 'admin@proman.services'];

function matchesTechnician(event, user) {
  const userEmail = (user?.email || '').toLowerCase();
  const userName = (user?.full_name || '').toLowerCase().trim();
  const attendees = Array.isArray(event?.attendees) ? event.attendees : [];
  const attendeeMatch = attendees.some((attendee) => (attendee?.email || '').toLowerCase() === userEmail);
  if (attendeeMatch) return true;

  const searchableText = `${event?.summary || ''}\n${event?.description || ''}`.toLowerCase();
  if (userEmail && searchableText.includes(userEmail)) return true;
  if (userName && searchableText.includes(userName)) return true;

  return false;
}

function normalizeEvent(calendarId, event) {
  return {
    id: event.id,
    calendar_id: calendarId,
    title: event.summary || 'Evento sin título',
    description: event.description || '',
    location: event.location || '',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    html_link: event.htmlLink || '',
    meet_link: event.hangoutLink || ''
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    if (!accessToken) {
      return Response.json({ error: 'Google Calendar no está conectado' }, { status: 500 });
    }

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const inaccessibleCalendars = [];
    const allEvents = [];

    for (const calendarId of CALENDAR_IDS) {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(dayStart.toISOString())}&timeMax=${encodeURIComponent(dayEnd.toISOString())}&maxResults=50`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        inaccessibleCalendars.push(calendarId);
        continue;
      }

      const data = await response.json();
      const matchingEvents = (data.items || [])
        .filter((event) => matchesTechnician(event, user))
        .map((event) => normalizeEvent(calendarId, event));

      allEvents.push(...matchingEvents);
    }

    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return Response.json({
      success: true,
      date: dayStart.toISOString().split('T')[0],
      events: allEvents,
      inaccessible_calendars: inaccessibleCalendars
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});