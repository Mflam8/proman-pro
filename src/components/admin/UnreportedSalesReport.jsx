import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Download, FileSearch, History, CheckCircle2, Clock3 } from "lucide-react";
import HistoricalAuditReviewCard from "@/components/admin/HistoricalAuditReviewCard";

const money = (value) => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(value || 0));

export default function UnreportedSalesReport() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [report, setReport] = useState(null);

  const { data: reviews = [] } = useQuery({
    queryKey: ["finance-audit-reviews", month],
    queryFn: () => base44.entities.FinanceAuditReview.filter({ audit_period: month }),
    initialData: []
  });

  const reviewMap = useMemo(() => {
    const map = new Map();
    reviews.forEach((item) => {
      const review = item?.data ? { ...item, ...item.data } : item;
      map.set(review.review_key, review);
    });
    return map;
  }, [reviews]);

  const handleRun = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("findUnreportedSales", { month });
      setReport(response.data);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (item, reviewStatus) => {
    setSavingKey(item.review_key);
    try {
      const existing = reviewMap.get(item.review_key);
      const payload = {
        review_key: item.review_key,
        audit_period: month,
        conversation_id: item.conversation_id,
        customer_id: item.customer_id,
        inquiry_id: item.inquiry_id,
        phone: item.detected_phone || item.phone,
        customer_name: item.detected_name || item.customer_name,
        detected_service: item.detected_service,
        detected_address: item.detected_address,
        detected_amount: item.chat_amount || item.system_amount || 0,
        review_status: reviewStatus
      };

      if (existing?.id) {
        await base44.entities.FinanceAuditReview.update(existing.id, payload);
      } else {
        await base44.entities.FinanceAuditReview.create(payload);
      }

      await queryClient.invalidateQueries({ queryKey: ["finance-audit-reviews", month] });
    } finally {
      setSavingKey("");
    }
  };

  const conversations = report?.conversations || [];

  const exportRows = useMemo(() => {
    return conversations.map((item) => {
      const review = reviewMap.get(item.review_key);
      return {
        periodo: month,
        revision_manual: review?.review_status || "pendiente",
        clasificacion: item.contract_status_label,
        cliente: item.detected_name || item.customer_name,
        telefono: item.detected_phone || item.phone,
        direccion: item.detected_address,
        servicio: item.detected_service,
        monto_chat: item.chat_amount,
        monto_sistema: item.system_amount,
        pago_registrado: item.recorded_amount,
        trabajos_vinculados: item.linked_inquiry_count,
        mensajes_mes: item.message_count,
        ultimo_mensaje: item.latest_message_at,
        resumen: item.audit_summary,
        evidencia: (item.evidence_snippets || []).join(" | ")
      };
    });
  }, [conversations, month, reviewMap]);

  const handleExport = () => {
    if (!exportRows.length) return;
    const header = Object.keys(exportRows[0]);
    const csv = [
      header.join(","),
      ...exportRows.map((row) => header.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria_historica_${month}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const reviewSummary = useMemo(() => {
    let confirmed = 0;
    let discarded = 0;
    conversations.forEach((item) => {
      const status = reviewMap.get(item.review_key)?.review_status || "pendiente";
      if (status === "confirmado") confirmed += 1;
      if (status === "descartado") discarded += 1;
    });
    return {
      confirmed,
      discarded,
      pending: Math.max(conversations.length - confirmed - discarded, 0)
    };
  }, [conversations, reviewMap]);

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-amber-900">
              <p className="font-semibold">Auditoría histórica solo para revisar lo ya ocurrido</p>
              <p>Este módulo revisa conversación por conversación del mes elegido y detecta nombre, teléfono, dirección, servicio y montos escritos en el chat.</p>
              <p>No cambia tu forma de trabajo hacia adelante: sirve únicamente para reconstruir el histórico y que tú confirmes manualmente qué sí fue contratado.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span className="flex items-center gap-2 text-proman-navy"><FileSearch className="w-5 h-5 text-proman-yellow" />Auditoría histórica mensual</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleExport} disabled={!exportRows.length}>
                <Download className="w-4 h-4 mr-2" />Exportar CSV
              </Button>
              <Button onClick={handleRun} disabled={loading} className="bg-proman-navy text-white">
                {loading ? "Auditando..." : "Auditar mes"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-sm font-medium text-proman-navy mb-2">Mes a revisar</p>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <Badge className="bg-slate-100 text-slate-700">Se agrupa por número / conversación</Badge>
            <Badge className="bg-slate-100 text-slate-700">Confirmación manual requerida</Badge>
          </div>
          {report?.criteria && <p className="text-sm text-gray-600">{report.criteria}</p>}
        </CardContent>
      </Card>

      {report?.success && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <Card className="border-l-4 border-l-slate-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Conversaciones</p><p className="text-3xl font-bold text-proman-navy mt-1">{report.summary.totalConversations}</p></CardContent></Card>
            <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Confirmadas en sistema</p><p className="text-3xl font-bold text-emerald-600 mt-1">{report.summary.confirmedInSystemCount}</p></CardContent></Card>
            <Card className="border-l-4 border-l-blue-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Probables</p><p className="text-3xl font-bold text-blue-600 mt-1">{report.summary.probableCount}</p></CardContent></Card>
            <Card className="border-l-4 border-l-amber-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Pendientes tuyas</p><p className="text-3xl font-bold text-amber-600 mt-1">{reviewSummary.pending}</p></CardContent></Card>
            <Card className="border-l-4 border-l-indigo-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Confirmadas por ti</p><p className="text-3xl font-bold text-indigo-600 mt-1">{reviewSummary.confirmed}</p></CardContent></Card>
            <Card className="border-l-4 border-l-rose-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Monto escrito en chat</p><p className="text-2xl font-bold text-rose-600 mt-1">{money(report.summary.totalChatAmount)}</p></CardContent></Card>
          </div>

          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-700"><History className="w-4 h-4" />Esto revisa solo el histórico del mes {month}.</div>
              <div className="flex flex-wrap gap-4 text-slate-600">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Confirmadas: {reviewSummary.confirmed}</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="w-4 h-4 text-amber-600" />Pendientes: {reviewSummary.pending}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {conversations.length ? conversations.map((item) => (
              <HistoricalAuditReviewCard
                key={item.review_key}
                item={item}
                reviewStatus={reviewMap.get(item.review_key)?.review_status || "pendiente"}
                onReview={handleReview}
                saving={savingKey === item.review_key}
              />
            )) : (
              <Card><CardContent className="p-10 text-center text-gray-500">No encontramos conversaciones para ese mes.</CardContent></Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}