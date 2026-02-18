import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Award, Send, ExternalLink, Eye, AlertCircle } from "lucide-react";

// Sucursales y emails McDonald's
const MCDONALDS_SUCURSALES = [
  { nombre: "SANTA ANA", email: "santaana@mcd.com.sv" },
  { nombre: "LOS PROCERES", email: "proceres.sv@mcd.com.sv" },
  { nombre: "ZONA ROSA", email: "zonarosa@mcd.com.sv" },
  { nombre: "PLAZA MUNDO", email: "plazamundo@mcd.com.sv" },
  { nombre: "GALERIAS", email: "galerias@mcd.com.sv" },
  { nombre: "MULTIPLAZA", email: "multiplaza@mcd.com.sv" },
  { nombre: "SAN MIGUEL", email: "sanmiguel@mcd.com.sv" },
  { nombre: "SANTA ELENA", email: "santaelena@mcd.com.sv" },
  { nombre: "METROCENTRO", email: "metrocentro.sv@mcd.com.sv" },
  { nombre: "SALVADOR DEL MUNDO", email: "salvadordelmundo@mcd.com.sv" },
  { nombre: "PASEO ESCALON", email: "paseo.escalon@mcd.com.sv" },
  { nombre: "SANTA ANA FS", email: "santaanafs@mcd.com.sv" },
  { nombre: "SAN LUIS", email: "sanluis@mcd.com.sv" },
  { nombre: "BRITANICA", email: "britanica@mcd.com.sv" },
  { nombre: "SAN MIGUELITO", email: "sanmiguelito@mcd.com.sv" },
  { nombre: "SANTA ROSA", email: "santarosa@mcd.com.sv" },
  { nombre: "LOURDES", email: "lourdes@mcd.com.sv" },
  { nombre: "SONSONATE", email: "sonsonate@mcd.com.sv" },
  { nombre: "SAN MARCOS", email: "sanmarcos@mcd.com.sv" },
  { nombre: "AGUILARES", email: "aguilares@mcd.com.sv" },
];

const TIPOS_CERTIFICADO = [
  "Limpieza y Mantenimiento de Trampa de Grasa",
  "Limpieza y desinfección de cisterna de agua potable",
  "Limpieza y Mantenimiento de Trampa de Grasa y Mantenimiento General de drenajes",
  "Limpieza General de Instalaciones",
  "Limpieza y Desinfección de Cocina Industrial",
  "Limpieza de Campanas y Extractores",
  "Desinfección y Sanitización General",
];

// Sumar 3 meses a una fecha
const addMonths = (dateStr, months) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

