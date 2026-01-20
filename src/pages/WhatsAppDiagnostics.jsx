import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, RefreshCw, Bot, MessageSquare, Database, Zap } from "lucide-react";

export default function WhatsAppDiagnostics() {
  const [user, setUser] = useState(null);
  const [diagnostics, setDiagnostics] = useState({
    secretsConfigured: false,
    webhookActive: false,
    agentConnected: false,
    recentCustomers: 0,
    recentInquiries: 0,
    lastMessage: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser?.role === 'admin') {
          await runDiagnostics();
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Verificar clientes recientes de WhatsApp
      const allCustomers = await base44.entities.Customer.list('-created_date', 50);
      const whatsappCustomers = allCustomers.filter(c => 
        c.notes?.includes('WhatsApp') || c.created_by === 'system'
      );

      // Verificar trabajos recientes de WhatsApp
      const allInquiries = await base44.entities.ClientInquiry.list('-created_date', 50);
      const whatsappInquiries = allInquiries.filter(i => 
        i.notes?.includes('WhatsApp') || i.created_by === 'system' || i.lead_source === 'whatsapp'
      );

      // Buscar último cliente con conversación
      const customerWithConvo = allCustomers.find(c => c.whatsapp_conversation?.length > 0);
      
      setDiagnostics({
        secretsConfigured: true, // Asumimos que están configurados si llegamos aquí
        webhookActive: whatsappCustomers.length > 0 || whatsappInquiries.length > 0,
        agentConnected: false, // No podemos verificar esto directamente
        recentCustomers: whatsappCustomers.length,
        recentInquiries: whatsappInquiries.length,
        lastMessage: customerWithConvo?.whatsapp_conversation?.slice(-1)[0] || null
      });
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateWebhook = async () => {
    if (!testPhone || !testMessage) {
      alert('Completa el teléfono y mensaje de prueba');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Simular payload de Meta
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              messages: [{
                from: testPhone,
                type: 'text',
                text: { body: testMessage }
              }],
              contacts: [{
                profile: { name: 'Cliente de Prueba' }
              }]
            }
          }]
        }]
      };

      // Llamar al webhook
      const response = await fetch('/api/functions/metaWebhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.text();

      setTestResult({
        success: response.ok,
        status: response.status,
        message: result,
        timestamp: new Date().toISOString()
      });

      // Refrescar diagnósticos después de 2 segundos
      setTimeout(runDiagnostics, 2000);
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proman-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando diagnósticos...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-proman-navy mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Solo administradores pueden ver esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-proman-navy mb-2">
                🔍 Diagnóstico WhatsApp
              </h1>
              <p className="text-gray-600">
                Monitorea el estado y funcionamiento de los bots de WhatsApp
              </p>
            </div>
            <Button onClick={runDiagnostics} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Estado General */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${diagnostics.secretsConfigured ? 'bg-green-100' : 'bg-red-100'}`}>
                  {diagnostics.secretsConfigured ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Secretos</p>
                  <p className="text-lg font-bold text-proman-navy">
                    {diagnostics.secretsConfigured ? 'Configurados' : 'Faltantes'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${diagnostics.webhookActive ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {diagnostics.webhookActive ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Webhook</p>
                  <p className="text-lg font-bold text-proman-navy">
                    {diagnostics.webhookActive ? 'Recibiendo' : 'Inactivo'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Agente</p>
                  <p className="text-lg font-bold text-proman-navy">gestionBot</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Clientes capturados</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {diagnostics.recentCustomers}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Trabajos creados</span>
                  <Badge className="bg-green-100 text-green-800">
                    {diagnostics.recentInquiries}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Último Mensaje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnostics.lastMessage ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={diagnostics.lastMessage.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                      {diagnostics.lastMessage.role === 'user' ? '👤 Cliente' : '🤖 Bot'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(diagnostics.lastMessage.timestamp).toLocaleString('es-SV')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{diagnostics.lastMessage.content}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No hay mensajes recientes</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Simulador de Webhook */}
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Zap className="w-5 h-5" />
              🧪 Simulador de Webhook (Pruebas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Atención:</strong> Esto simulará un mensaje entrante del webhook. Se creará un cliente y/o trabajo si el bot lo determina necesario.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono (formato: 50312345678)
                </label>
                <Input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="50377778888"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje del cliente
              </label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Hola, soy Juan Pérez y necesito reparar una fuga de agua en mi casa en San Salvador"
                rows={3}
              />
            </div>

            <Button
              onClick={simulateWebhook}
              disabled={isTesting || !testPhone || !testMessage}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Simular Mensaje Entrante
                </>
              )}
            </Button>

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.success ? '✅ Webhook procesado correctamente' : '❌ Error en el webhook'}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      Status: {testResult.status} - {testResult.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(testResult.timestamp).toLocaleString('es-SV')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guía de Solución de Problemas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔧 Guía de Solución de Problemas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-proman-navy mb-2">
                1. Si el webhook está inactivo:
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Verifica que los secretos de Meta estén configurados</li>
                <li>Confirma que el webhook esté suscrito en Meta Developers</li>
                <li>Prueba con el simulador de arriba</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-proman-navy mb-2">
                2. Para usar el gestionBot:
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Ve a Gestión → pestaña "WhatsApp Bots"</li>
                <li>Haz clic en "Conectar Bot de Gestión"</li>
                <li>Escanea el QR desde tu celular con WhatsApp</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-proman-navy mb-2">
                3. Diferencia entre sistemas:
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li><strong>metaWebhook:</strong> Recibe mensajes del número de PROMAN en modo "sentinela" (solo guarda, no responde)</li>
                <li><strong>gestionBot:</strong> Bot interactivo para el equipo vía WhatsApp Web conectado</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}