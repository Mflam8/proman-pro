import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertCircle, Clock, Users, MessageCircle, TrendingUp, Activity, Bot } from "lucide-react";

const automationConfig = {
    notifyClientEnRuta: {
        name: "Notificar Cliente (En Ruta)",
        description: "Avisa al cliente cuando técnico va en camino",
        icon: MessageCircle,
        color: "bg-yellow-100 text-yellow-800"
    },
    markDormantLeads: {
        name: "Marcar Leads Dormidos",
        description: "Leads sin respuesta en 24h → evaluacion_pendiente",
        icon: Clock,
        color: "bg-orange-100 text-orange-800"
    },
    sendScheduleReminders: {
        name: "Recordatorios de Agenda",
        description: "Notifica 24h y 1h antes del servicio",
        icon: Clock,
        color: "bg-blue-100 text-blue-800"
    },
    sendAutoFeedback: {
        name: "Encuestas Automáticas",
        description: "Envía encuesta 1-2h después del servicio",
        icon: TrendingUp,
        color: "bg-green-100 text-green-800"
    },
    reactivateDormantLeads: {
        name: "Reactivar Leads",
        description: "Mensaje a leads sin conversión (14-21 días)",
        icon: Users,
        color: "bg-purple-100 text-purple-800"
    },
    checkTechnicianAlerts: {
        name: "Alertas de Técnicos",
        description: "Detecta retrasos, sin confirmar, sin actualizar",
        icon: AlertCircle,
        color: "bg-red-100 text-red-800"
    }
};

export default function AutomationsControl() {
    const [isRunning, setIsRunning] = useState(false);
    const [lastRun, setLastRun] = useState(null);
    const [user, setUser] = useState(null);

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
                if (currentUser.role !== 'admin') {
                    base44.auth.redirectToLogin();
                }
            } catch (error) {
                base44.auth.redirectToLogin();
            }
        };
        checkAuth();
    }, []);

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

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proman-navy"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-proman-navy mb-2">
                        🤖 Centro de Automatizaciones
                    </h1>
                    <p className="text-gray-600">
                        Control manual de flujos automáticos del sistema
                    </p>
                </div>

                {/* WhatsApp Agent Connection */}
                <Card className="mb-8 border-2 border-green-500">
                    <CardHeader className="bg-green-50">
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-green-600" />
                            Conectar Asistente WhatsApp
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-600 mb-4">
                            Conecta el asistente administrativo al WhatsApp de la empresa para crear clientes, trabajos y cotizaciones desde WhatsApp.
                        </p>
                        <a 
                            href={base44.agents.getWhatsAppConnectURL('adminAssistant')} 
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button className="bg-green-600 hover:bg-green-700 text-white">
                                <MessageCircle className="w-5 h-5 mr-2" />
                                💬 Conectar WhatsApp
                            </Button>
                        </a>
                    </CardContent>
                </Card>

                {/* Control Panel */}
                <Card className="mb-8 border-2 border-proman-yellow">
                    <CardHeader className="bg-proman-yellow/10">
                        <CardTitle>Panel de Control</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Ejecuta todas las automatizaciones manualmente:
                                </p>
                                <p className="text-xs text-gray-500">
                                    Ideal para pruebas o ejecución manual periódica
                                </p>
                            </div>
                            <Button
                                onClick={runAllAutomations}
                                disabled={isRunning}
                                className="bg-proman-navy text-white hover:opacity-90"
                                size="lg"
                            >
                                <RefreshCw className={`w-5 h-5 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                                {isRunning ? 'Ejecutando...' : 'Ejecutar Todas'}
                            </Button>
                        </div>

                        {lastRun && (
                            <div className="mt-6 pt-6 border-t">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-proman-navy">Última Ejecución</h3>
                                    <Badge className="bg-gray-100 text-gray-700">
                                        {lastRun.timestamp.toLocaleTimeString('es-SV')}
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
                                    {lastRun.data?.results?.automations?.map((auto, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                                            <div className="flex items-center gap-3">
                                                {auto.status === 'success' ? (
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                                )}
                                                <span className="font-medium text-sm">
                                                    {automationConfig[auto.name]?.name || auto.name}
                                                </span>
                                            </div>
                                            <Badge className={auto.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                {auto.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Automation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(automationConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                            <Card key={key} className="border-2 hover:border-proman-yellow transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-proman-navy mb-1">
                                                {config.name}
                                            </h3>
                                            <p className="text-xs text-gray-600">
                                                {config.description}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {lastRun?.data?.results?.automations?.find(a => a.name === key) && (
                                        <div className="bg-gray-50 rounded p-3 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Última ejecución:</span>
                                                <Badge className="bg-green-100 text-green-800">
                                                    {lastRun.data.results.automations.find(a => a.name === key).status}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Instructions */}
                <Card className="mt-8 border-2 border-blue-200">
                    <CardHeader className="bg-blue-50">
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            Configuración de Cron Job (Recomendado)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 mb-2">
                                <strong>⚠️ Importante:</strong> Para automatización real, configura un cron job externo.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-proman-navy mb-2">Paso 1: Ve a Dashboard</h4>
                            <p className="text-sm text-gray-700 mb-1">
                                Dashboard → Code → Functions → <code className="bg-gray-100 px-2 py-1 rounded">runAllAutomations</code>
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-proman-navy mb-2">Paso 2: Copia la URL del endpoint</h4>
                            <p className="text-sm text-gray-700">
                                Ejemplo: <code className="bg-gray-100 px-2 py-1 rounded text-xs">https://tu-app.base44.app/api/functions/runAllAutomations</code>
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-proman-navy mb-2">Paso 3: Configurar cron externo</h4>
                            <p className="text-sm text-gray-700 mb-2">
                                Usa servicios como <strong>cron-job.org</strong> o <strong>EasyCron</strong> para ejecutar cada 5-10 minutos:
                            </p>
                            <div className="bg-gray-100 rounded p-3 text-xs font-mono">
                                */5 * * * * curl -X POST [URL_ENDPOINT]
                            </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-800">
                                <strong>✅ Frecuencia recomendada:</strong> Cada 5-10 minutos para respuestas rápidas
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}