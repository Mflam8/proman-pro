import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, UserPlus, MapPin, DollarSign, TrendingUp, Package, 
  FileText, Clock, CheckCircle, AlertCircle, BarChart3, PieChart
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, subMonths, subWeeks, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from "recharts";

const COLORS = ['#252a5c', '#fdc80c', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const departamentos = [
  "Ahuachapán", "Santa Ana", "Sonsonate", "La Libertad", "San Salvador",
  "Chalatenango", "Cuscatlán", "La Paz", "Cabañas", "San Vicente",
  "Usulután", "San Miguel", "Morazán", "La Unión"
];

export default function ReportsManagement() {
  const [dateFilter, setDateFilter] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch all data
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: [],
  });

  const { data: inquiries } = useQuery({
    queryKey: ['clientInquiries'],
    queryFn: () => base44.entities.ClientInquiry.list(),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['allPayments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: gastos } = useQuery({
    queryKey: ['allGastos'],
    queryFn: () => base44.entities.GastoTrabajo.list(),
    initialData: [],
  });

  const { data: billingItems } = useQuery({
    queryKey: ['allBillingItems'],
    queryFn: () => base44.entities.DetalleFacturaTrabajo.list(),
    initialData: [],
  });

  // Date range calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === "week") {
      return { start: startOfWeek(now, { locale: es }), end: endOfWeek(now, { locale: es }) };
    } else if (dateFilter === "last_week") {
      const lastWeek = subWeeks(now, 1);
      return { start: startOfWeek(lastWeek, { locale: es }), end: endOfWeek(lastWeek, { locale: es }) };
    } else if (dateFilter === "month") {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return { start: startOfMonth(date), end: endOfMonth(date) };
    } else if (dateFilter === "year") {
      return { start: startOfYear(now), end: endOfYear(now) };
    }
    return { start: subMonths(now, 12), end: now };
  }, [dateFilter, selectedMonth]);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const filterLabels = {
        week: "Esta Semana",
        last_week: "Semana Pasada",
        month: `Mes ${selectedMonth}`,
        year: "Este Año",
        all: "Histórico Completo"
      };

      const response = await base44.functions.invoke('generateManagementReport', {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        filterLabel: filterLabels[dateFilter] || "Personalizado"
      });

      if (response.data.success && response.data.html) {
        // Open HTML Report
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(response.data.html);
            reportWindow.document.close();
        } else {
            alert("Por favor permite las ventanas emergentes para ver el reporte");
        }
      } else {
        console.error("Backend Error:", response.data);
        alert("Error al generar reporte: " + (response.data.error || "Error desconocido"));
      }
    } catch (error) {
      console.error("Request Error:", error);
      alert("Error de conexión al generar el reporte: " + (error.message || "Error desconocido"));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Filter data by date range
  const filteredInquiries = useMemo(() => {
    return inquiries.filter(i => {
      const date = new Date(i.created_date);
      return isWithinInterval(date, dateRange);
    });
  }, [inquiries, dateRange]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const date = new Date(c.created_date);
      return isWithinInterval(date, dateRange);
    });
  }, [customers, dateRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const date = new Date(p.payment_date);
      return isWithinInterval(date, dateRange);
    });
  }, [payments, dateRange]);

  const filteredGastos = useMemo(() => {
    return gastos.filter(g => {
      const date = new Date(g.fecha_gasto || g.created_date);
      return isWithinInterval(date, dateRange);
    });
  }, [gastos, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    // Prospectos (clientes nuevos o contactados)
    const prospectos = filteredCustomers.filter(c => c.status === 'nuevo' || c.status === 'contactado');
    
    // Clientes activos (con al menos un trabajo)
    const clientesActivos = filteredCustomers.filter(c => c.status === 'activo');
    
    // Trabajos por estado
    const trabajosCompletados = filteredInquiries.filter(i => i.status === 'completado');
    const trabajosEnProceso = filteredInquiries.filter(i => i.status === 'en_proceso');
    const trabajosPendientes = filteredInquiries.filter(i => 
      i.status !== 'completado' && i.status !== 'en_proceso'
    );
    const serviciosNuevos = filteredInquiries.filter(i => i.status === 'nuevo');
    const pendientesCotizacion = filteredInquiries.filter(i => i.status === 'cotizacion_pendiente');

    // Cuentas por cobrar (completados con pago pendiente)
    const cuentasPorCobrar = inquiries.filter(i => 
      i.status === 'completado' && i.payment_status !== 'pagado'
    );
    const montoPorCobrar = cuentasPorCobrar.reduce((sum, i) => {
      const total = i.final_amount || i.quote_amount || 0;
      const pagado = payments
        .filter(p => p.inquiry_id === i.id)
        .reduce((s, p) => s + (p.amount_paid || 0), 0);
      return sum + (total - pagado);
    }, 0);

    // Helper classification
    const getPaymentType = (p) => {
       if (p.destination_account_type === 'propia') return 'propia';
       if (p.destination_account_type === 'terceros') return 'terceros';
       // Implicit classification
       if (['transferencia', 'deposito', 'tarjeta'].includes(p.payment_method)) return 'propia';
       return 'efectivo';
    };

    // Ingresos
    const ingresosBrutos = filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    // Desglose de Ingresos (basado en destino del dinero)
    const ingresosCuentasPropias = filteredPayments
      .filter(p => getPaymentType(p) === 'propia')
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    const ingresosCuentasTerceros = filteredPayments
      .filter(p => getPaymentType(p) === 'terceros')
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    // Efectivo en manos (no depositado/N.A.)
    const ingresosEfectivo = filteredPayments
      .filter(p => getPaymentType(p) === 'efectivo')
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    
    // Gastos de materiales (solo tipo material)
    const gastosMateriales = filteredGastos
      .filter(g => g.tipo_gasto === 'material')
      .reduce((sum, g) => sum + (g.monto_total || 0), 0);
    
    // Otros gastos (transporte, herramienta, otro)
    const otrosGastos = filteredGastos
      .filter(g => g.tipo_gasto !== 'material')
      .reduce((sum, g) => sum + (g.monto_total || 0), 0);

    // Ingreso neto
    const ingresoNeto = ingresosBrutos - gastosMateriales - otrosGastos;

    return {
      prospectos: prospectos.length,
      clientesNuevos: filteredCustomers.length,
      clientesActivos: clientesActivos.length,
      totalTrabajos: filteredInquiries.length,
      trabajosCompletados: trabajosCompletados.length,
      trabajosEnProceso: trabajosEnProceso.length,
      trabajosPendientes: trabajosPendientes.length,
      serviciosNuevos: serviciosNuevos.length,
      pendientesCotizacion: pendientesCotizacion.length,
      cuentasPorCobrar: cuentasPorCobrar.length,
      montoPorCobrar,
      ingresosBrutos,
      ingresosEfectivo,
      ingresosCuentasPropias,
      ingresosCuentasTerceros,
      gastosMateriales,
      otrosGastos,
      ingresoNeto
    };
  }, [filteredCustomers, filteredInquiries, filteredPayments, filteredGastos, inquiries, payments]);

  // Trabajos por departamento
  const trabajosPorDepartamento = useMemo(() => {
    const counts = {};
    departamentos.forEach(d => counts[d] = 0);
    filteredInquiries.forEach(i => {
      if (i.location && counts[i.location] !== undefined) {
        counts[i.location]++;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredInquiries]);

  // Servicios vendidos
  const serviciosVendidos = useMemo(() => {
    const counts = {};
    filteredInquiries.forEach(i => {
      const service = i.service_type || 'Sin especificar';
      counts[service] = (counts[service] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredInquiries]);

  // Trabajos por rubro
  const trabajosPorRubro = useMemo(() => {
    const counts = {};
    filteredInquiries.forEach(i => {
      const rubro = i.rubro || 'Sin especificar';
      counts[rubro] = (counts[rubro] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [filteredInquiries]);

  // Cuentas por cobrar detalladas
  const cuentasPorCobrarDetalle = useMemo(() => {
    return inquiries
      .filter(i => i.status === 'completado' && i.payment_status !== 'pagado')
      .map(i => {
        const customer = customers.find(c => c.id === i.customer_id);
        const total = i.final_amount || i.quote_amount || 0;
        const pagado = payments
          .filter(p => p.inquiry_id === i.id)
          .reduce((s, p) => s + (p.amount_paid || 0), 0);
        return {
          id: i.id,
          cliente: customer?.full_name || i.client_name || 'N/A',
          servicio: i.service_type,
          total,
          pagado,
          pendiente: total - pagado,
          fecha: i.created_date,
          paymentStatus: i.payment_status
        };
      })
      .filter(c => c.pendiente > 0)
      .sort((a, b) => b.pendiente - a.pendiente);
  }, [inquiries, customers, payments]);

  // Desglose de gastos por proveedor
  const gastosPorProveedor = useMemo(() => {
    const counts = {};
    filteredGastos.filter(g => g.tipo_gasto === 'material').forEach(g => {
      const proveedor = g.proveedor || 'Sin proveedor';
      counts[proveedor] = (counts[proveedor] || 0) + (g.monto_total || 0);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredGastos]);

  // Dinero por recolector (técnicos)
  const dineroPorRecolector = useMemo(() => {
    const counts = {};
    // Helper defined inside useMemo or access from outside if moved
    const getPaymentTypeLocal = (p) => {
       if (p.destination_account_type === 'propia') return 'propia';
       if (p.destination_account_type === 'terceros') return 'terceros';
       if (['transferencia', 'deposito', 'tarjeta'].includes(p.payment_method)) return 'propia';
       return 'efectivo';
    };

    filteredPayments.forEach(p => {
      // Solo contar como dinero en mano si es efectivo
      if (p.collected_by && getPaymentTypeLocal(p) === 'efectivo') {
        counts[p.collected_by] = (counts[p.collected_by] || 0) + (p.amount_paid || 0);
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      {/* Filtros de fecha */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-proman-navy">Período:</span>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="last_week">Semana Pasada</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                  <SelectItem value="year">Este Año</SelectItem>
                  <SelectItem value="all">Todo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateFilter === "month" && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-proman-navy">Mes:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm"
                />
              </div>
            )}
            <Badge className="bg-proman-yellow text-proman-navy">
              {format(dateRange.start, "dd MMM", { locale: es })} - {format(dateRange.end, "dd MMM yyyy", { locale: es })}
            </Badge>
            
            <Button 
              onClick={handleGenerateReport} 
              disabled={isGeneratingReport}
              className="bg-proman-navy text-white ml-auto"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isGeneratingReport ? 'Generando...' : 'Generar Reporte PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.prospectos}</div>
                <div className="text-xs text-gray-600">Prospectos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.clientesNuevos}</div>
                <div className="text-xs text-gray-600">Clientes Nuevos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.totalTrabajos}</div>
                <div className="text-xs text-gray-600">Trabajos Totales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.trabajosCompletados}</div>
                <div className="text-xs text-gray-600">Completados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.trabajosEnProceso}</div>
                <div className="text-xs text-gray-600">En Proceso</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.cuentasPorCobrar}</div>
                <div className="text-xs text-gray-600">Por Cobrar</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-100 text-sm">Ingresos Brutos</p>
                <p className="text-3xl font-bold mt-1">${stats.ingresosBrutos.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-200" />
            </div>
            <div className="mt-4 pt-4 border-t border-green-400/50 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-green-100">Cuentas Propias</p>
                <p className="font-bold text-lg">${stats.ingresosCuentasPropias.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-green-100">Ctas. Terceros</p>
                <p className="font-bold text-lg">${stats.ingresosCuentasTerceros.toFixed(2)}</p>
              </div>
              <div className="col-span-2 border-t border-green-400/30 pt-1 mt-1">
                <div className="flex justify-between items-center">
                  <p className="text-green-100">Efectivo</p>
                  <p className="font-bold text-lg">${stats.ingresosEfectivo.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 text-sm">Gastos Materiales</p>
                <p className="text-3xl font-bold mt-1">${stats.gastosMateriales.toFixed(2)}</p>
                <p className="text-xs text-orange-200 mt-1">Pagar a proveedores</p>
              </div>
              <Package className="w-10 h-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-100 text-sm">Cuentas por Cobrar</p>
                <p className="text-3xl font-bold mt-1">${stats.montoPorCobrar.toFixed(2)}</p>
                <p className="text-xs text-red-200 mt-1">{stats.cuentasPorCobrar} trabajos pendientes</p>
              </div>
              <DollarSign className="w-10 h-10 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-proman-navy to-blue-800 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-200 text-sm">Ingreso Neto</p>
                <p className={`text-3xl font-bold mt-1 ${stats.ingresoNeto < 0 ? 'text-red-300' : ''}`}>
                  ${stats.ingresoNeto.toFixed(2)}
                </p>
                <p className="text-xs text-blue-200 mt-1">Después de gastos</p>
              </div>
              <BarChart3 className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="geografia" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="geografia" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
            📍 Geografía
          </TabsTrigger>
          <TabsTrigger value="servicios" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
            🛠️ Servicios
          </TabsTrigger>
          <TabsTrigger value="cuentas" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
            💰 Cuentas por Cobrar
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
            📦 Proveedores
          </TabsTrigger>
          <TabsTrigger value="recolectores" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
            🤝 Dinero en Manos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geografia">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-proman-yellow" />
                  Trabajos por Departamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trabajosPorDepartamento.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trabajosPorDepartamento} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#252a5c" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">No hay datos de ubicación</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-proman-yellow" />
                  Distribución por Rubro
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trabajosPorRubro.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={trabajosPorRubro}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {trabajosPorRubro.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">No hay datos de rubros</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="servicios">
          {/* Resumen de Servicios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Servicios Nuevos</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.serviciosNuevos}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Completados</p>
                  <p className="text-2xl font-bold text-green-900">{stats.trabajosCompletados}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-orange-700 font-medium">Pendiente Cotización</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.pendientesCotizacion}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Servicios Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {serviciosVendidos.length > 0 ? (
                <div className="space-y-3">
                  {serviciosVendidos.map((service, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-proman-navy text-white flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-proman-navy">{service.name}</span>
                          <Badge className="bg-proman-yellow text-proman-navy">{service.value} trabajos</Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-proman-navy h-2 rounded-full" 
                            style={{ width: `${(service.value / serviciosVendidos[0].value) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No hay servicios registrados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cuentas">
          <Card className="border-2 border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  Cuentas por Cobrar - Detalle
                </span>
                <Badge className="bg-red-100 text-red-800 text-lg px-4 py-1">
                  Total: ${stats.montoPorCobrar.toFixed(2)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {cuentasPorCobrarDetalle.length > 0 ? (
                <div className="space-y-3">
                  {cuentasPorCobrarDetalle.map((cuenta) => (
                    <div key={cuenta.id} className="bg-white border-2 border-gray-100 rounded-lg p-4 hover:border-red-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-proman-navy">{cuenta.cliente}</h4>
                          <p className="text-sm text-gray-600">{cuenta.servicio}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(cuenta.fecha), "dd MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Total: ${cuenta.total.toFixed(2)}</div>
                          <div className="text-xs text-green-600">Pagado: ${cuenta.pagado.toFixed(2)}</div>
                          <div className="text-xl font-bold text-red-600">${cuenta.pendiente.toFixed(2)}</div>
                          <Badge className={cuenta.paymentStatus === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                            {cuenta.paymentStatus === 'parcial' ? 'Pago Parcial' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-green-600 font-semibold text-lg">¡Excelente!</p>
                  <p className="text-gray-500">No hay cuentas pendientes por cobrar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recolectores">
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Dinero Recibido por Técnicos/Personal
                </span>
              </CardTitle>
              <p className="text-sm text-blue-700 mt-1">
                ℹ️ Montos físicos o en cuentas personales que deben liquidarse con la empresa.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {dineroPorRecolector.length > 0 ? (
                <div className="space-y-3">
                  {dineroPorRecolector.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-proman-navy">{item.name}</span>
                      </div>
                      <span className="text-xl font-bold text-blue-600">${item.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No hay registros de dinero recibido por personal</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores">
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-600" />
                  Gastos por Proveedor (Materiales)
                </span>
                <Badge className="bg-orange-100 text-orange-800 text-lg px-4 py-1">
                  Total: ${stats.gastosMateriales.toFixed(2)}
                </Badge>
              </CardTitle>
              <p className="text-sm text-orange-700 mt-1">
                ⚠️ Este monto debe pagarse a los proveedores
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {gastosPorProveedor.length > 0 ? (
                <div className="space-y-3">
                  {gastosPorProveedor.map((proveedor, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="font-medium text-proman-navy">{proveedor.name}</span>
                      </div>
                      <span className="text-xl font-bold text-orange-600">${proveedor.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No hay gastos de materiales registrados</p>
              )}

              {stats.otrosGastos > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-semibold text-gray-700 mb-3">Otros Gastos (Transporte, Herramientas, etc.)</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <span className="text-xl font-bold text-gray-600">${stats.otrosGastos.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}