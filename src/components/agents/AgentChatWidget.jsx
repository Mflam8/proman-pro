import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageCircle, Send } from "lucide-react";

export default function AgentChatWidget({ agentName = "gestionBot" }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const unsubscribeRef = useRef(null);

  // Load or create a conversation and subscribe to updates
  useEffect(() => {
    let mounted = true;
    const key = `agentConv-${agentName}`;

    const ensureConversation = async () => {
      try {
        const savedId = localStorage.getItem(key);
        let conv = null;

        if (savedId) {
          conv = await base44.agents.getConversation(savedId);
        }

        if (!conv) {
          conv = await base44.agents.createConversation({
            agent_name: agentName,
            metadata: { name: "Gestión rápida", description: "Chat rápido para gestionar trabajos" },
          });
          localStorage.setItem(key, conv.id);
        }

        if (!mounted) return;
        setConversation(conv);
        setMessages(conv.messages || []);

        // Subscribe to streaming updates
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        unsubscribeRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
        });
      } catch (e) {
        console.error("AgentChatWidget error:", e);
      }
    };

    ensureConversation();

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [agentName]);

  const handleSend = async () => {
    if (!conversation || !input.trim()) return;
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: input.trim(),
      });
      setInput("");
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-proman-navy text-white shadow-lg p-4 hover:opacity-90 focus:outline-none"
        aria-label="Abrir chat de gestión"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-proman-navy text-white px-4 py-3 flex items-center justify-between">
            <div className="font-semibold">Asistente de Gestión</div>
            <button onClick={() => setOpen(false)} className="hover:opacity-80" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 h-80 overflow-y-auto space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500">Inicia la conversación para crear o actualizar trabajos.</p>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  m.role === 'user' ? 'bg-proman-navy text-white' : 'bg-white border'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t bg-white flex items-center gap-2">
            <Input
              placeholder="Escribe tu mensaje..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button onClick={handleSend} disabled={!input.trim() || sending} className="bg-proman-yellow text-proman-navy">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}