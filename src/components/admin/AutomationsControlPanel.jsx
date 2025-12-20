import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle, AlertCircle, Clock, Users, MessageCircle, TrendingUp, Activity, Copy, ExternalLink, Zap } from "lucide-react";

const automationConfig = {
    notifyClientEnRuta: {
        name: "Notificar Cliente (En Ruta)",
        description: "Avisa al cliente automáticamente cuando el técnico marca 'En Ruta'",
        icon: MessageCircle,
        color: "bg-yellow-100 text-yellow-800",
        emoji: "🚗"
    },
    markDormantLeads: {
        name: "Marcar Leads Dormidos",
        description: "Leads sin respuesta en 24h → evaluacion_pendiente",
        icon: Clock,
        color: "bg-orange-100 text-orange-800",
        emoji: "😴"
    },
    sendScheduleReminders: {
        name: "Recordatorios de Agenda",
        description: "Notifica 24h antes al cliente y técnico, 1h antes al técnico",
        icon: Clock,
        color: "bg-blue-100 text-blue-800",
        emoji: "⏰"
    },
    sendAutoFeedback: {
        name: "Encuestas Automáticas",
        description: "Envía encuesta de satisfacción 1-2h después del servicio completado",
        icon: TrendingUp,
        color: "bg-green-100 text-green-800",
        emoji: "⭐"
    },
    reactivateDormantLeads: {
        name: "Reactivar Leads",
        description: "Mensaje de seguimiento a leads sin conversión después de 14-21 días",
        icon: Users,
        color: "bg-purple-100 text-purple-800",
        emoji: "🔄"
    },
    checkTechnicianAlerts: {
        name: "Alertas de Técnicos",
        description: "Detecta técnicos retrasados, sin confirmar salida, o sin actualizar progreso",
        icon: AlertCircle,
        color: "bg-red-100 text-red-800",
        emoji: "🚨"
    }
};

