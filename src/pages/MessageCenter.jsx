import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Search, Filter, Eye, Image as ImageIcon, PlayCircle, FileAudio, File, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function RawJsonDialog({ open, onOpenChange, title, jsonString }) {
  let pretty = "";
  try { pretty = JSON.stringify(JSON.parse(jsonString || "{}"), null, 2); } catch { pretty = jsonString || ""; }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <pre className="bg-slate-950 text-slate-100 p-3 rounded-md overflow-auto max-h-[60vh] text-xs whitespace-pre-wrap">{pretty}</pre>
      </DialogContent>
    </Dialog>
  );
}

function MediaBadge({ msg }) {
  const t = msg.message_type;
  if (!msg.media_url) return null;
  if (t === 'image') return <Badge className="bg-blue-100 text-blue-800 inline-flex items-center gap-1"><ImageIcon className="w-3 h-3"/>Imagen</Badge>;
  if (t === 'video') return <Badge className="bg-purple-100 text-purple-800 inline-flex items-center gap-1"><PlayCircle className="w-3 h-3"/>Video</Badge>;
  if (t === 'audio') return <Badge className="bg-amber-100 text-amber-800 inline-flex items-center gap-1"><FileAudio className="w-3 h-3"/>Audio</Badge>;
  return <Badge className="bg-slate-100 text-slate-800 inline-flex items-center gap-1"><File className="w-3 h-3"/>Archivo</Badge>;
}

