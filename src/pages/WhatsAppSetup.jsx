import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Phone, ExternalLink, Copy, Check } from "lucide-react";

export default function WhatsAppSetup() {
  const [copiedEmployee, setCopiedEmployee] = useState(false);
  const [copiedClient, setCopiedClient] = useState(false);

  const employeeWhatsAppUrl = base44.agents.getWhatsAppConnectURL('data_entry_assistant');
  const clientWhatsAppUrl = base44.agents.getWhatsAppConnectURL('base44_whatsapp_agent');

  const copyToClipboard = (text, setStateFn) => {
    navigator.clipboard.writeText(text);
    setStateFn(true);
    setTimeout(() => setStateFn(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-proman-navy mb-2">
            Configuración de WhatsApp
          </h1>
          <p className="text-gray-600">
            Conecta tus agentes de IA a WhatsApp para automatizar la atención
          </p>
        </div>

        <div className="grid gap-6">
          {/* Agente para Empleados */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-3 text-proman-navy">
                <Users className="w-6 h-6 text-blue-600" />
                Para Empleados y Jefe
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  🔧 data_entry_assistant
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Este bot permite a técnicos y supervisores:
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Hacer check-in al llegar a trabajos</li>
                  <li>Actualizar progreso de trabajos</li>
                  <li>Cerrar trabajos completados</li>
                  <li>Registrar pagos recibidos</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enlace de Conexión:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={employeeWhatsAppUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(employeeWhatsAppUrl, setCopiedEmployee)}
                  >
                    {copiedEmployee ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={employeeWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </a>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>📱 Instrucciones:</strong> Cada empleado debe abrir este enlace en su celular,
                  iniciar sesión con su cuenta de PROMAN, y luego escanear el código QR con WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Agente para Clientes */}
          <Card className="border-2 border-proman-yellow">
            <CardHeader className="bg-proman-yellow/10">
              <CardTitle className="flex items-center gap-3 text-proman-navy">
                <Phone className="w-6 h-6 text-proman-yellow" />
                Para Clientes (Número de PROMAN)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">
                  🤖 base44_whatsapp_agent
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Este bot atiende a clientes que vienen de anuncios:
                </p>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Captura nombre, teléfono y servicio de interés</li>
                  <li>Recolecta ubicación y descripción del problema</li>
                  <li>Crea el registro de cliente automáticamente</li>
                  <li>Prepara información para atención humana</li>
                  <li>NO da precios ni cierra ventas</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enlace de Conexión:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientWhatsAppUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(clientWhatsAppUrl, setCopiedClient)}
                  >
                    {copiedClient ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={clientWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full bg-proman-yellow text-proman-navy hover:opacity-90">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </a>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Importante:</strong> Este enlace debe usarse desde el celular/número oficial
                  de PROMAN Services (6053-1213). Requiere que un administrador inicie sesión.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Instrucciones Generales */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-proman-navy">
                📋 Instrucciones Generales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-proman-navy mb-2">Paso 1: Abrir el enlace</h4>
                <p className="text-sm text-gray-700">
                  Haz clic en "Conectar WhatsApp" o copia el enlace y ábrelo en el navegador del celular.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-proman-navy mb-2">Paso 2: Iniciar sesión</h4>
                <p className="text-sm text-gray-700">
                  Si no has iniciado sesión, el sistema te pedirá que lo hagas con tu cuenta de PROMAN.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-proman-navy mb-2">Paso 3: Escanear QR</h4>
                <p className="text-sm text-gray-700">
                  Aparecerá un código QR. Abre WhatsApp → Configuración → Dispositivos Vinculados → 
                  Vincular dispositivo, y escanea el código.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-proman-navy mb-2">Paso 4: Confirmar</h4>
                <p className="text-sm text-gray-700">
                  Una vez conectado, el agente estará activo y responderá automáticamente a los mensajes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}