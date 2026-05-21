import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ConversationTimeline({ conversationId }) {
  const { data: events = [] } = useQuery({
    queryKey: ['conversationTimeline', conversationId],
    queryFn: () => base44.entities.ConversationTimelineEvent.filter({ conversation_id: conversationId }, '-created_date'),
    enabled: !!conversationId,
    initialData: []
  });

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">Timeline operacional</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Sin eventos todavía.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="border-l-2 border-slate-200 pl-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline">{event.event_type}</Badge>
                  <span className="text-xs text-slate-500">{new Date(event.created_date).toLocaleString()}</span>
                </div>
                <p className="font-medium text-sm text-slate-900">{event.title}</p>
                {event.description && <p className="text-sm text-slate-600">{event.description}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}