import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";

export default function CustomerContextAgentCard({ inquiry, customer }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState(null);

  const phone = customer?.phone || inquiry?.phone;

  const { data: messages = [] } = useQuery({
    queryKey: ["agentContextMessages", inquiry?.id, customer?.id, phone],
    queryFn: async () => {
      const byCustomer = customer?.id ? await base44.entities.BitacoraWhatsApp.filter({ customer_id: customer.id }, "timestamp") : [];
      const byInquiry = inquiry?.id ? await base44.entities.BitacoraWhatsApp.filter({ trabajo_id: inquiry.id }, "timestamp") : [];
      const byPhone = phone ? await base44.entities.BitacoraWhatsApp.filter({ phone }, "timestamp") : [];
      return Array.from(new Map([...byCustomer, ...byInquiry, ...byPhone].map((item) => [item.id, item])).values())
        .sort((a, b) => new Date(a.timestamp || a.created_date) - new Date(b.timestamp || b.created_date));
    },
    enabled: !!inquiry,
    initialData: [],
  });

  const contextPrompt = useMemo(() => {
    const transcript = messages
      .slice(-25)
      .map((msg) => {
        const role = msg.direction === "outbound" ? "PROMAN" : "CLIENTE";
        const text = msg.text || msg.texto_mensaje || msg.caption || "[sin texto]";
        return `${role}: ${text}`;
      })
      .join("\n");

    return `Contexto del cliente abierto:\nCliente: ${customer?.full_name || inquiry?.client_name || "Sin nombre"}\nTeléfono: ${phone || "Sin teléfono"}\nTrabajo ID: ${inquiry?.id || "N/A"}\nServicio: ${inquiry?.service_type || inquiry?.rubro || "N/A"}\nEstado actual: ${inquiry?.status || "N/A"}\n\nMensajes recientes:\n${transcript || "Sin mensajes"}\n\nSolicitud del usuario: `;
  }, [messages, customer, inquiry, phone]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      let conv = conversation;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: "gestionBot",
          metadata: {
            name: `Gestión ${customer?.full_name || inquiry?.id || "cliente"}`,
            description: "Conversación contextual desde ficha de cliente",
          },
        });
        setConversation(conv);
      }

      await base44.agents.addMessage(conv, {
        role: "user",
        content: `${contextPrompt}${input.trim()}`,
      });

      setInput("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-violet-300 bg-violet-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4" />
          Asistente con contexto real
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Este asistente ya toma el cliente, el trabajo y los mensajes abiertos como contexto.</p>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: actualiza el cliente con el nombre de la empresa y crea los cambios necesarios"
          rows={3}
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()} className="bg-proman-navy text-white hover:opacity-90">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Enviar al asistente
        </Button>
      </CardContent>
    </Card>
  );
}