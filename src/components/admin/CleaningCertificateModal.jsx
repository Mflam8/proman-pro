import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Send, ExternalLink } from "lucide-react";

const TIPOS_CERTIFICADO = [
  "Limpieza General de Instalaciones",
  "Limpieza y Desinfección de Cocina Industrial",
  "Limpieza de Trampas de Grasa",
  "Limpieza de Campanas y Extractores",
  "Limpieza Profunda de Pisos y Paredes",
  "Limpieza de Áreas de Almacenamiento",
  "Desinfección y Sanitización General",
];

const EMAIL_RESTAURANTES = {
  "McDonald's": "",
  "Panda Express": "",
};

export default function CleaningCertificateModal({ inquiry, customer, open, onClose }) {
  const restaurantName = inquiry?.restaurant_name || customer?.full_name || "";
  
  // Pre-seleccionar email si es McDonald's o Panda
  const getDefaultEmail = () => {
    if (!restaurantName) return "";
    if (restaurantName.toLowerCase().includes("mcdonald")) return EMAIL_RESTAURANTES["McDonald's"];
    if (restaurantName.toLowerCase().includes("panda")) return EMAIL_RESTAURANTES["Panda Express"];
    return "";
  };

  const [fechaInicio, setFechaInicio] = useState(inquiry?.scheduled_date || "");
  const [fechaFin, setFechaFin] = useState("");
  const [tipoCertificado, setTipoCertificado] = useState(TIPOS_CERTIFICADO[0]);
  const [customTipo, setCustomTipo] = useState("");
  const [useCustomTipo, setUseCustomTipo] = useState(false);
  const [emailDestinatario, setEmailDestinatario] = useState(getDefaultEmail());
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!fechaInicio || !fechaFin || !emailDestinatario) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const finalTipo = useCustomTipo ? customTipo : tipoCertificado;
      const response = await base44.functions.invoke("generateCleaningCertificate", {
        inquiryId: inquiry.id,
        fechaInicio,
        fechaFin,
        tipoCertificado: finalTipo,
        emailDestinatario,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-proman-yellow" />
            Generar Certificado de Limpieza
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 pt-2">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center">
              <div className="text-green-600 text-3xl mb-2">✅</div>
              <p className="font-semibold text-green-800">Certificado generado y enviado</p>
              <p className="text-sm text-green-700 mt-1">
                Enviado a: <strong>{emailDestinatario}</strong>
              </p>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 font-medium">
                Restaurante: <strong>{restaurantName || "Sin especificar"}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Fecha de Inicio *</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Fecha de Finalización *</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Tipo de Certificado *</Label>
              <Select
                value={useCustomTipo ? "_custom" : tipoCertificado}
                onValueChange={(v) => {
                  if (v === "_custom") {
                    setUseCustomTipo(true);
                  } else {
                    setUseCustomTipo(false);
                    setTipoCertificado(v);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CERTIFICADO.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  <SelectItem value="_custom">✏️ Personalizado...</SelectItem>
                </SelectContent>
              </Select>
              {useCustomTipo && (
                <Input
                  value={customTipo}
                  onChange={(e) => setCustomTipo(e.target.value)}
                  placeholder="Ej: Limpieza de cisternas y tuberías"
                  className="mt-2"
                />
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Email del Restaurante *</Label>
              <Input
                type="email"
                value={emailDestinatario}
                onChange={(e) => setEmailDestinatario(e.target.value)}
                placeholder="contacto@restaurante.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se enviará el certificado a este correo automáticamente.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !fechaInicio || !fechaFin || !emailDestinatario}
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