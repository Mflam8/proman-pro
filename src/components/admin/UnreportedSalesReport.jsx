import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Download, DollarSign, FileSearch, MessageSquareWarning } from "lucide-react";

const money = (value) => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(value || 0));
const fmtDate = (value) => value ? new Date(value).toLocaleString("es-SV") : "-";

export default function UnreportedSalesReport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("findUnreportedSales", {
        startDate: startDate || null,
        endDate: endDate || null
      });
      setReport(response.data);
    } finally {
      setLoading(false);
    }
  };

  const exportRows = useMemo(() => {
    if (!report?.success) return [];
    const candidateRows = (report.candidates || []).map((item) => ({
      tipo: "trabajo",
      cliente: item.customer_name,
      telefono: item.phone,
      servicio: item.service_type,
      motivo: item.reason,
      monto_detectado: item.suspected_amount,
      monto_registrado: item.recorded_amount,
      estado_pago: item.payment_status,
      evidencia: item.evidence_count,
      fecha: item.latest_evidence_at,
      mensaje: item.sample_message
    }));
    const orphanRows = (report.orphans || []).map((item) => ({
      tipo: "chat_sin_trabajo",
      cliente: item.customer_name,
      telefono: item.phone,
      servicio: "-",
      motivo: "Señal de pago sin trabajo vinculado",
      monto_detectado: item.suspected_amount,
      monto_registrado: 0,
      estado_pago: "sin_vincular",
      evidencia: item.evidence_count,
      fecha: item.latest_evidence_at,
      mensaje: item.sample_message
    }));
    return [...candidateRows, ...orphanRows];
  }, [report]);

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
    link.download = `conciliacion_cobros_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-amber-900">
              <p className="font-semibold">Reporte de conciliación de cobros no reportados</p>
              <p>Este reporte revisa los chats buscando señales de pago, abonos, transferencias, depósitos, comprobantes y montos escritos que no quedaron reflejados en pagos o en el estado del trabajo.</p>
              <p>No reemplaza el registro contable: sirve para detectar casos a revisar y regularizar.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span className="flex items-center gap-2 text-proman-navy"><FileSearch className="w-5 h-5 text-proman-yellow" />Conciliación desde chats</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleExport} disabled={!exportRows.length}> 
                <Download className="w-4 h-4 mr-2" />Exportar CSV
              </Button>
              <Button onClick={handleRun} disabled={loading} className="bg-proman-navy text-white">
                {loading ? "Analizando..." : "Analizar chats"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-proman-navy mb-2">Desde</p>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <p className="text-sm font-medium text-proman-navy mb-2">Hasta</p>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {report?.criteria && <p className="text-sm text-gray-600">{report.criteria}</p>}
        </CardContent>
      </Card>

      {report?.success && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-red-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Casos a revisar</p><p className="text-3xl font-bold text-proman-navy mt-1">{report.summary.totalCandidates}</p></CardContent></Card>
            <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Monto detectado</p><p className="text-3xl font-bold text-emerald-600 mt-1">{money(report.summary.totalSuspectedAmount)}</p></CardContent></Card>
            <Card className="border-l-4 border-l-amber-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Sin pago registrado</p><p className="text-3xl font-bold text-amber-600 mt-1">{report.summary.noPaymentRecordCount}</p></CardContent></Card>
            <Card className="border-l-4 border-l-blue-500"><CardContent className="p-5"><p className="text-sm text-gray-600">Chats sin trabajo</p><p className="text-3xl font-bold text-blue-600 mt-1">{report.summary.orphanConversationCount}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-proman-navy"><DollarSign className="w-5 h-5 text-proman-yellow" />Trabajos con cobro probable no regularizado</CardTitle>
            </CardHeader>
            <CardContent>
              {report.candidates?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left">
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Servicio</th>
                        <th className="p-3">Motivo</th>
                        <th className="p-3 text-right">Detectado</th>
                        <th className="p-3 text-right">Registrado</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Última evidencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.candidates.map((item) => (
                        <tr key={item.inquiry_id} className="border-b align-top">
                          <td className="p-3 min-w-[220px]">
                            <p className="font-semibold text-proman-navy">{item.customer_name}</p>
                            <p className="text-gray-500">{item.phone || "Sin teléfono"}</p>
                            <p className="text-xs text-gray-500 mt-2">{item.sample_message}</p>
                          </td>
                          <td className="p-3 min-w-[160px]">{item.service_type}</td>
                          <td className="p-3 min-w-[220px]">{item.reason}<div className="text-xs text-gray-500 mt-1">{item.evidence_count} señal(es)</div></td>
                          <td className="p-3 text-right font-semibold text-emerald-600">{money(item.suspected_amount)}</td>
                          <td className="p-3 text-right">{money(item.recorded_amount)}</td>
                          <td className="p-3"><Badge className={item.payment_status === "pagado" ? "bg-green-100 text-green-800" : item.payment_status === "parcial" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}>{item.payment_status}</Badge></td>
                          <td className="p-3 min-w-[170px]">{fmtDate(item.latest_evidence_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-gray-500">No encontramos trabajos sospechosos en el rango analizado.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-proman-navy"><MessageSquareWarning className="w-5 h-5 text-proman-yellow" />Conversaciones con señal de pago sin trabajo vinculado</CardTitle>
            </CardHeader>
            <CardContent>
              {report.orphans?.length ? (
                <div className="space-y-3">
                  {report.orphans.map((item, index) => (
                    <div key={`${item.phone}-${index}`} className="rounded-xl border bg-slate-50 p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-proman-navy">{item.customer_name}</p>
                        <p className="text-sm text-gray-500">{item.phone || "Sin teléfono"}</p>
                        <p className="text-sm text-gray-700 mt-2">{item.sample_message}</p>
                      </div>
                      <div className="md:text-right">
                        <p className="text-lg font-bold text-emerald-600">{money(item.suspected_amount)}</p>
                        <p className="text-sm text-gray-500">{item.evidence_count} señal(es)</p>
                        <p className="text-xs text-gray-500 mt-1">{fmtDate(item.latest_evidence_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500">No encontramos chats sueltos con señal clara de pago en el rango analizado.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}