export default function MessageCenter() {
  const [tab, setTab] = useState("messages");
  // Filtros comunes (mensajes)
  const [q, setQ] = useState("");
  const [direction, setDirection] = useState("all");
  const [sender, setSender] = useState("all");
  const [type, setType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hasMedia, setHasMedia] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preWorkOnly, setPreWorkOnly] = useState("all");
  const [rawOpen, setRawOpen] = useState(false);
  const [rawTitle, setRawTitle] = useState("");
  const [rawContent, setRawContent] = useState("");

  // Mensajes (BitacoraWhatsApp)
  const { data: messages = [], isLoading: loadingMsgs, refetch } = useQuery({
    queryKey: ['messageCenter','messages'],
    queryFn: async () => {
      // Traer los más recientes primero
      const list = await base44.entities.BitacoraWhatsApp.filter({}, '-created_date', 500);
      return list;
    },
    initialData: [],
    refetchInterval: 5000,
  });

  // Webhook Events
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['messageCenter','webhookEvents'],
    queryFn: async () => base44.entities.WebhookEvent.filter({}, '-created_date', 300),
    initialData: [],
    refetchInterval: 7000,
  });

  // Delivery Receipts
  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ['messageCenter','receipts'],
    queryFn: async () => base44.entities.DeliveryReceipt.filter({}, '-created_date', 300),
    initialData: [],
    refetchInterval: 7000,
  });

  const filteredMessages = useMemo(() => {
    let arr = messages.slice().sort((a,b) => new Date(b.timestamp || b.created_date) - new Date(a.timestamp || a.created_date));
    if (direction !== 'all') arr = arr.filter(m => (m.direction || 'inbound') === direction);
    if (sender !== 'all') arr = arr.filter(m => (m.sender_type || (m.direction === 'inbound' ? 'customer' : 'bot')) === sender);
    if (type !== 'all') arr = arr.filter(m => (m.message_type || 'text') === type);
    if (statusFilter !== 'all') arr = arr.filter(m => (m.delivery_status || '') === statusFilter);
    if (hasMedia !== 'all') arr = arr.filter(m => hasMedia === 'yes' ? !!m.media_url : !m.media_url);
    if (preWorkOnly !== 'all') arr = arr.filter(m => preWorkOnly === 'yes' ? !(m.trabajo_id || m.job_id) : !!(m.trabajo_id || m.job_id));
    if (fromDate) arr = arr.filter(m => (m.timestamp || m.created_date) >= `${fromDate}T00:00:00`);
    if (toDate) arr = arr.filter(m => (m.timestamp || m.created_date) <= `${toDate}T23:59:59`);
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(m =>
        (m.text || m.texto_mensaje || '').toLowerCase().includes(s) ||
        (m.caption || '').toLowerCase().includes(s) ||
        (m.from_phone || '').toLowerCase().includes(s)
      );
    }
    return arr;
  }, [messages, q, direction, sender, type, fromDate, toDate, hasMedia, statusFilter, preWorkOnly]);

  const exportCSV = (rows, headers, filename) => {
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = headers.map(h => escape(h.label)).join(',');
    const body = rows.map(r => headers.map(h => escape(h.value(r))).join(',')).join('\n');
    const csv = [head, body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const msgHeaders = [
    { label: 'Fecha', value: r => r.timestamp || r.created_date },
    { label: 'Dirección', value: r => r.direction || '' },
    { label: 'Remitente', value: r => r.sender_type || '' },
    { label: 'Tipo', value: r => r.message_type || '' },
    { label: 'Texto', value: r => r.text || r.texto_mensaje || '' },
    { label: 'Caption', value: r => r.caption || '' },
    { label: 'MediaURL', value: r => r.media_url || '' },
    { label: 'Estado', value: r => r.delivery_status || '' },
    { label: 'ClienteID', value: r => r.customer_id || '' },
    { label: 'TrabajoID', value: r => r.trabajo_id || r.job_id || '' },
    { label: 'MensajeID', value: r => r.message_id || r.mensaje_id || '' },
  ];

  const eventHeaders = [
    { label: 'Fecha', value: r => r.created_date },
    { label: 'Evento', value: r => r.event || '' },
    { label: 'Tipo', value: r => r.event_type || '' },
    { label: 'Teléfono', value: r => r.phone || '' },
    { label: 'MsgID', value: r => r.message_id || '' },
    { label: 'Dirección', value: r => r.direction || '' },
    { label: 'ConvKey', value: r => r.conversation_key || '' },
    { label: 'Procesado', value: r => (r.processed_ok ? 'sí' : 'no') },
  ];

  const receiptHeaders = [
    { label: 'Fecha', value: r => r.created_date },
    { label: 'MsgID', value: r => r.provider_message_id || '' },
    { label: 'Destinatario', value: r => r.recipient_id || '' },
    { label: 'Estado', value: r => r.status || '' },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[120rem] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Centro de Mensajes</h1>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />Aquí puedes ver también conversaciones de WhatsApp antes de que exista un trabajo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportCSV(filteredMessages, msgHeaders, `mensajes_${Date.now()}.csv`)} className="gap-2">
              <Download className="w-4 h-4"/> Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <Filter className="w-4 h-4"/> Refrescar
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="messages">Mensajes</TabsTrigger>
            <TabsTrigger value="events">Webhook Events</TabsTrigger>
            <TabsTrigger value="receipts">Recepciones</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-4">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">Mensajes (Bitácora)</CardTitle>
                <div className="grid md:grid-cols-6 gap-2">
                  <div className="md:col-span-2 relative">
                    <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400"/>
                    <Input className="pl-8" placeholder="Buscar texto / teléfono..." value={q} onChange={e=>setQ(e.target.value)} />
                  </div>
                  <Select value={direction} onValueChange={setDirection}>
                    <SelectTrigger><SelectValue placeholder="Dirección"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="inbound">Entrantes</SelectItem>
                      <SelectItem value="outbound">Salientes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sender} onValueChange={setSender}>
                    <SelectTrigger><SelectValue placeholder="Remitente"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="customer">Cliente</SelectItem>
                      <SelectItem value="bot">Bot</SelectItem>
                      <SelectItem value="agent">Agente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue placeholder="Tipo"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="image">Imagen</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Documento</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={hasMedia} onValueChange={setHasMedia}>
                    <SelectTrigger><SelectValue placeholder="Medios"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Con y sin medios</SelectItem>
                      <SelectItem value="yes">Solo con medios</SelectItem>
                      <SelectItem value="no">Solo sin medios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
                  <Input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} />
                </div>
                <div className="grid md:grid-cols-4 gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Estado de entrega"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sent">Enviado</SelectItem>
                      <SelectItem value="delivered">Entregado</SelectItem>
                      <SelectItem value="read">Leído</SelectItem>
                      <SelectItem value="failed">Fallido</SelectItem>
                      <SelectItem value="echo_received">Echo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={preWorkOnly} onValueChange={setPreWorkOnly}>
                    <SelectTrigger><SelectValue placeholder="Etapa"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las etapas</SelectItem>
                      <SelectItem value="yes">Antes de crear trabajo</SelectItem>
                      <SelectItem value="no">Con trabajo creado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMsgs ? (
                  <p className="text-sm text-slate-500">Cargando mensajes...</p>
                ) : (
                  <div className="overflow-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Fecha</th>
                          <th className="px-3 py-2">Dir</th>
                          <th className="px-3 py-2">Remitente</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2 text-left">Texto / Caption</th>
                          <th className="px-3 py-2">Medio</th>
                          <th className="px-3 py-2">Estado</th>
                          <th className="px-3 py-2">Cliente</th>
                          <th className="px-3 py-2">Trabajo</th>
                          <th className="px-3 py-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMessages.map(m => (
                          <tr key={m.id} className="border-t hover:bg-slate-50">
                            <td className="px-3 py-2 whitespace-nowrap">{m.timestamp || m.created_date ? format(new Date(m.timestamp || m.created_date), "dd MMM yyyy, HH:mm", { locale: es }) : ''}</td>
                            <td className="px-3 py-2 text-center">
                              <Badge variant="outline">{m.direction || 'inbound'}</Badge>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge className="bg-slate-100 text-slate-800">{m.sender_type || (m.direction === 'inbound' ? 'customer' : 'bot')}</Badge>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge variant="outline">{m.message_type || 'text'}</Badge>
                            </td>
                            <td className="px-3 py-2 max-w-[480px]">
                              <div className="text-slate-800 line-clamp-2">{m.text || m.texto_mensaje || m.caption || ''}</div>
                            </td>
                            <td className="px-3 py-2 text-center">{m.media_url ? <MediaBadge msg={m} /> : <span className="text-slate-400">—</span>}</td>
                            <td className="px-3 py-2 text-center">{m.delivery_status ? <Badge variant="outline">{m.delivery_status}</Badge> : <span className="text-slate-400">—</span>}</td>
                            <td className="px-3 py-2 text-center text-xs">{m.customer_id || '—'}</td>
                            <td className="px-3 py-2 text-center text-xs">{m.trabajo_id || m.job_id || '—'}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-2 justify-center">
                                {m.media_url && (
                                  <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs inline-flex items-center gap-1">
                                    <Eye className="w-3 h-3"/>Abrir
                                  </a>
                                )}
                                {m.raw_payload && (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={()=>{ setRawTitle(`Raw payload • Msg ${m.mensaje_id || m.message_id || m.id}`); setRawContent(m.raw_payload); setRawOpen(true); }}>
                                    <FileText className="w-3 h-3 mr-1"/>Raw
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-base">Eventos Webhook</CardTitle>
                <Button variant="outline" onClick={() => exportCSV(events, eventHeaders, `webhook_events_${Date.now()}.csv`)} className="gap-2"><Download className="w-4 h-4"/> Exportar CSV</Button>
              </CardHeader>
              <CardContent>
                {loadingEvents ? (
                  <p className="text-sm text-slate-500">Cargando eventos...</p>
                ) : (
                  <div className="overflow-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Fecha</th>
                          <th className="px-3 py-2">Evento</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Teléfono</th>
                          <th className="px-3 py-2">MsgID</th>
                          <th className="px-3 py-2">Conv Key</th>
                          <th className="px-3 py-2">OK</th>
                          <th className="px-3 py-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map(e => (
                          <tr key={e.id} className="border-t hover:bg-slate-50">
                            <td className="px-3 py-2 whitespace-nowrap">{e.created_date ? format(new Date(e.created_date), "dd MMM yyyy, HH:mm", { locale: es }) : ''}</td>
                            <td className="px-3 py-2 text-center">{e.event || '—'}</td>
                            <td className="px-3 py-2 text-center"><Badge variant="outline">{e.event_type || '—'}</Badge></td>
                            <td className="px-3 py-2 text-center">{e.phone || '—'}</td>
                            <td className="px-3 py-2 text-center text-xs">{e.message_id || '—'}</td>
                            <td className="px-3 py-2 text-center text-xs">{e.conversation_key || '—'}</td>
                            <td className="px-3 py-2 text-center">{e.processed_ok ? '✅' : '—'}</td>
                            <td className="px-3 py-2">
                              {e.raw_payload && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={()=>{ setRawTitle(`Raw Webhook • ${e.id}`); setRawContent(e.raw_payload); setRawOpen(true); }}>
                                  <FileText className="w-3 h-3 mr-1"/>Raw
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts" className="mt-4">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-base">Recepciones (Delivery Receipts)</CardTitle>
                <Button variant="outline" onClick={() => exportCSV(receipts, receiptHeaders, `delivery_receipts_${Date.now()}.csv`)} className="gap-2"><Download className="w-4 h-4"/> Exportar CSV</Button>
              </CardHeader>
              <CardContent>
                {loadingReceipts ? (
                  <p className="text-sm text-slate-500">Cargando recepciones...</p>
                ) : (
                  <div className="overflow-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Fecha</th>
                          <th className="px-3 py-2">MsgID</th>
                          <th className="px-3 py-2">Destinatario</th>
                          <th className="px-3 py-2">Estado</th>
                          <th className="px-3 py-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipts.map(r => (
                          <tr key={r.id} className="border-t hover:bg-slate-50">
                            <td className="px-3 py-2 whitespace-nowrap">{r.created_date ? format(new Date(r.created_date), "dd MMM yyyy, HH:mm", { locale: es }) : ''}</td>
                            <td className="px-3 py-2 text-center text-xs">{r.provider_message_id || '—'}</td>
                            <td className="px-3 py-2 text-center">{r.recipient_id || '—'}</td>
                            <td className="px-3 py-2 text-center"><Badge variant="outline">{r.status || '—'}</Badge></td>
                            <td className="px-3 py-2">
                              {r.raw_payload && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={()=>{ setRawTitle(`Raw Receipt • ${r.id}`); setRawContent(r.raw_payload); setRawOpen(true); }}>
                                  <FileText className="w-3 h-3 mr-1"/>Raw
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <RawJsonDialog open={rawOpen} onOpenChange={setRawOpen} title={rawTitle} jsonString={rawContent} />
    </div>
  );
}