export default function CleaningCertificateModal({ inquiry, open, onClose }) {
  const today = new Date().toISOString().split('T')[0];

  const [cadena, setCadena] = useState("mcdonalds");
  const [sucursal, setSucursal] = useState("");
  const [fechaEmision, setFechaEmision] = useState(today);
  const [fechaVencimiento, setFechaVencimiento] = useState(addMonths(today, 3));
  const [tipoCertificado, setTipoCertificado] = useState(TIPOS_CERTIFICADO[0]);
  const [useCustomTipo, setUseCustomTipo] = useState(false);
  const [customTipo, setCustomTipo] = useState("");
  const [emailDestinatario, setEmailDestinatario] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Auto-completar email al seleccionar sucursal de McDonald's
  useEffect(() => {
    if (cadena === "mcdonalds" && sucursal) {
      const found = MCDONALDS_SUCURSALES.find(s => s.nombre === sucursal);
      if (found) setEmailDestinatario(found.email);
    }
  }, [sucursal, cadena]);

  // Recalcular vencimiento cuando cambia emisión
  useEffect(() => {
    setFechaVencimiento(addMonths(fechaEmision, 3));
  }, [fechaEmision]);

  // Pre-detectar sucursal desde el nombre del trabajo si es McDonald's
  useEffect(() => {
    if (!inquiry) return;
    const rName = (inquiry.restaurant_name || "").toUpperCase();
    if (rName.includes("PANDA") || rName.includes("ORIENTAL WOK")) {
      setCadena("panda");
    } else if (rName.includes("MCDONALD") || rName.includes("SERVAMATIC")) {
      setCadena("mcdonalds");
    }
    // Try to detect sucursal from location_name
    if (inquiry.location_name) {
      const loc = inquiry.location_name.toUpperCase();
      const found = MCDONALDS_SUCURSALES.find(s => loc.includes(s.nombre));
      if (found) setSucursal(found.nombre);
    }
  }, [inquiry]);

  const buildPreviewHtml = () => {
    const finalTipo = useCustomTipo ? customTipo : tipoCertificado;
    const empresaNombre = cadena === 'mcdonalds' ? 'SERVAMATIC, S.A DE C.V.' : 'ORIENTAL WOK, S.A DE C.V.';
    const cadenaDisplay = cadena === 'mcdonalds' ? "RESTAURANTE McDONALD'S SUCURSAL" : 'RESTAURANTE PANDA SUCURSAL';
    const formatDate = (dateStr) => { const [y, m, d] = dateStr.split('-'); return `${d}-${m}-${y}`; };
    const TEMPLATE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/a323ac64b_3.png';

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>PREVIEW - Certificado</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 297mm; height: 210mm; overflow: hidden; background: white; }
  .wrapper { position: relative; width: 297mm; height: 210mm; }
  .bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; }
  .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding-left: 16%; padding-right: 3%; justify-content: center; text-align: center; }
  .spacer-top { height: 52%; flex-shrink: 0; }
  .cert-text { font-size: 10.5pt; color: #1a2050; line-height: 1.65; font-family: Arial, Helvetica, sans-serif; max-width: 195mm; }
  .cert-names { font-size: 12pt; font-weight: bold; color: #1a2050; line-height: 1.55; margin-top: 4mm; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.3px; }
  .spacer-bottom { flex: 1; }
  .dates-row { width: 100%; display: flex; justify-content: flex-start; padding-left: 5mm; padding-bottom: 9mm; }
  .dates-box { text-align: left; font-size: 7.5pt; font-weight: bold; color: #1a2050; font-family: Arial, Helvetica, sans-serif; line-height: 1.8; }
  .preview-badge { position: absolute; top: 4mm; right: 4mm; background: rgba(255,165,0,0.85); color: white; font-size: 8pt; font-weight: bold; padding: 2mm 4mm; border-radius: 3mm; font-family: Arial; }
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .preview-badge { display: none; } }
</style></head><body>
<div class="wrapper">
  <img src="${TEMPLATE_URL}" class="bg" alt="" />
  <div class="preview-badge">⚠️ VISTA PREVIA — No enviado</div>
  <div class="overlay">
    <div class="spacer-top"></div>
    <div class="cert-text">Tras completar los servicios de saneamiento ambiental<br>correspondiente a ${finalTipo} de</div>
    <div class="cert-names">${empresaNombre}<br>${cadenaDisplay}<br>${(sucursal || 'SUCURSAL').toUpperCase()}</div>
    <div class="spacer-bottom"></div>
    <div class="dates-row">
      <div class="dates-box">FECHA DE EMISIÓN: ${formatDate(fechaEmision)}<br>FECHA DE VENCIMIENTO: ${formatDate(fechaVencimiento)}</div>
    </div>
  </div>
</div>
</body></html>`;
  };

  const handlePreview = () => {
    const html = buildPreviewHtml();
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  const handleGenerate = async () => {
    const finalTipo = useCustomTipo ? customTipo : tipoCertificado;
    if (!sucursal || !emailDestinatario || !finalTipo) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke("generateCleaningCertificate", {
        inquiryId: inquiry.id,
        fechaEmision,
        fechaVencimiento,
        tipoCertificado: finalTipo,
        emailDestinatario,
        cadena,
        sucursal,
      });

      const data = response?.data || response;
      if (data?.success) {
        setResult(data);
      } else {
        setError(data?.error || "Error al generar el certificado");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Generar Acreditación de Limpieza
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 pt-2">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="font-semibold text-green-800">Certificado generado y enviado</p>
              <p className="text-sm text-green-700 mt-1">Enviado a: <strong>{emailDestinatario}</strong></p>
              <p className="text-xs text-green-600 mt-1">No. {result.cert_number}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const win = window.open("", "_blank");
                  win.document.write(result.html);
                  win.document.close();
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Certificado
              </Button>
              <Button className="flex-1 bg-proman-yellow text-proman-navy" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">

            {/* Cadena */}
            <div>
              <Label className="text-sm font-medium">Cadena de Restaurante *</Label>
              <Select value={cadena} onValueChange={(v) => { setCadena(v); setSucursal(""); setEmailDestinatario(""); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcdonalds">McDonald's</SelectItem>
                  <SelectItem value="panda">Panda Express</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sucursal */}
            <div>
              <Label className="text-sm font-medium">Sucursal *</Label>
              {cadena === "mcdonalds" ? (
                <Select value={sucursal} onValueChange={setSucursal}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar sucursal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MCDONALDS_SUCURSALES.map(s => (
                      <SelectItem key={s.nombre} value={s.nombre}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value)}
                  placeholder="Ej: SANTA ELENA, MULTIPLAZA..."
                  className="mt-1"
                />
              )}
            </div>

            {/* Tipo de Certificado */}
            <div>
              <Label className="text-sm font-medium">Tipo de Servicio *</Label>
              <Select
                value={useCustomTipo ? "_custom" : tipoCertificado}
                onValueChange={(v) => {
                  if (v === "_custom") { setUseCustomTipo(true); }
                  else { setUseCustomTipo(false); setTipoCertificado(v); }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CERTIFICADO.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  <SelectItem value="_custom">✏️ Escribir personalizado...</SelectItem>
                </SelectContent>
              </Select>
              {useCustomTipo && (
                <Textarea
                  value={customTipo}
                  onChange={(e) => setCustomTipo(e.target.value)}
                  placeholder="Ej: Limpieza y mantenimiento de sistemas de drenaje"
                  rows={2}
                  className="mt-2"
                />
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Fecha de Emisión *</Label>
                <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Fecha de Vencimiento *</Label>
                <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="mt-1" />
                <p className="text-xs text-gray-400 mt-0.5">Auto: 3 meses desde emisión</p>
              </div>
            </div>

            {/* Email */}
            <div>
              <Label className="text-sm font-medium">Email del Destinatario *</Label>
              <Input
                type="email"
                value={emailDestinatario}
                onChange={(e) => setEmailDestinatario(e.target.value)}
                placeholder="contacto@restaurante.com"
                className="mt-1"
              />
              {cadena === "mcdonalds" && sucursal && (
                <p className="text-xs text-green-600 mt-1">✓ Email auto-completado desde directorio McDonald's</p>
              )}
            </div>

            {/* Preview info */}
            {sucursal && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                <p className="font-semibold">Vista previa del certificado:</p>
                <p>• Empresa: <strong>{cadena === "mcdonalds" ? "SERVAMATIC, S.A DE C.V." : "ORIENTAL WOK, S.A DE C.V."}</strong></p>
                <p>• Restaurante: <strong>{cadena === "mcdonalds" ? "RESTAURANTE McDONALD'S" : "RESTAURANTE PANDA"} SUCURSAL {sucursal.toUpperCase()}</strong></p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!sucursal}
                className="border-orange-400 text-orange-600 hover:bg-orange-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !sucursal || !emailDestinatario}
                className="bg-proman-navy text-white hover:opacity-90"
              >
                <Send className="w-4 h-4 mr-2" />
                {isGenerating ? "Generando y enviando..." : "Generar y Enviar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}