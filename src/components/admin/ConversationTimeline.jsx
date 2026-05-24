import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Sparkles, MapPin, AlertTriangle, CreditCard, CheckCircle2 } from "lucide-react";

const eventUi = {
  message: { icon: MessageCircle, badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  media: { icon: MessageCircle, badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  reaction: { icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  status: { icon: CheckCircle2, badge: 'bg-slate-100 text-slate-800 border-slate-200' },
  message_echo: { icon: MessageCircle, badge: 'bg-violet-100 text-violet-800 border-violet-200' },
  conversation_analysis_created: { icon: Sparkles, badge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
  payment_detected: { icon: CreditCard, badge: 'bg-green-100 text-green-800 border-green-200' },
  customer_sent_location: { icon: MapPin, badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  ai_detected_urgency: { icon: AlertTriangle, badge: 'bg-rose-100 text-rose-800 border-rose-200' }
};

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
            {events.map((event) => {
              const ui = eventUi[event.event_type] || { icon: MessageCircle, badge: 'bg-slate-100 text-slate-800 border-slate-200' };
              const Icon = ui.icon;
              return (
                <div key={event.id} className="border-l-2 border-slate-200 pl-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className={ui.badge}>
                      <span className="inline-flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        {event.event_type}
                      </span>
                    </Badge>
                    <span className="text-xs text-slate-500">{new Date(event.created_date).toLocaleString()}</span>
                  </div>
                  <p className="font-medium text-sm text-slate-900">{event.title}</p>
                  {event.description && <p className="text-sm text-slate-600">{event.description}</p>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}