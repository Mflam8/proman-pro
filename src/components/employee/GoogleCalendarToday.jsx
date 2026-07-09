import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock3, ExternalLink, MapPin } from "lucide-react";

function formatTime(value) {
  if (!value) return "Sin hora";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function GoogleCalendarToday({ user }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["technicianGoogleAgenda", user?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke("getTechnicianCalendarAgenda", {});
      return response.data;
    },
    enabled: !!user
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-proman-navy">
          <CalendarDays className="w-5 h-5 text-proman-yellow" />
          Mi agenda de hoy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">Aquí verás los eventos de hoy en Google Calendar que estén asignados a tu correo.</p>

        {isLoading && <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">Cargando agenda de Google Calendar...</div>}

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">No se pudo cargar tu agenda de Google Calendar.</div>}

        {!isLoading && !error && data?.inaccessible_calendars?.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No se pudieron leer estos calendarios: {data.inaccessible_calendars.join(", ")}. Comparte esos calendarios con la cuenta Google conectada o reconecta la cuenta correcta.
          </div>
        )}

        {!isLoading && !error && data?.events?.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-gray-600">
            Hoy no tienes eventos asignados en Google Calendar. Si falta alguno, agrega el correo del técnico como invitado del evento o inclúyelo en la descripción.
          </div>
        )}

        {!isLoading && !error && data?.events?.length > 0 && (
          <div className="space-y-3">
            {data.events.map((event) => (
              <div key={`${event.calendar_id}-${event.id}`} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-proman-navy">{event.title}</h3>
                      <Badge className="bg-blue-100 text-blue-900">{event.calendar_id}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-proman-yellow" />{formatTime(event.start)}{event.end ? ` - ${formatTime(event.end)}` : ""}</div>
                      {event.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-proman-yellow" />{event.location}</div>}
                    </div>
                    {event.description && <p className="text-sm text-gray-700 whitespace-pre-line">{event.description}</p>}
                  </div>
                  {event.html_link && (
                    <a href={event.html_link} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                      <Button variant="outline" className="w-full md:w-auto">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver evento
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}