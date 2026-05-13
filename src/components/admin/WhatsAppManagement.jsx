import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WhatsAppConversationPanel from "@/components/admin/WhatsAppConversationPanel";
import { MessageCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function WhatsAppManagement() {
  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["waManagementCustomers"],
    queryFn: async () => {
      const raw = await base44.entities.Customer.list();
      return raw.map((c) => (c?.data ? { ...c, ...c.data } : c));
    },
    initialData: [],
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["waManagementInquiries"],
    queryFn: async () => base44.entities.ClientInquiry.filter({}, "-created_date"),
    initialData: [],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["waManagementMessages"],
    queryFn: async () => base44.entities.BitacoraWhatsApp.filter({}, "-timestamp", 500),
    initialData: [],
    refetchInterval: 5000,
  });

  const conversationRows = useMemo(() => {
    const byCustomer = new Map();

    messages.forEach((msg) => {
      const customerId = msg.customer_id;
      const phone = msg.from_phone || msg.phone;
      const normalizedPhone = String(phone || '').replace(/\D/g, '');
      const key = customerId || normalizedPhone;
      if (!key) return;

      const customer = customers.find((c) => c.id === customerId) || customers.find((c) => {
        const customerPhone = String(c.phone || c.wa_id || '').replace(/\D/g, '');
        return customerPhone && customerPhone === normalizedPhone;
      });
      const relatedInquiry = inquiries.find((i) => i.customer_id === customer?.id) || inquiries.find((i) => i.id === (msg.trabajo_id || msg.job_id));
      const current = byCustomer.get(key);

      if (!current) {
        byCustomer.set(key, {
          key,
          customer,
          inquiry: relatedInquiry || null,
          latestMessage: msg,
          totalMessages: 1,
        });
        return;
      }

      current.totalMessages += 1;
      const currentDate = new Date(current.latestMessage.timestamp || current.latestMessage.created_date);
      const nextDate = new Date(msg.timestamp || msg.created_date);
      if (nextDate > currentDate) {
        current.latestMessage = msg;
      }
      if (!current.customer && customer) current.customer = customer;
      if (!current.inquiry && relatedInquiry) current.inquiry = relatedInquiry;
    });

    const normalizedSearch = search.trim().toLowerCase();

    return Array.from(byCustomer.values())
      .filter((row) => {
        if (!normalizedSearch) return true;
        const text = [
          row.customer?.full_name,
          row.customer?.phone,
          row.inquiry?.service_type,
          row.inquiry?.status,
          row.latestMessage?.text,
          row.latestMessage?.texto_mensaje,
        ].join(" ").toLowerCase();
        return text.includes(normalizedSearch);
      })
      .sort((a, b) => new Date(b.latestMessage.timestamp || b.latestMessage.created_date) - new Date(a.latestMessage.timestamp || a.latestMessage.created_date));
  }, [messages, customers, inquiries, search]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conversaciones de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, teléfono, estado, servicio o mensaje..." className="pl-9" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {conversationRows.map((row) => (
              <button
                key={row.key}
                onClick={() => setSelectedConversation(row)}
                className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-proman-yellow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{row.customer?.full_name || row.inquiry?.client_name || "Sin nombre"}</div>
                    <div className="text-sm text-slate-500">{row.customer?.phone || row.latestMessage?.phone || row.latestMessage?.from_phone || "Sin teléfono"}</div>
                  </div>
                  <Badge variant="outline">{row.totalMessages} msgs</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800">{row.inquiry ? "Con registro" : "Solo conversación"}</Badge>
                  {row.inquiry?.status && <Badge className="bg-slate-100 text-slate-700">{row.inquiry.status}</Badge>}
                  {row.inquiry?.service_type && <Badge className="bg-blue-100 text-blue-800">{row.inquiry.service_type}</Badge>}
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{row.latestMessage?.text || row.latestMessage?.texto_mensaje || row.latestMessage?.caption || "Sin texto visible"}</p>
                <p className="mt-3 text-xs text-slate-400">
                  Último mensaje: {row.latestMessage?.timestamp || row.latestMessage?.created_date ? format(new Date(row.latestMessage.timestamp || row.latestMessage.created_date), "dd MMM yyyy, HH:mm", { locale: es }) : "—"}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedConversation && (
        <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
          <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none p-6 overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Conversación de WhatsApp</DialogTitle>
            </DialogHeader>
            <WhatsAppConversationPanel
              customerId={selectedConversation.customer?.id || selectedConversation.inquiry?.customer_id}
              inquiryId={selectedConversation.inquiry?.id}
              phone={selectedConversation.customer?.phone || selectedConversation.latestMessage?.phone || selectedConversation.latestMessage?.from_phone}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}