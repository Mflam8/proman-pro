import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { sendN8nMessage } from "@/functions/sendN8nMessage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Search, Filter, Download, Image as ImageIcon, FileText, PlayCircle, MessageCircle, Bot, User as UserIcon, ChevronDown, ChevronUp } from "lucide-react";
import AISuggestionsPanel from "./AISuggestionsPanel";
import PipelineDiagnosticsPanel from "./PipelineDiagnosticsPanel";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function MessageBubble({ msg }) {
  const isOutbound = msg.direction === 'outbound';
  const isCustomer = msg.sender_type === 'customer' || (!msg.sender_type && msg.direction === 'inbound');
  const isReaction = msg.event_type === 'reaction' || msg.message_type === 'reaction';
  const isStatus = msg.event_type === 'status' || msg.message_type === 'status';
  const roleBadge = isCustomer ? (
    <Badge className="bg-slate-100 text-slate-700 flex items-center gap-1"><UserIcon className="w-3 h-3" />Cliente</Badge>
  ) : msg.sender_type === 'agent' ? (
    <Badge className="bg-blue-100 text-blue-800">Agente</Badge>
  ) : (
    <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><Bot className="w-3 h-3" />Bot</Badge>
  );

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl border p-3 shadow-sm ${isOutbound ? 'bg-proman-navy text-white' : 'bg-white'}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 text-xs opacity-80">
            {roleBadge}
            <Badge variant="outline">{msg.direction === 'outbound' ? 'Saliente' : 'Entrante'}</Badge>
            {msg.event_type && <Badge variant="outline">{msg.event_type}</Badge>}
            {msg.message_type && <Badge variant="outline">{msg.message_type}</Badge>}
          </div>
          <div className="text-[11px] opacity-70">
            {msg.timestamp ? format(new Date(msg.timestamp), "dd MMM yyyy, HH:mm", { locale: es }) : ''}
          </div>
        </div>
        {isReaction ? (
          <p className={`text-sm font-medium ${isOutbound ? 'text-white' : 'text-slate-800'}`}>
            Reacción {msg.reaction_emoji || ''} {msg.target_message_id ? `al mensaje ${msg.target_message_id}` : ''}
          </p>
        ) : isStatus ? (
          <p className={`text-sm font-medium ${isOutbound ? 'text-white' : 'text-slate-800'}`}>
            Estado: {msg.delivery_status || msg.text || 'actualizado'}
          </p>
        ) : msg.text ? (
          <p className={`whitespace-pre-wrap text-sm ${isOutbound ? 'text-white' : 'text-slate-800'}`}>{msg.text}</p>
        ) : null}
        {msg.caption && (
          <p className={`whitespace-pre-wrap text-xs mt-1 italic ${isOutbound ? 'text-white/90' : 'text-slate-600'}`}>{msg.caption}</p>
        )}

        {/* Media rendering */}
        {msg.media_url && (
          <div className="mt-2">
            {msg.message_type === 'image' && (
              <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block group">
                <img src={msg.media_url} alt={msg.caption || 'Imagen'} className="max-h-64 rounded-lg border" />
              </a>
            )}
            {msg.message_type === 'video' && (
              <video controls className="max-h-64 rounded-lg border w-full">
                <source src={msg.media_url} type={msg.mime_type || 'video/mp4'} />
              </video>
            )}
            {msg.message_type === 'audio' && (
              <audio controls className="w-full">
                <source src={msg.media_url} type={msg.mime_type || 'audio/mpeg'} />
              </audio>
            )}
            {msg.message_type === 'document' && (
              <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline mt-1">
                <FileText className="w-4 h-4" /> Ver documento
              </a>
            )}
            <div className="mt-2">
              <a href={msg.media_url} download className="inline-flex items-center gap-2 text-xs underline">
                <Download className="w-3 h-3" /> Descargar
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WhatsAppConversationPanel({ customerId, inquiryId, phone }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [direction, setDirection] = useState("all");
  const [sender, setSender] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("all");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['waLog', customerId, phone],
    queryFn: async () => {
      const byCustomer = customerId ? await base44.entities.BitacoraWhatsApp.filter({ customer_id: customerId }, 'timestamp') : [];
      const byPhone = phone ? await base44.entities.BitacoraWhatsApp.filter({ from_phone: phone }, 'timestamp') : [];
      const byPhoneAlias = phone ? await base44.entities.BitacoraWhatsApp.filter({ phone }, 'timestamp') : [];

      const merged = [...byCustomer, ...byPhone, ...byPhoneAlias];
      const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
      return unique;
    },
    enabled: isOpen && (!!customerId || !!phone),
    initialData: [],
    refetchInterval: isOpen ? 5000 : false,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobsByCustomer', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      return base44.entities.ClientInquiry.filter({ customer_id: customerId }, '-created_date');
    },
    enabled: isOpen && !!customerId,
    initialData: [],
  });

  const filtered = useMemo(() => {
    let arr = messages.slice().sort((a,b) => new Date(a.message_timestamp || a.timestamp || a.created_date) - new Date(b.message_timestamp || b.timestamp || b.created_date));

    // Filtros
    if (type !== 'all') arr = arr.filter(m => (m.message_type || 'text') === type);
    if (type !== 'all') arr = arr.filter(m => (m.message_type || 'text') === type);
    if (direction !== 'all') arr = arr.filter(m => (m.direction || 'inbound') === direction);
    if (sender !== 'all') arr = arr.filter(m => (m.sender_type || (m.direction === 'inbound' ? 'customer' : 'bot')) === sender);
    if (selectedJobId !== 'all') arr = arr.filter(m => (m.trabajo_id === selectedJobId || m.job_id === selectedJobId));
    if (fromDate) arr = arr.filter(m => (m.timestamp || m.created_date) >= `${fromDate}T00:00:00`);
    if (toDate) arr = arr.filter(m => (m.timestamp || m.created_date) <= `${toDate}T23:59:59`);
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter(m =>
        (m.texto_mensaje || m.text || '').toLowerCase().includes(s) ||
        (m.caption || '').toLowerCase().includes(s)
      );
    }

    // Mapear a interfaz uniforme
    return arr.map(m => ({
      id: m.id,
      direction: m.direction || 'inbound',
      sender_type: m.sender_type || (m.direction === 'inbound' ? 'customer' : 'bot'),
      message_type: m.message_type || 'text',
      event_type: m.event_type || 'message',
      text: m.text ?? m.texto_mensaje ?? '',
      caption: m.caption ?? '',
      media_url: m.media_url ?? '',
      mime_type: m.mime_type ?? '',
      reaction_emoji: m.reaction_emoji ?? '',
      target_message_id: m.target_message_id ?? '',
      delivery_status: m.delivery_status ?? '',
      timestamp: m.message_timestamp || m.timestamp || m.created_date,
      job_id: m.trabajo_id || m.job_id || null,
    }));
  }, [messages, type, direction, sender, selectedJobId, fromDate, toDate, search]);

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const last50 = filtered.slice(-50);
      const preview = last50.map(m => `${format(new Date(m.timestamp), 'yyyy-MM-dd HH:mm')} [${m.sender_type}/${m.direction}] ${m.message_type}: ${m.text || m.caption || (m.media_url ? '[media]' : '')}`).join('\n');
      const prompt = `Actúa como coordinador de soporte. Resume en español claro la conversación del cliente, puntos clave, dudas, acuerdos, y próximos pasos sugeridos.\n\nConversación (reciente a más antigua):\n${preview}\n\nDevuelve: 1) Resumen ejecutivo (3-5 bullets) 2) Info faltante 3) Próximos pasos sugeridos.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setSummaryText(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
      setSummaryOpen(true);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() && !file) return;
    setSending(true);
    try {
      let mediaUrl = null;
      let mediaType = null;
      if (file) {
        const up = await base44.integrations.Core.UploadFile({ file });
        mediaUrl = up.file_url;
        const ext = file.type || '';
        if (ext.startsWith('image/')) mediaType = 'image';
        else if (ext.startsWith('video/')) mediaType = 'video';
        else if (ext.startsWith('audio/')) mediaType = 'audio';
        else mediaType = 'document';
      }
      // Enviar vía n8n (centralizado)
      await sendN8nMessage({
        customer_id: customerId,
        inquiry_id: inquiryId || null,
        phone: phone || null,
        text: messageText.trim() || null,
        media_url: mediaUrl,
        message_type: mediaType,
      });
      setMessageText("");
      setFile(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-2 border-emerald-500">
      <CardHeader className="bg-emerald-500 text-white">
        <CardTitle className="flex items-center justify-between w-full">
          <span>💬 Conversación WhatsApp</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsOpen(v => !v)} className="bg-white text-emerald-700 hover:bg-emerald-50">
              {isOpen ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {isOpen ? 'Ocultar' : 'Mostrar'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSummarize} disabled={summarizing}>
              {summarizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />} Resumen
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={`pt-4 space-y-3 ${isOpen ? '' : 'hidden'}`}>
        {/* Filtros */}
        <div className="grid md:grid-cols-6 gap-2">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar texto/caption..." className="pl-8" />
            </div>
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="image">Imagen</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="document">Documento</SelectItem>
              <SelectItem value="reaction">Reacción</SelectItem>
              <SelectItem value="status">Estado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger><SelectValue placeholder="Dirección" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="inbound">Entrantes</SelectItem>
              <SelectItem value="outbound">Salientes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sender} onValueChange={setSender}>
            <SelectTrigger><SelectValue placeholder="Remitente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="customer">Cliente</SelectItem>
              <SelectItem value="bot">Bot</SelectItem>
              <SelectItem value="agent">Agente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger><SelectValue placeholder="Trabajo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los trabajos</SelectItem>
              {jobs.map(j => (
                <SelectItem key={j.id} value={j.id}>{j.service_type || j.rubro || 'Trabajo'} — {format(new Date(j.created_date), 'dd MMM', { locale: es })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>

        <AISuggestionsPanel
          inquiry={inquiryId ? jobs.find((j) => j.id === inquiryId) : null}
          customer={customerId ? { id: customerId, phone } : null}
          phone={phone}
          conversationId={messages.find((m) => m.conversation_id)?.conversation_id || null}
          onOpenCreateInquiry={() => window.dispatchEvent(new CustomEvent('open-create-inquiry-from-whatsapp'))}
        />

        <PipelineDiagnosticsPanel
          inquiryId={inquiryId}
          conversationId={messages.find((m) => m.conversation_id)?.conversation_id || null}
          phone={phone}
        />

        {/* Lista */}
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Cargando...</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">Sin mensajes con los filtros actuales.</p>
          ) : (
            filtered.map(m => <MessageBubble key={m.id} msg={m} />)
          )}
        </div>

        {/* Composer */}
        <div className="pt-3 border-t">
          <Label className="text-sm mb-1 block">Responder (se enviará vía n8n)</Label>
          <div className="grid md:grid-cols-5 gap-2">
            <div className="md:col-span-4">
              <Input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Escribe tu mensaje..." />
            </div>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Enviar
            </Button>
          </div>
          <div className="mt-2">
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            <p className="text-[11px] text-slate-500 mt-1">Puedes adjuntar imagen, audio, video o documento.</p>
          </div>
        </div>
      </CardContent>

      {/* Resumen Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resumen de conversación</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {summaryText || 'Sin contenido'}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}