export default function AutomationsControlPanel() {
    const [isRunning, setIsRunning] = useState(false);
    const [lastRun, setLastRun] = useState(null);
    const [expandedResults, setExpandedResults] = useState({});
    const [copiedUrl, setCopiedUrl] = useState(false);

    const runAllAutomations = async () => {
        setIsRunning(true);
        try {
            const response = await base44.functions.invoke('runAllAutomations', {});
            setLastRun({
                timestamp: new Date(),
                data: response.data
            });
        } catch (error) {
            console.error('Error running automations:', error);
            alert('Error ejecutando automatizaciones: ' + error.message);
        } finally {
            setIsRunning(false);
        }
    };

    const toggleExpanded = (automationName) => {
        setExpandedResults(prev => ({
            ...prev,
            [automationName]: !prev[automationName]
        }));
    };

    const cronUrl = `${window.location.origin}/api/functions/runAllAutomations`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(cronUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Control Panel */}
            <Card className="border-2 border-proman-yellow">
                <CardHeader className="bg-proman-yellow/10">
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-6 h-6 text-proman-navy" />
                        Panel de Control de Automatizaciones
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-700 mb-1 font-medium">
                                Ejecutar todas las automatizaciones ahora:
                            </p>
                            <p className="text-xs text-gray-500">
                                Procesa notificaciones, recordatorios, alertas y reactivaciones
                            </p>
                        </div>
                        <Button
                            onClick={runAllAutomations}
                            disabled={isRunning}
                            className="bg-proman-navy text-white hover:opacity-90"
                            size="lg"
                        >
                            <RefreshCw className={`w-5 h-5 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                            {isRunning ? 'Ejecutando...' : 'Ejecutar Ahora'}
                        </Button>
                    </div>

                    {lastRun && (
                        <div className="mt-6 pt-6 border-t">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-proman-navy">Última Ejecución</h3>
                                <Badge className="bg-gray-100 text-gray-700">
                                    {lastRun.timestamp.toLocaleString('es-SV', { 
                                        day: 'numeric', 
                                        month: 'short', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {lastRun.data?.summary?.successful || 0}
                                    </div>
                                    <div className="text-xs text-gray-600">Exitosas</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                        {lastRun.data?.summary?.errors || 0}
                                    </div>
                                    <div className="text-xs text-gray-600">Errores</div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {lastRun.data?.summary?.total || 0}
                                    </div>
                                    <div className="text-xs text-gray-600">Total</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {lastRun.data?.results?.automations?.map((auto, idx) => {
                                    const config = automationConfig[auto.name];
                                    const isExpanded = expandedResults[auto.name];
                                    
                                    return (
                                        <div key={idx} className="bg-white rounded-lg border-2 overflow-hidden">
                                            <div 
                                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                                                onClick={() => toggleExpanded(auto.name)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {auto.status === 'success' ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                                    )}
                                                    <div>
                                                        <div className="font-medium text-sm flex items-center gap-2">
                                                            <span>{config?.emoji}</span>
                                                            {config?.name || auto.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{config?.description}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {auto.data && (
                                                        <Badge className="bg-blue-100 text-blue-800">
                                                            {auto.data.total_marked || 
                                                             auto.data.total_notified || 
                                                             auto.data.total_reminders || 
                                                             auto.data.total_feedback_sent || 
                                                             auto.data.total_reactivated || 
                                                             auto.data.total_alerts || 0} acciones
                                                        </Badge>
                                                    )}
                                                    <Badge className={auto.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                        {auto.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                            
                                            {isExpanded && auto.data?.results && (
                                                <div className="border-t bg-gray-50 p-4">
                                                    <pre className="text-xs bg-white rounded p-3 overflow-x-auto max-h-64 overflow-y-auto">
                                                        {JSON.stringify(auto.data.results, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Automation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(automationConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const lastResult = lastRun?.data?.results?.automations?.find(a => a.name === key);
                    
                    return (
                        <Card key={key} className="border-2 hover:border-proman-yellow transition-all">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                                        <span className="text-2xl">{config.emoji}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-proman-navy mb-1 text-sm">
                                            {config.name}
                                        </h3>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {config.description}
                                        </p>
                                    </div>
                                </div>
                                
                                {lastResult && (
                                    <div className="bg-gray-50 rounded p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-gray-600">Última ejecución:</span>
                                            <Badge className={lastResult.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                {lastResult.status}
                                            </Badge>
                                        </div>
                                        {lastResult.data && (
                                            <div className="text-xs text-gray-700">
                                                {lastResult.data.total_marked !== undefined && `${lastResult.data.total_marked} leads marcados`}
                                                {lastResult.data.total_notified !== undefined && `${lastResult.data.total_notified} notificados`}
                                                {lastResult.data.total_reminders !== undefined && `${lastResult.data.total_reminders} recordatorios`}
                                                {lastResult.data.total_feedback_sent !== undefined && `${lastResult.data.total_feedback_sent} encuestas`}
                                                {lastResult.data.total_reactivated !== undefined && `${lastResult.data.total_reactivated} reactivados`}
                                                {lastResult.data.total_alerts !== undefined && `${lastResult.data.total_alerts} alertas`}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Cron Setup Instructions */}
            <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        ⚙️ Configurar Ejecución Automática (Cron Job)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                            <strong>⚠️ Importante:</strong> Para que las automatizaciones funcionen 24/7 sin intervención manual, 
                            configura un servicio de cron externo que ejecute el endpoint cada 5-10 minutos.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-proman-navy mb-3">Paso 1: Copia la URL del endpoint</h4>
                        <div className="flex gap-2">
                            <Input
                                value={cronUrl}
                                readOnly
                                className="flex-1 text-xs bg-gray-50"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                            >
                                {copiedUrl ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-proman-navy mb-3">Paso 2: Configurar en servicio de Cron</h4>
                        <p className="text-sm text-gray-700 mb-3">
                            Usa servicios gratuitos como <strong>cron-job.org</strong> o <strong>EasyCron</strong>:
                        </p>
                        
                        <div className="space-y-3">
                            <div className="bg-white border rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-blue-600">1</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-proman-navy mb-1">Crea una cuenta en cron-job.org</p>
                                        <a 
                                            href="https://cron-job.org" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            Ir a cron-job.org
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-blue-600">2</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-proman-navy mb-1">Crea un nuevo Cron Job</p>
                                        <p className="text-xs text-gray-600">
                                            • Título: "PROMAN Automatizaciones"<br/>
                                            • URL: {cronUrl}<br/>
                                            • Método: POST<br/>
                                            • Frecuencia: Cada 5 minutos
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-blue-600">3</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-proman-navy mb-1">Activar y monitorear</p>
                                        <p className="text-xs text-gray-600">
                                            Activa el job y revisa los logs para confirmar que funciona correctamente
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                            <strong>✅ Frecuencia recomendada:</strong> Cada 5-10 minutos para respuestas en tiempo real. 
                            Menos frecuente (cada 30-60 min) también funciona pero reduce la velocidad de respuesta.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Automation Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(automationConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const lastResult = lastRun?.data?.results?.automations?.find(a => a.name === key);
                    
                    return (
                        <Card key={key} className="border-2 hover:border-proman-yellow transition-all">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                                        <span className="text-2xl">{config.emoji}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-proman-navy mb-1 text-sm">
                                            {config.name}
                                        </h3>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {config.description}
                                        </p>
                                    </div>
                                </div>
                                
                                {lastResult && (
                                    <div className="bg-gray-50 rounded p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-gray-600">Último resultado:</span>
                                            <Badge className={lastResult.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                {lastResult.status}
                                            </Badge>
                                        </div>
                                        {lastResult.data && (
                                            <div className="text-xs text-gray-700 font-medium">
                                                {lastResult.data.total_marked !== undefined && `${lastResult.data.total_marked} leads dormidos`}
                                                {lastResult.data.total_notified !== undefined && `${lastResult.data.total_notified} clientes notificados`}
                                                {lastResult.data.total_reminders !== undefined && `${lastResult.data.total_reminders} recordatorios enviados`}
                                                {lastResult.data.total_feedback_sent !== undefined && `${lastResult.data.total_feedback_sent} encuestas enviadas`}
                                                {lastResult.data.total_reactivated !== undefined && `${lastResult.data.total_reactivated} leads reactivados`}
                                                {lastResult.data.total_alerts !== undefined && (
                                                    <>
                                                        {lastResult.data.total_alerts} alertas
                                                        {lastResult.data.high_severity > 0 && (
                                                            <span className="text-red-600"> ({lastResult.data.high_severity} críticas)</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* What Gets Automated */}
            <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50">
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-purple-600" />
                        ✅ Qué se Automatiza
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                AUTOMÁTICO (Sin intervención)
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>✅ Notificación cuando técnico va en ruta</li>
                                <li>✅ Recordatorios 24h y 1h antes del servicio</li>
                                <li>✅ Encuestas 1-2h después de completar</li>
                                <li>✅ Marcar leads sin respuesta (24h)</li>
                                <li>✅ Reactivar leads dormidos (14-21 días)</li>
                                <li>✅ Alertas de técnicos retrasados</li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                HUMANO (Requiere decisión)
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>🧑 Cotizaciones personalizadas</li>
                                <li>🧑 Clientes molestos o complejos</li>
                                <li>🧑 Decisiones de precios especiales</li>
                                <li>🧑 Problemas técnicos únicos</li>
                                <li>🧑 Resolución de incidencias</li>
                                <li>🧑 Negociaciones de pago</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}