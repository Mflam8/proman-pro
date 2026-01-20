import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { createPageUrl } from "@/utils";
import { Phone, AlertCircle, User, Star, DollarSign, Building, Home as HomeIcon, Bot, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { statusConfig, priorityConfig, activeStatuses } from "@/components/utils/inquiryConfig";
import EmployeeManagement from "../components/admin/EmployeeManagement";
import ServiceManagement from "../components/admin/ServiceManagement";
import CustomerManagement from "../components/admin/CustomerManagement";
import EquipmentManagement from "../components/admin/EquipmentManagement";
import PaymentManagement from "../components/admin/PaymentManagement";
import ReportsManagement from "../components/admin/ReportsManagement";
import ScheduleCalendar from "../components/admin/ScheduleCalendar";
import AutomationsControlPanel from "../components/admin/AutomationsControlPanel";
import InquiryDetailForm from "../components/admin/InquiryDetailForm";
import InquiryCreateForm from "../components/admin/InquiryCreateForm";

export default function ClientManagement() {
  const [user, setUser] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc");
  const [mainTab, setMainTab] = useState("trabajos");
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        base44.auth.redirectToLogin(window.location.pathname);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.employee_type === 'Supervisor';
  const hasManagementAccess = isAdmin || isSupervisor;

  const { data: inquiries, isLoading: isLoadingInquiries } = useQuery({
    queryKey: ['clientInquiries', sortOrder],
    queryFn: async () => {
      const orderBy = sortOrder === "desc" ? '-created_date' : 'created_date';
      const rawData = await base44.entities.ClientInquiry.filter({}, orderBy);
      // Normalizar datos - aplanar .data si existe
      return rawData.map(item => item.data ? { ...item, ...item.data } : item);
    },
    enabled: !!user && hasManagementAccess,
    initialData: [],
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    enabled: !!user && hasManagementAccess,
    initialData: [],
  });
  
  const updateInquiry = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientInquiry.update(id, data),
    onSuccess: async (result, variables) => {
      await queryClient.refetchQueries({ queryKey: ['clientInquiries'] });
      await queryClient.invalidateQueries({ queryKey: ['employeeSchedules'] }); 
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      setTimeout(() => {
        if (selectedInquiry) {
          const updatedInquiries = queryClient.getQueryData(['clientInquiries', sortOrder]);
          const updatedInquiry = updatedInquiries?.find(i => i.id === selectedInquiry.id);
          if (updatedInquiry) {
            setSelectedInquiry(updatedInquiry);
          }
        }
      }, 300);
    },
  });

  const deleteInquiry = useMutation({
    mutationFn: (id) => base44.entities.ClientInquiry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      setSelectedInquiry(null);
    },
  });

  const createInquiry = useMutation({
    mutationFn: async (data) => {
      console.log('🔥 Intentando crear trabajo con data:', data);
      const newInquiry = await base44.entities.ClientInquiry.create(data);
      console.log('✅ Trabajo creado exitosamente:', newInquiry);
      
      if (data.customer_id) {
        const customer = customers.find(c => c.id === data.customer_id);
        if (customer) {
          await base44.entities.Customer.update(data.customer_id, {
            total_jobs: (customer.total_jobs || 0) + 1,
            status: (!customer.status || customer.status === "nuevo" || customer.status === "contactado") ? "activo" : customer.status
          });
        }
      }
      
      return newInquiry;
    },
    onSuccess: () => {
        console.log('✅ onSuccess ejecutado');
        queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setShowCreateModal(false);
    },
    onError: (error) => {
        console.error('❌ Error creando trabajo:', error);
        alert('Error al crear el trabajo: ' + (error.message || 'Error desconocido'));
    }
  });

  const getCustomerForInquiry = (inquiry) => {
    if (inquiry.customer_id) {
      return customers.find(c => c.id === inquiry.customer_id);
    }
    return null;
  };

  // Estados que se consideran "activos" (en progreso)
  const activeStatuses = ["trabajo_aprobado", "agendado", "en_ruta", "en_sitio", "en_proceso", "terminado", "evaluacion_agendada", "evaluacion_pendiente", "evaluacion_realizada", "cotizacion_pendiente", "cotizacion_realizada", "pendiente_aprobacion"];
  
  const filteredInquiries = inquiries.filter(inquiry => {
    let matchesTab = false;
    if (activeTab === "all") {
      matchesTab = true;
    } else if (activeTab === "activos") {
      matchesTab = activeStatuses.includes(inquiry.status);
    } else {
      matchesTab = inquiry.status === activeTab;
    }
    
    const customer = getCustomerForInquiry(inquiry);
    const matchesSearch = searchTerm === "" || 
      inquiry.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.phone?.includes(searchTerm) ||
      customer?.phone?.includes(searchTerm) ||
      inquiry.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.rubro?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const stats = {
    total: inquiries.length,
    nuevo: inquiries.filter(i => i.status === "nuevo").length,
    activos: inquiries.filter(i => activeStatuses.includes(i.status)).length,
    completado: inquiries.filter(i => i.status === "completado").length
  };

  const getWhatsAppLink = (inquiry) => {
    const customer = getCustomerForInquiry(inquiry);
    const clientName = customer?.full_name || inquiry.client_name;
    const phone = customer?.phone || inquiry.phone;
    const serviceDisplay = inquiry.rubro ? `${inquiry.rubro} - ${inquiry.service_type}` : inquiry.service_type;
    const message = `Hola ${clientName}, te contacto de PROMAN Services sobre tu solicitud de ${serviceDisplay}.`;
    return `https://wa.me/${phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };
  
  const getWhatsAppUpdateLink = (inquiry) => {
    const customer = getCustomerForInquiry(inquiry);
    const clientName = customer?.full_name || inquiry.client_name;
    const phone = customer?.phone || inquiry.phone;
    const message = `¡Hola ${clientName}! Te damos una actualización de tu servicio de ${inquiry.service_type}:\n\n*Avance:* ${inquiry.progress_percentage || 0}%\n\n*Trabajos realizados:*\n${inquiry.work_notes_done || 'N/A'}\n\n*Pendiente:*\n${inquiry.work_notes_pending || 'N/A'}\n\nPróximo seguimiento: ${inquiry.next_follow_up_date ? format(new Date(inquiry.next_follow_up_date), "dd MMMM yyyy", { locale: es }) : 'Pendiente'}\n\nEquipo de PROMAN Services`;
    return `https://wa.me/${phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };
  
  const getSurveyLink = (inquiryId) => {
    const url = new URL(window.location.origin);
    url.pathname = createPageUrl("SatisfactionSurvey");
    url.searchParams.set("id", inquiryId);
    return url.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proman-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasManagementAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-proman-navy mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="gradient-navy-yellow text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Portal de Gestión
            </h1>
            <p className="text-gray-200">
              {isAdmin ? 'Administra trabajos, clientes y empleados' : 'Gestiona trabajos y clientes'}
            </p>
          </div>
          <div className="flex gap-3">
            {(isAdmin || isSupervisor) && (
              <a 
                href={base44.agents.getWhatsAppConnectURL('gestionBot')} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button className="bg-green-500 hover:bg-green-600 text-white">
                  <Bot className="w-4 h-4 mr-2" />
                  Bot de Gestión por WhatsApp
                </Button>
              </a>
            )}
            {mainTab === "trabajos" && (
              <Button onClick={() => setShowCreateModal(true)} className="bg-proman-yellow text-proman-navy hover:opacity-90">
                  Nuevo Trabajo
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={mainTab} onValueChange={setMainTab} className="mb-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="trabajos" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                              📋 Gestión de Trabajos
                            </TabsTrigger>
                            <TabsTrigger value="calendario" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                              📅 Calendario
                            </TabsTrigger>
                            <TabsTrigger value="clientes" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                              👥 Gestión de Clientes
                            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="servicios" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                  🛠️ Gestión de Servicios
                </TabsTrigger>
                <TabsTrigger value="pagos" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                  💰 Gestión de Pagos
                </TabsTrigger>
                <TabsTrigger value="inventario" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                  📦 Inventario
                </TabsTrigger>
                <TabsTrigger value="empleados" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                  👤 Gestión de Empleados
                </TabsTrigger>
                <TabsTrigger value="reportes" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                  📊 Reportes
                </TabsTrigger>
                <TabsTrigger value="automatizaciones" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                  🤖 Automatizaciones
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="trabajos">
            {/* Bot Activity Alert */}
            {isAdmin && (customers.filter(c => c.created_by === 'system' || c.notes?.includes('WhatsApp')).length > 0 || 
              inquiries.filter(i => i.created_by === 'system' || i.notes?.includes('WhatsApp')).length > 0) && (
              <Card className="mb-6 border-2 border-green-500 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-green-800">🤖 Actividad del Bot de WhatsApp</h3>
                      <p className="text-sm text-green-700">
                        El bot ha capturado automáticamente: 
                        <strong> {customers.filter(c => c.created_by === 'system' || c.notes?.includes('WhatsApp')).length} cliente(s)</strong> y 
                        <strong> {inquiries.filter(i => i.created_by === 'system' || i.notes?.includes('WhatsApp')).length} trabajo(s)</strong> desde WhatsApp
                      </p>
                    </div>
                    <Badge className="bg-green-600 text-white">Bot Activo</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-proman-navy">{stats.total}</div><div className="text-sm text-gray-600">Total</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-blue-600">{stats.nuevo}</div><div className="text-sm text-gray-600">Nuevos</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-orange-600">{stats.activos}</div><div className="text-sm text-gray-600">Activos</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{stats.completado}</div><div className="text-sm text-gray-600">Completados</div></CardContent></Card>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar por nombre, teléfono, servicio o rubro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Ordenar por fecha" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Más recientes primero</SelectItem>
                        <SelectItem value="asc">Más antiguos primero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="overflow-x-auto -mx-4 px-4">
                  <div className="inline-flex bg-gray-100 rounded-lg p-1 flex-wrap gap-1">
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "all"
                          ? "bg-white text-proman-navy shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setActiveTab("nuevo")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "nuevo"
                          ? "bg-white text-proman-navy shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Nuevos
                    </button>
                    <button
                      onClick={() => setActiveTab("activos")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "activos"
                          ? "bg-white text-proman-navy shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Activos
                    </button>
                    <button
                      onClick={() => setActiveTab("completado")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "completado"
                          ? "bg-white text-proman-navy shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Completados
                    </button>
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {filteredInquiries.map((inquiry) => {
                const StatusIcon = statusConfig[inquiry.status]?.icon || AlertCircle;
                const customer = getCustomerForInquiry(inquiry);
                const displayName = customer?.full_name || inquiry.client_name;
                const displayPhone = customer?.phone || inquiry.phone;
                
                return (
                  <Card 
                    key={inquiry.id} 
                    className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-proman-yellow"
                    onClick={() => setSelectedInquiry(inquiry)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                              <User className="w-6 h-6 text-proman-navy" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-xl font-bold text-proman-navy">
                                  {displayName}
                                </h3>
                                {customer && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <User className="w-3 h-3 mr-1" />
                                    Cliente Registrado
                                  </Badge>
                                )}
                                {customer?.customer_type && (
                                  <Badge className={
                                    customer.customer_type === "residencial" ? "bg-blue-100 text-blue-800" :
                                    customer.customer_type === "comercial" ? "bg-indigo-100 text-indigo-800" :
                                    "bg-purple-100 text-purple-800"
                                  }>
                                    {customer.customer_type === "residencial" && <HomeIcon className="w-3 h-3 mr-1" />}
                                    {customer.customer_type !== "residencial" && <Building className="w-3 h-3 mr-1" />}
                                    {customer.customer_type}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                <Badge className={statusConfig[inquiry.status]?.color}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusConfig[inquiry.status]?.label}
                                </Badge>
                                <Badge className={priorityConfig[inquiry.priority]?.color}>
                                  {priorityConfig[inquiry.priority]?.label}
                                </Badge>
                                {inquiry.satisfaction_rating && (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                        <Star className="w-3 h-3 mr-1"/> {inquiry.satisfaction_rating}/5
                                    </Badge>
                                )}
                                {inquiry.payment_status === 'pendiente' && (
                                    <Badge className="bg-red-100 text-red-800">
                                        <DollarSign className="w-3 h-3 mr-1"/> Pendiente de Pago
                                    </Badge>
                                )}
                                {inquiry.payment_status === 'parcial' && (
                                    <Badge className="bg-orange-100 text-orange-800">
                                        <DollarSign className="w-3 h-3 mr-1"/> Pago Parcial
                                    </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-proman-yellow" /><span>{displayPhone}</span></div>
                            <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-proman-yellow" /><span>{inquiry.location}</span></div>
                            <div className="flex items-center gap-2 text-gray-600"><FileText className="w-4 h-4 text-proman-yellow" /><span>{inquiry.rubro ? `${inquiry.rubro} - ` : ''}{inquiry.service_type}</span></div>
                            {inquiry.preferred_time && (<div className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4 text-proman-yellow" /><span>{inquiry.preferred_time}</span></div>)}
                          </div>
                          
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold text-gray-500">PROGRESO</span>
                                <span className="text-sm font-bold text-proman-navy">{inquiry.progress_percentage || 0}%</span>
                            </div>
                            <Progress value={inquiry.progress_percentage || 0} className="w-full h-2" />
                          </div>

                        </div>

                        <div className="flex flex-col gap-2 md:items-end">
                          <span className="text-xs text-gray-500">{format(new Date(inquiry.created_date), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                          <a href={getWhatsAppLink(inquiry)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 w-full"><Phone className="w-4 h-4 mr-1" />WhatsApp</Button>
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {filteredInquiries.length === 0 && !isLoadingInquiries && (
                <p className="text-center text-gray-500 mt-8">No se encontraron solicitudes.</p>
            )}
            {isLoadingInquiries && (
                <p className="text-center text-gray-500 mt-8">Cargando solicitudes...</p>
            )}
          </TabsContent>

          <TabsContent value="calendario">
                        <ScheduleCalendar onSelectJob={(job) => setSelectedInquiry(job)} />
                      </TabsContent>

                      <TabsContent value="clientes">
                        <CustomerManagement />
                      </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="servicios">
                <ServiceManagement />
              </TabsContent>

              <TabsContent value="pagos">
                <PaymentManagement />
              </TabsContent>

              <TabsContent value="inventario">
                <EquipmentManagement />
              </TabsContent>

              <TabsContent value="empleados">
                <EmployeeManagement />
              </TabsContent>

              <TabsContent value="reportes">
                <ReportsManagement />
              </TabsContent>

              <TabsContent value="automatizaciones">
                <AutomationsControlPanel />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
      
      {selectedInquiry && (
        <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Detalles de Solicitud</DialogTitle>
                </DialogHeader>
                <InquiryDetailForm 
                                        inquiry={selectedInquiry}
                                        customer={getCustomerForInquiry(selectedInquiry)}
                                        customers={customers}
                                        onUpdate={updateInquiry.mutate}
                                        isUpdating={updateInquiry.isPending}
                                        isAdmin={isAdmin}
                                        isSupervisor={isSupervisor}
                                        getSurveyLink={getSurveyLink}
                                        getWhatsAppUpdateLink={getWhatsAppUpdateLink}
                                        onDelete={deleteInquiry.mutate}
                                    />
            </DialogContent>
        </Dialog>
      )}

      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={() => setShowCreateModal(false)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-2xl">Crear Nuevo Trabajo</DialogTitle></DialogHeader>
                <InquiryCreateForm 
                    customers={customers}
                    onSubmit={createInquiry.mutate} 
                    isSubmitting={createInquiry.isPending}
                    onCancel={() => setShowCreateModal(false)}
                />
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function InquiryDetailForm({ inquiry, customer, customers, onUpdate, isUpdating, isAdmin, isSupervisor, getSurveyLink, getWhatsAppUpdateLink, onDelete }) {
    const canEdit = isAdmin || isSupervisor;
    const [showCustomerEdit, setShowCustomerEdit] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const queryClient = useQueryClient();
    
    const [formData, setFormData] = useState({
                  ...inquiry,
                  progress_percentage: inquiry.progress_percentage || 0,
                  scheduled_date: inquiry.scheduled_date || '',
                  scheduled_start_time: inquiry.scheduled_start_time || '',
                  estimated_duration_hours: inquiry.estimated_duration_hours || '',
                  quote_pdf_url: inquiry.quote_pdf_url || '',
                  location_name: inquiry.location_name || '',
              });
    const [beforeImageFile, setBeforeImageFile] = useState(null);
    const [afterImageFile, setAfterImageFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Fetch progress logs
    const { data: progressLogs } = useQuery({
        queryKey: ['progressLogs', inquiry.id],
        queryFn: () => base44.entities.ProgressLog.filter({ inquiry_id: inquiry.id }, '-created_date'),
        initialData: [],
    });

    // Fetch payments
    const { data: payments } = useQuery({
        queryKey: ['payments', inquiry.id],
        queryFn: () => base44.entities.Payment.filter({ inquiry_id: inquiry.id }, '-payment_date'),
        initialData: [],
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Fetch inquiry actualizado en tiempo real
    const { data: currentInquiry } = useQuery({
        queryKey: ['inquiry', inquiry.id],
        queryFn: () => base44.entities.ClientInquiry.filter({ id: inquiry.id }).then(res => res[0]),
        initialData: inquiry,
        refetchInterval: 3000, // Actualizar cada 3 segundos
    });

    const createPayment = useMutation({
        mutationFn: async (data) => {
            const currentUser = await base44.auth.me();
            const paymentData = { ...data, recorded_by: currentUser.email, inquiry_id: inquiry.id };
            const payment = await base44.entities.Payment.create(paymentData);
            
            // Actualizar el estado de pago del inquiry
            const allPayments = await base44.entities.Payment.filter({ inquiry_id: inquiry.id });
            const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0) + data.amount_paid;
            const finalAmount = formData.final_amount || formData.quote_amount || 0;
            
            let newPaymentStatus = 'pendiente';
            if (totalPaid >= finalAmount) {
                newPaymentStatus = 'pagado';
            } else if (totalPaid > 0) {
                newPaymentStatus = 'parcial';
            }
            
            await base44.entities.ClientInquiry.update(inquiry.id, { payment_status: newPaymentStatus });
            
            // Actualizar total_spent del cliente
            if (customer) {
                await base44.entities.Customer.update(customer.id, {
                    total_spent: (customer.total_spent || 0) + parseFloat(data.amount_paid)
                });
            }
            
            return payment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments', inquiry.id] });
            queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });
            queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            setShowPaymentModal(false);
        },
    });

    // Fetch billing items to calculate final amount
    const { data: billingItems } = useQuery({
        queryKey: ['billingItems', inquiry.id],
        queryFn: () => base44.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiry.id }),
        initialData: [],
    });

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const calculatedFinalAmount = billingItems.reduce((sum, item) => sum + (item.monto_total_item || 0), 0);
    const finalAmount = parseFloat(calculatedFinalAmount > 0 ? calculatedFinalAmount : (currentInquiry?.final_amount || currentInquiry?.quote_amount || formData.final_amount || formData.quote_amount || 0)) || 0;
    const remainingAmount = finalAmount - totalPaid;

    useEffect(() => {
        setFormData({
                          ...inquiry,
                          progress_percentage: inquiry.progress_percentage || 0,
                          scheduled_date: inquiry.scheduled_date || '',
                          scheduled_start_time: inquiry.scheduled_start_time || '',
                          estimated_duration_hours: inquiry.estimated_duration_hours || '',
                          quote_pdf_url: inquiry.quote_pdf_url || '',
                          location_name: inquiry.location_name || '',
                      });
    }, [inquiry]);

    // Sincronizar final_amount calculado con formData
    useEffect(() => {
        if (calculatedFinalAmount > 0 && calculatedFinalAmount !== formData.final_amount) {
            setFormData(prev => ({
                ...prev,
                final_amount: calculatedFinalAmount
            }));
        }
    }, [calculatedFinalAmount]);

    const handleImageUpload = async (file, fieldName) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData(prev => ({ ...prev, [fieldName]: file_url }));
        } catch (error) {
            console.error("Image upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };
    
    useEffect(() => {
        if (beforeImageFile) handleImageUpload(beforeImageFile, 'before_image_url');
    }, [beforeImageFile]);

    useEffect(() => {
        if (afterImageFile) handleImageUpload(afterImageFile, 'after_image_url');
    }, [afterImageFile]);

    const handleAutoSaveChange = async (field, value) => {
        let newData = { ...formData, [field]: value };
        
        if (field === 'status' && value === 'completado') {
            newData.progress_percentage = 100;
            
            // Recalcular payment_status automáticamente
            const allPayments = await base44.entities.Payment.filter({ inquiry_id: inquiry.id });
            const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
            const finalAmount = formData.final_amount || formData.quote_amount || 0;
            
            if (totalPaid >= finalAmount && finalAmount > 0) {
                newData.payment_status = 'pagado';
            } else if (totalPaid > 0) {
                newData.payment_status = 'parcial';
            } else {
                newData.payment_status = 'pendiente';
            }
        }
        
        setFormData(newData);
        
        // Auto-save changes
        const { id, ...updateData } = newData;
        // Asegurar que progress_percentage se incluya explícitamente como número
        updateData.progress_percentage = Number(newData.progress_percentage) || 0;
        
        onUpdate({ id: inquiry.id, data: updateData });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const { id, ...updateData } = formData;
            
            // Asegurar que progress_percentage se incluya explícitamente como número
            updateData.progress_percentage = Number(formData.progress_percentage) || 0;
            
            console.log('Guardando progreso:', updateData.progress_percentage);
            
            // Guardar en el log si cambió el progreso, notas o fotos
            const progressChanged = 
                formData.progress_percentage !== inquiry.progress_percentage ||
                formData.work_notes_done !== inquiry.work_notes_done ||
                formData.work_notes_pending !== inquiry.work_notes_pending ||
                formData.before_image_url !== inquiry.before_image_url ||
                formData.after_image_url !== inquiry.after_image_url;

            if (progressChanged) {
                try {
                    const currentUser = await base44.auth.me();
                    
                    // Recolectar solo las fotos NUEVAS que se subieron en esta actualización
                    const newBeforePhotos = [];
                    const newAfterPhotos = [];
                    
                    if (formData.before_image_url && formData.before_image_url !== inquiry.before_image_url) {
                        newBeforePhotos.push(formData.before_image_url);
                    }
                    if (formData.after_image_url && formData.after_image_url !== inquiry.after_image_url) {
                        newAfterPhotos.push(formData.after_image_url);
                    }
                    
                    await base44.entities.ProgressLog.create({
                        inquiry_id: id,
                        progress_percentage: formData.progress_percentage || 0,
                        hours_worked: formData.current_hours_worked || 0,
                        work_date: formData.current_work_date || new Date().toISOString().split('T')[0],
                        work_done: formData.work_notes_done || '',
                        work_pending: formData.work_notes_pending || '',
                        next_follow_up_date: formData.next_follow_up_date || null,
                        before_photos: newBeforePhotos,
                        after_photos: newAfterPhotos,
                        updated_by: currentUser.email,
                        notes: formData.notes || ''
                    });
                    await queryClient.invalidateQueries({ queryKey: ['progressLogs', id] });
                } catch (error) {
                    console.error("Error creating progress log", error);
                    alert("Error guardando historial de progreso: " + error.message);
                }
            }

            await onUpdate({ id, data: updateData });
        } catch (error) {
            console.error("Error updating inquiry", error);
            alert("Error guardando cambios: " + error.message);
        }
    };

    const handleChangeCustomer = async (newCustomerId) => {
        const { id, ...updateData } = formData;
        await onUpdate({ id, data: { ...updateData, customer_id: newCustomerId, client_name: undefined, phone: undefined } });
        setShowCustomerEdit(false);
    };

    const filteredCustomersForSearch = customers.filter(c =>
        c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
    );

    // Calcular estadísticas del trabajo
    const workStats = useMemo(() => {
        if (progressLogs.length === 0) return null;
        
        const firstLog = progressLogs[progressLogs.length - 1];
        const lastLog = progressLogs[0];
        
        const startDate = new Date(firstLog.created_date);
        const lastUpdate = new Date(lastLog.created_date);
        const daysPassed = Math.ceil((lastUpdate - startDate) / (1000 * 60 * 60 * 24));
        
        // Calcular total de horas trabajadas
        const totalHoursWorked = progressLogs.reduce((sum, log) => sum + (log.hours_worked || 0), 0);
        
        return {
            totalUpdates: progressLogs.length,
            daysPassed: daysPassed,
            startDate: startDate,
            lastUpdate: lastUpdate,
            currentProgress: lastLog.progress_percentage,
            totalHoursWorked: totalHoursWorked
        };
    }, [progressLogs]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-6">
                    {/* 1. INFORMACIÓN DEL CLIENTE - PRIMERO */}
                    <Card className="border-2 border-proman-yellow">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    {customer ? 'Cliente Vinculado' : 'Información del Cliente'}
                                </CardTitle>
                                {canEdit && customer && (
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => setShowCustomerEdit(!showCustomerEdit)}
                                    >
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        Cambiar
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {customer ? (
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge className="bg-green-100 text-green-800">
                                            Cliente Registrado
                                        </Badge>
                                        {customer.is_vip && (
                                            <Badge className="bg-yellow-100 text-yellow-800">
                                                <Star className="w-3 h-3 mr-1" />
                                                VIP
                                            </Badge>
                                        )}
                                    </div>
                                    <InfoRow label="Nombre" value={customer.full_name} />
                                    <InfoRow label="Teléfono" value={customer.phone} />
                                    {customer.email && <InfoRow label="Email" value={customer.email} />}
                                    <InfoRow label="Tipo" value={customer.customer_type} />
                                </>
                            ) : (
                                <>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                        <p className="text-xs text-yellow-800">
                                            ⚠️ Cliente no vinculado a base de datos
                                        </p>
                                    </div>
                                    <InfoRow label="Nombre" value={inquiry.client_name || "N/A"} />
                                    <InfoRow label="Teléfono" value={inquiry.phone || "N/A"} />
                                    {canEdit && (
                                        <Button type="button" size="sm" className="w-full mt-3 bg-proman-yellow text-proman-navy" onClick={() => setShowCustomerEdit(true)}>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Vincular Cliente
                                        </Button>
                                    )}
                                </>
                            )}
                            {showCustomerEdit && (
                                <div className="pt-3 border-t space-y-3">
                                    <Input placeholder="Buscar cliente..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        {filteredCustomersForSearch.map(c => (
                                            <div key={c.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => handleChangeCustomer(c.id)}>
                                                <div className="font-medium">{c.full_name}</div>
                                                <div className="text-xs text-gray-500">{c.phone}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setShowCustomerEdit(false)}>Cancelar</Button>
                                </div>
                            )}
                            <div className="pt-2 border-t space-y-2">
                                <InfoRow label="Ubicación" value={(currentInquiry?.location_name || inquiry.location_name) ? `${currentInquiry?.location_name || inquiry.location_name}, ${currentInquiry?.location || inquiry.location}` : (currentInquiry?.location || inquiry.location)} />
                                
                                {canEdit ? (
                                    <>
                                        <div>
                                            <Label className="text-xs text-gray-600">Rubro</Label>
                                            <Select 
                                                value={formData.rubro} 
                                                onValueChange={(v) => handleAutoSaveChange('rubro', v)}
                                                disabled={isUpdating}
                                            >
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Hogar">Hogar</SelectItem>
                                                    <SelectItem value="Comercial">Comercial</SelectItem>
                                                    <SelectItem value="Restaurantes">Restaurantes</SelectItem>
                                                    <SelectItem value="Hospitales">Hospitales</SelectItem>
                                                    <SelectItem value="Emergencias">Emergencias</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-600">Servicio</Label>
                                            <Input 
                                                value={formData.service_type || ''} 
                                                onChange={(e) => setFormData(p => ({...p, service_type: e.target.value}))}
                                                className="h-8 text-sm"
                                                disabled={isUpdating}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <InfoRow label="Servicio" value={`${currentInquiry?.rubro || inquiry.rubro} - ${currentInquiry?.service_type || inquiry.service_type}`} />
                                )}
                                
                                <InfoRow label="Recibido" value={format(new Date(inquiry.created_date), "dd MMM yyyy, HH:mm", { locale: es })} />
                                {inquiry.message && <p className="text-gray-600 mt-2 italic text-xs">"{inquiry.message}"</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. PANEL ADMINISTRATIVO */}
                    {canEdit && (
                        <Card className="border-2 border-purple-500 bg-purple-50/30">
                            <CardHeader className="bg-purple-500 text-white">
                                <CardTitle>⚙️ Panel Administrativo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="block text-sm font-medium text-proman-navy mb-2">Estado</Label>
                                        <Select value={formData.status} onValueChange={(v) => handleAutoSaveChange('status', v)} disabled={isUpdating}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="block text-sm font-medium text-proman-navy mb-2">Prioridad</Label>
                                        <Select value={formData.priority} onValueChange={(v) => handleAutoSaveChange('priority', v)} disabled={isUpdating}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <Label className="block text-sm font-medium text-proman-navy mb-2">Nombre del Lugar (factura)</Label>
                                    <Input value={formData.location_name || ''} onChange={(e) => setFormData(p => ({...p, location_name: e.target.value}))} placeholder="Ej: Cuartel General, Hospital Nacional" disabled={isUpdating} />
                                </div>
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold text-proman-navy mb-3">Programación</h3>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div><Label className="text-xs">Fecha</Label><Input type="date" value={formData.scheduled_date || ''} onChange={(e) => setFormData(p => ({...p, scheduled_date: e.target.value}))} disabled={isUpdating} /></div>
                                        <div><Label className="text-xs">Hora</Label><Input type="time" value={formData.scheduled_start_time || ''} onChange={(e) => setFormData(p => ({...p, scheduled_start_time: e.target.value}))} disabled={isUpdating} /></div>
                                        <div><Label className="text-xs">Duración (hrs)</Label><Input type="number" step="0.5" value={formData.estimated_duration_hours || ''} onChange={(e) => setFormData(p => ({...p, estimated_duration_hours: parseFloat(e.target.value)}))} disabled={isUpdating} /></div>
                                    </div>
                                    <EmployeeSelector selectedDate={formData.scheduled_date} startTime={formData.scheduled_start_time} duration={formData.estimated_duration_hours} onSelect={(email) => setFormData(p => ({...p, assigned_to: email}))} currentAssignee={formData.assigned_to} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <InputField label="Cotización ($)" type="number" value={formData.quote_amount} onChange={(e) => setFormData(p => ({...p, quote_amount: e.target.value}))} disabled={isUpdating} />
                                    <InputField label="Monto Final ($)" type="number" value={formData.final_amount} onChange={(e) => setFormData(p => ({...p, final_amount: e.target.value}))} disabled={isUpdating} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">Estado de Pago</Label>
                                        <Select value={formData.payment_status || 'pendiente'} onValueChange={(v) => setFormData(p => ({...p, payment_status: v}))} disabled={isUpdating}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                                <SelectItem value="parcial">Parcial</SelectItem>
                                                <SelectItem value="pagado">Pagado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Técnico Asignado</Label>
                                        <Input value={formData.assigned_to || ''} disabled className="bg-gray-50" />
                                    </div>
                                </div>
                                <Textarea name="notes" placeholder="Notas internas..." value={formData.notes || ''} onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))} rows={2} disabled={isUpdating} />
                            </CardContent>
                        </Card>
                    )}

                    {/* 3. COTIZACIÓN / FACTURACIÓN */}
                    <BillingDetails inquiryId={inquiry.id} canEdit={canEdit} inquiry={inquiry} />
                </div>

                {/* COLUMNA DERECHA */}
                <div className="space-y-6">
                    {/* 4. GASTOS DEL TRABAJO */}
                    <WorkExpenses inquiryId={inquiry.id} canEdit={canEdit} />

                    {/* 5. ACTUALIZACIÓN DE PROGRESO */}
                    <Card className="border-2 border-blue-500 bg-blue-50/30">
                        <CardHeader className="bg-blue-500 text-white">
                            <CardTitle className="flex items-center gap-2">
                                👷 Actualización de Progreso
                            </CardTitle>
                            <p className="text-xs text-blue-100 mt-1">
                                Cada cambio que guardes se registrará automáticamente en el historial
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border">
                                <div>
                                    <label className="block text-sm font-medium text-proman-navy mb-1">📅 Fecha del Trabajo</label>
                                    <Input 
                                        type="date" 
                                        value={formData.current_work_date || new Date().toISOString().split('T')[0]} 
                                        onChange={(e) => setFormData(prev => ({...prev, current_work_date: e.target.value}))}
                                        disabled={isUpdating || !canEdit}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-proman-navy mb-1">⏱️ Horas Trabajadas</label>
                                    <Input 
                                        type="number" 
                                        step="0.5"
                                        min="0"
                                        value={formData.current_hours_worked || ''} 
                                        onChange={(e) => setFormData(prev => ({...prev, current_hours_worked: parseFloat(e.target.value) || 0}))}
                                        disabled={isUpdating || !canEdit}
                                        placeholder="Ej: 8"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-proman-navy mb-2">
                                    Porcentaje de Avance: <span className="text-xl font-bold text-blue-600">{formData.progress_percentage || 0}%</span>
                                </label>
                                <Slider
                                    value={[Number(formData.progress_percentage) || 0]}
                                    onValueChange={(val) => {
                                        console.log('Slider changed to:', val[0]);
                                        setFormData(prev => ({...prev, progress_percentage: Number(val[0])}));
                                    }}
                                    max={100} 
                                    step={10}
                                    disabled={isUpdating || !canEdit}
                                    className="mt-2"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-proman-navy mb-2">¿Qué se realizó?</label>
                                <Textarea name="work_notes_done" value={formData.work_notes_done || ''} onChange={(e) => setFormData(prev => ({...prev, work_notes_done: e.target.value}))} rows={3} disabled={isUpdating || !canEdit} placeholder="Detalla las tareas completadas en esta actualización..." />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-proman-navy mb-2">¿Qué falta?</label>
                                <Textarea name="work_notes_pending" value={formData.work_notes_pending || ''} onChange={(e) => setFormData(prev => ({...prev, work_notes_pending: e.target.value}))} rows={3} disabled={isUpdating || !canEdit} placeholder="Detalla lo que falta por hacer..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-proman-navy mb-2">Próximo seguimiento</label>
                                <Input type="date" name="next_follow_up_date" value={formData.next_follow_up_date || ''} onChange={(e) => setFormData(prev => ({...prev, next_follow_up_date: e.target.value}))} disabled={isUpdating || !canEdit} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-500 bg-blue-50/30">
                        <CardHeader className="bg-blue-500 text-white">
                            <CardTitle>📸 Fotografías del Trabajo</CardTitle>
                            <p className="text-xs text-blue-100 mt-1">
                                Las fotos se guardarán en el historial de esta actualización
                            </p>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 pt-4">
                            <ImageUploader label="Antes" imageUrl={formData.before_image_url} onFileSelect={setBeforeImageFile} isUploading={isUploading} disabled={!canEdit} />
                            <ImageUploader label="Después" imageUrl={formData.after_image_url} onFileSelect={setAfterImageFile} isUploading={isUploading} disabled={!canEdit} />
                        </CardContent>
                    </Card>

                    {progressLogs.length > 0 && (
                        <Card className="border-2 border-green-500">
                            <CardHeader className="bg-green-500 text-white">
                                <CardTitle className="flex items-center justify-between">
                                    <span>📊 Historial Completo de Trabajo</span>
                                    <Badge className="bg-white text-green-700">
                                        {progressLogs.length} {progressLogs.length === 1 ? 'actualización' : 'actualizaciones'}
                                    </Badge>
                                </CardTitle>
                                <p className="text-xs text-green-100 mt-1">
                                    Registro cronológico de todos los avances realizados
                                </p>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {workStats && (
                                    <div className="bg-white rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-600">{workStats.currentProgress}%</p>
                                            <p className="text-xs text-gray-600">Avance Actual</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-orange-600">{workStats.totalHoursWorked}h</p>
                                            <p className="text-xs text-gray-600">Horas Trabajadas</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-blue-600">{workStats.totalUpdates}</p>
                                            <p className="text-xs text-gray-600">Actualizaciones</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-purple-600">{workStats.daysPassed}</p>
                                            <p className="text-xs text-gray-600">{workStats.daysPassed === 1 ? 'Día' : 'Días'} transcurridos</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-gray-700">{format(workStats.lastUpdate, "dd MMM", { locale: es })}</p>
                                            <p className="text-xs text-gray-600">Última actualización</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                    {progressLogs.map((log, idx) => {
                                        const isFirst = idx === progressLogs.length - 1;
                                        const isLast = idx === 0;
                                        
                                        return (
                                            <div key={log.id} className="relative">
                                                {/* Timeline line */}
                                                {!isLast && (
                                                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-300" />
                                                )}
                                                
                                                <div className="flex gap-4">
                                                    {/* Timeline dot */}
                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                                        isFirst ? 'bg-blue-500' : 
                                                        isLast ? 'bg-green-500' : 
                                                        'bg-gray-400'
                                                    }`}>
                                                        <span className="text-white font-bold text-sm">
                                                            {log.progress_percentage}%
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Content */}
                                                    <div className="flex-1 bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={
                                                                    isFirst ? "bg-blue-500 text-white" :
                                                                    isLast ? "bg-green-500 text-white" :
                                                                    "bg-gray-500 text-white"
                                                                }>
                                                                    {isFirst && "🏁 Inicio"}
                                                                    {isLast && "✅ Última actualización"}
                                                                    {!isFirst && !isLast && `Actualización ${progressLogs.length - idx}`}
                                                                </Badge>
                                                                {log.hours_worked > 0 && (
                                                                    <Badge className="bg-orange-100 text-orange-800">
                                                                        <Clock className="w-3 h-3 mr-1" />
                                                                        {log.hours_worked}h trabajadas
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs font-semibold text-gray-700">
                                                                    {log.work_date ? format(new Date(log.work_date), "dd MMM yyyy", { locale: es }) : format(new Date(log.created_date), "dd MMM yyyy", { locale: es })}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    Registrado: {format(new Date(log.created_date), "HH:mm", { locale: es })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        {log.work_done && (
                                                            <div className="mb-3">
                                                                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    Trabajo Realizado:
                                                                </p>
                                                                <p className="text-sm text-gray-700 bg-green-50 rounded p-2">
                                                                    {log.work_done}
                                                                </p>
                                                            </div>
                                                        )}
                                                        
                                                        {log.work_pending && (
                                                            <div className="mb-3">
                                                                <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    Pendiente:
                                                                </p>
                                                                <p className="text-sm text-gray-700 bg-orange-50 rounded p-2">
                                                                    {log.work_pending}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {(log.before_photos?.length > 0 || log.after_photos?.length > 0) && (
                                                            <div className="mb-3">
                                                                <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                                                                    <Camera className="w-3 h-3" />
                                                                    Fotografías de esta actualización:
                                                                </p>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {log.before_photos?.map((photo, photoIdx) => (
                                                                        <div key={`before-${photoIdx}`} className="relative">
                                                                            <img 
                                                                                src={photo} 
                                                                                alt="Antes" 
                                                                                className="w-full h-24 object-cover rounded border-2 border-blue-200"
                                                                            />
                                                                            <Badge className="absolute top-1 left-1 text-xs bg-blue-500">
                                                                                Antes
                                                                            </Badge>
                                                                        </div>
                                                                    ))}
                                                                    {log.after_photos?.map((photo, photoIdx) => (
                                                                        <div key={`after-${photoIdx}`} className="relative">
                                                                            <img 
                                                                                src={photo} 
                                                                                alt="Después" 
                                                                                className="w-full h-24 object-cover rounded border-2 border-green-200"
                                                                            />
                                                                            <Badge className="absolute top-1 left-1 text-xs bg-green-500">
                                                                                Después
                                                                            </Badge>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {log.next_follow_up_date && (
                                                            <div className="mb-2">
                                                                <p className="text-xs text-gray-600">
                                                                    📅 Próximo seguimiento: <span className="font-semibold">{format(new Date(log.next_follow_up_date), "dd MMMM yyyy", { locale: es })}</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                        
                                                        {log.updated_by && (
                                                            <div className="pt-2 border-t border-gray-200 mt-2">
                                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <User className="w-3 h-3" />
                                                                    Actualizado por: <span className="font-medium">{log.updated_by}</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 6. PAGOS */}
                    <Card className="border-2 border-teal-500">
                        <CardHeader className="bg-teal-500 text-white">
                            <div className="flex justify-between items-center">
                                <CardTitle>💰 Pagos del Servicio</CardTitle>
                                {canEdit && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setShowPaymentModal(true)}
                                        className="bg-white text-green-700 hover:bg-gray-100"
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Registrar Pago
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="bg-white rounded-lg p-4 mb-4 border-2 border-gray-200">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Monto Total</p>
                                        <p className="text-2xl font-bold text-proman-navy">${finalAmount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Pagado</p>
                                        <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Pendiente</p>
                                        <p className="text-2xl font-bold text-red-600">${remainingAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {payments.length > 0 ? (
                                <div className="space-y-2">
                                    {payments.map((payment) => (
                                        <div key={payment.id} className="bg-gray-50 rounded-lg p-3 border">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-5 h-5 text-green-600" />
                                                    <span className="font-bold text-lg">${payment.amount_paid}</span>
                                                </div>
                                                <Badge className="bg-blue-100 text-blue-800">
                                                    {payment.payment_method}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1">
                                                <div>📅 {format(new Date(payment.payment_date), "dd 'de' MMMM, yyyy", { locale: es })}</div>
                                                {payment.transaction_id && <div>ID: {payment.transaction_id}</div>}
                                                {payment.notes && <div className="italic">"{payment.notes}"</div>}
                                                <div className="text-gray-500">Por: {payment.recorded_by}</div>
                                            </div>
                                            {payment.confirmation_url && (
                                                <a href={payment.confirmation_url} target="_blank" rel="noopener noreferrer">
                                                    <Button type="button" size="sm" variant="outline" className="w-full mt-2">
                                                        <ExternalLink className="w-3 h-3 mr-1" />
                                                        Ver Comprobante
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 text-sm py-4">No hay pagos registrados</p>
                            )}
                        </CardContent>
                    </Card>

                    {inquiry.satisfaction_rating && (
                        <Card>
                            <CardHeader><CardTitle>Resultado de Encuesta</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 mb-2">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-5 h-5 ${i <= inquiry.satisfaction_rating ? 'text-proman-yellow fill-proman-yellow' : 'text-gray-300'}`} />)}
                                    <span className="font-bold text-lg">{inquiry.satisfaction_rating}/5</span>
                                </div>
                                <p className="text-gray-600 italic">"{inquiry.satisfaction_comment || 'Sin comentario.'}"</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* 8. HISTORIAL */}
                    {progressLogs.length > 0 && (
                        <Card className="border-2 border-green-500">
                            <CardHeader className="bg-green-500 text-white">
                                <CardTitle className="flex items-center justify-between">
                                    <span>📊 Historial de Trabajo</span>
                                    <Badge className="bg-white text-green-700">{progressLogs.length} actualizaciones</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {workStats && (
                                    <div className="bg-white rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center"><p className="text-2xl font-bold text-green-600">{workStats.currentProgress}%</p><p className="text-xs text-gray-600">Avance</p></div>
                                        <div className="text-center"><p className="text-2xl font-bold text-orange-600">{workStats.totalHoursWorked}h</p><p className="text-xs text-gray-600">Trabajadas</p></div>
                                        <div className="text-center"><p className="text-2xl font-bold text-blue-600">{workStats.totalUpdates}</p><p className="text-xs text-gray-600">Updates</p></div>
                                        <div className="text-center"><p className="text-2xl font-bold text-purple-600">{workStats.daysPassed}</p><p className="text-xs text-gray-600">Días</p></div>
                                    </div>
                                )}
                                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                    {progressLogs.map((log, idx) => (
                                        <div key={log.id} className="bg-white rounded-lg border p-3 text-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge className={idx === 0 ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>{log.progress_percentage}%</Badge>
                                                <span className="text-xs text-gray-500">{format(new Date(log.created_date), "dd MMM", { locale: es })}</span>
                                            </div>
                                            {log.work_done && <p className="text-gray-700 mb-1"><span className="text-green-700 font-medium">✓</span> {log.work_done}</p>}
                                            {log.work_pending && <p className="text-gray-600 text-xs"><span className="text-orange-600">⏳</span> {log.work_pending}</p>}
                                            {log.hours_worked > 0 && <p className="text-xs text-gray-500 mt-1">{log.hours_worked}h trabajadas</p>}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ACCIONES CON CLIENTE */}
                    {canEdit && (
                        <Card>
                            <CardHeader><CardTitle>Acciones con Cliente</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <a href={getWhatsAppUpdateLink(formData)} target="_blank" rel="noopener noreferrer" className="block">
                                    <Button type="button" variant="outline" className="w-full"><MessageCircle className="w-4 h-4 mr-2" />Notificar Avance</Button>
                                </a>
                                {inquiry.status === 'completado' && (
                                    <div>
                                        <Label className="text-sm font-medium">Enlace de Encuesta:</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input readOnly value={getSurveyLink(inquiry.id)} className="text-xs" />
                                            <Button type="button" size="icon" onClick={() => navigator.clipboard.writeText(getSurveyLink(inquiry.id))}><Copy className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            
            {canEdit && (
                              <div className="flex justify-between pt-4">
                                  {isAdmin && (
                                      <Button 
                                          type="button" 
                                          variant="destructive"
                                          onClick={() => {
                                              if (window.confirm('¿Estás seguro de eliminar este trabajo? Esta acción no se puede deshacer.')) {
                                                  onDelete(inquiry.id);
                                              }
                                          }}
                                      >
                                          Eliminar Trabajo
                                      </Button>
                                  )}
                                  <Button type="submit" className="bg-proman-yellow text-proman-navy hover:opacity-90 ml-auto" disabled={isUpdating || isUploading}>
                                      {isUpdating || isUploading ? "Guardando..." : "Guardar Cambios"}
                                  </Button>
                              </div>
                            )}

            {showPaymentModal && (
                <Dialog open={showPaymentModal} onOpenChange={() => setShowPaymentModal(false)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Registrar Pago</DialogTitle>
                        </DialogHeader>
                        <QuickPaymentForm
                            onSubmit={createPayment.mutate}
                            isSubmitting={createPayment.isPending}
                            onCancel={() => setShowPaymentModal(false)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </form>
    );
}

function InquiryCreateForm({ customers, onSubmit, isSubmitting, onCancel }) {
    const [step, setStep] = useState('selectCustomer');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [newCustomerData, setNewCustomerData] = useState({
        full_name: '',
        phone: '',
        customer_type: 'residencial',
        addresses: [{ label: 'Principal', location: 'San Salvador', is_primary: true }]
    });
    
    const [formData, setFormData] = useState({ 
        rubro: '', 
        service_type: '',
        location: '',
        quote_amount: '',
        assigned_to: '',
        scheduled_date: '',
        scheduled_start_time: '',
        estimated_duration_hours: '',
        message: ''
    });
    const [selectedService, setSelectedService] = useState(null);
    
    const queryClient = useQueryClient();

    const { data: services, isLoading: loadingServices } = useQuery({
        queryKey: ['services'],
        queryFn: () => base44.entities.Service.list(),
        initialData: [],
    });

    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.User.filter({ employee_type: 'Empleado' }),
        initialData: [],
    });

    const createCustomer = useMutation({
        mutationFn: (data) => base44.entities.Customer.create(data),
        onSuccess: (newCustomer) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            setSelectedCustomer(newCustomer);
            const primaryAddress = newCustomer.addresses?.find(a => a.is_primary) || newCustomer.addresses?.[0];
            if (primaryAddress) {
                setFormData(prev => ({ ...prev, location: primaryAddress.location }));
            }
            setStep('createJob');
        },
    });

    const filteredCustomers = customers.filter(c =>
        c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.location) {
            alert('⚠️ Debes seleccionar el departamento donde se realizará el trabajo');
            return;
        }
        if (!formData.rubro) {
            alert('⚠️ Debes seleccionar el rubro del servicio');
            return;
        }
        
        console.log('Datos del trabajo a crear:', {
            location: formData.location,
            rubro: formData.rubro,
            customer_id: selectedCustomer?.id
        });
        
        const jobData = {
            ...formData,
            customer_id: selectedCustomer?.id,
            client_name: selectedCustomer?.full_name,
            phone: selectedCustomer?.phone,
            status: 'nuevo'
        };
        
        console.log('JobData completo:', jobData);
        onSubmit(jobData);
    };

    React.useEffect(() => {
        if (selectedCustomer && step === 'createJob') {
            const primaryAddress = selectedCustomer.addresses?.find(a => a.is_primary) || selectedCustomer.addresses?.[0];
            if (primaryAddress && !formData.location) {
                setFormData(prev => ({ ...prev, location: primaryAddress.location }));
            }
        }
    }, [selectedCustomer, step, formData.location]);

    const allRubros = ["Hogar", "Comercial", "Restaurantes", "Hospitales", "Emergencias"];
    const departamentos = [
        "Ahuachapán", "Santa Ana", "Sonsonate", "La Libertad", "San Salvador",
        "Chalatenango", "Cuscatlán", "La Paz", "Cabañas", "San Vicente",
        "Usulután", "San Miguel", "Morazán", "La Unión"
    ];
    
    const filteredServices = formData.rubro 
        ? services.filter(s => s.rubros?.includes(formData.rubro))
        : services;

    if (step === 'selectCustomer') {
        return (
            <div className="space-y-4 pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>📋 Paso 1:</strong> Busca al cliente en la base de datos o crea uno nuevo
                    </p>
                </div>

                <Input 
                    placeholder="Buscar cliente por nombre o teléfono..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    autoFocus
                />

                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                            <div 
                                key={customer.id}
                                className="p-4 border-2 rounded-lg hover:border-proman-yellow cursor-pointer transition-all"
                                onClick={() => {
                                    setSelectedCustomer(customer);
                                    setStep('createJob');
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-proman-navy">{customer.full_name}</div>
                                        <div className="text-sm text-gray-600">{customer.phone}</div>
                                        <div className="flex gap-2 mt-1">
                                           <Badge className={
                                               customer.customer_type === "residencial" ? "bg-blue-100 text-blue-800" :
                                               customer.customer_type === "comercial" ? "bg-indigo-100 text-indigo-800" :
                                               "bg-purple-100 text-purple-800"
                                           }>
                                               {customer.customer_type}
                                           </Badge>
                                           {customer.is_vip && (
                                               <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>
                                           )}
                                           {customer.is_emergency && (
                                               <Badge className="bg-red-100 text-red-800">
                                                   <AlertCircle className="w-3 h-3 mr-1" />
                                                   EMERGENCIA
                                               </Badge>
                                           )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 text-right">
                                        <div>{customer.total_jobs || 0} trabajos</div>
                                        <div>${customer.total_spent || 0}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        customerSearch && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No se encontró cliente con "{customerSearch}"</p>
                            </div>
                        )
                    )}
                     {!customerSearch && customers.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p>No hay clientes registrados.</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                        Cancelar
                    </Button>
                    <Button 
                        type="button" 
                        onClick={() => setStep('createCustomer')}
                        className="flex-1 bg-proman-yellow text-proman-navy"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Crear Cliente Nuevo
                    </Button>
                </div>
            </div>
        );
    }

    if (step === 'createCustomer') {
        return (
            <div className="space-y-4 pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>📋 Paso 2:</strong> Completa los datos del nuevo cliente
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Nombre Completo *" 
                        value={newCustomerData.full_name}
                        onChange={(e) => setNewCustomerData({...newCustomerData, full_name: e.target.value})}
                        required
                    />
                    <InputField 
                        label="Teléfono *" 
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                        required
                    />
                </div>

                <SelectField 
                    label="Tipo de Cliente"
                    value={newCustomerData.customer_type}
                    onValueChange={(v) => setNewCustomerData({...newCustomerData, customer_type: v})}
                    options={[
                        {value: 'residencial', label: 'Residencial'},
                        {value: 'comercial', label: 'Comercial'},
                        {value: 'corporativo', label: 'Corporativo'}
                    ]}
                />

                <SelectField 
                    label="Departamento Principal"
                    value={newCustomerData.addresses[0].location}
                    onValueChange={(v) => {
                        const newAddresses = [...newCustomerData.addresses];
                        newAddresses[0].location = v;
                        setNewCustomerData({...newCustomerData, addresses: newAddresses});
                    }}
                    options={departamentos.map(d => ({value: d, label: d}))}
                />

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setStep('selectCustomer')}>
                        Atrás
                    </Button>
                    <Button 
                        type="button"
                        onClick={() => createCustomer.mutate(newCustomerData)}
                        className="flex-1 bg-proman-yellow text-proman-navy"
                        disabled={!newCustomerData.full_name || !newCustomerData.phone || createCustomer.isPending}
                    >
                        {createCustomer.isPending ? "Creando..." : "Crear Cliente y Continuar"}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm text-green-800 mb-2">
                            <strong>✅ Cliente seleccionado:</strong> {selectedCustomer.full_name}
                        </p>
                        <div className="text-xs text-gray-600 space-y-1">
                            <div>📞 {selectedCustomer.phone}</div>
                            {selectedCustomer.email && <div>📧 {selectedCustomer.email}</div>}
                            <div>🏢 {selectedCustomer.customer_type}</div>
                            {(selectedCustomer.is_emergency || formData.rubro === 'Emergencias') && (
                                <Badge className="bg-red-100 text-red-800 mt-1">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    EMERGENCIA
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Button 
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setSelectedCustomer(null);
                            setFormData({rubro: '', service_type: '', location: '', quote_amount: '', assigned_to: '', scheduled_date: '', scheduled_start_time: '', estimated_duration_hours: '', message: ''});
                            setStep('selectCustomer');
                        }}
                    >
                        Cambiar
                    </Button>
                </div>
            </div>

            <div className="border-t pt-4">
                <h3 className="font-semibold text-proman-navy mb-3">📍 Ubicación del Trabajo</h3>
                
                <div className="space-y-3">
                    <div>
                        <Label className="block text-sm font-medium text-proman-navy mb-2">
                            Departamento del Trabajo <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={formData.location}
                            onValueChange={(v) => setFormData({...formData, location: v})}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar departamento" />
                            </SelectTrigger>
                            <SelectContent>
                                {departamentos.map(dept => (
                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800 font-medium mb-2">
                                💡 Direcciones guardadas del cliente (click para seleccionar):
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {selectedCustomer.addresses.map((addr, idx) => (
                                    <Button
                                        key={idx}
                                        type="button"
                                        size="sm"
                                        variant={formData.location === addr.location ? "default" : "outline"}
                                        onClick={() => setFormData({...formData, location: addr.location})}
                                        className={formData.location === addr.location ? "bg-proman-yellow text-proman-navy" : ""}
                                    >
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {addr.label}: {addr.location}
                                        {addr.is_primary && " ⭐"}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t pt-4">
                <h3 className="font-semibold text-proman-navy mb-3">🛠️ Seleccionar Servicio</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <SelectField 
                        label="Rubro" 
                        name="rubro" 
                        value={formData.rubro}
                        onValueChange={(v) => {
                            setFormData({...formData, rubro: v, service_type: ''});
                            setSelectedService(null);
                        }} 
                        options={allRubros.map(r => ({value: r, label: r}))} 
                        required 
                    />
                    
                    <div>
                        <Label className="block text-sm font-medium text-proman-navy mb-2">Servicio del Catálogo</Label>
                        <Select 
                            value={selectedService?.id || ''} 
                            onValueChange={(serviceId) => {
                                const service = services.find(s => s.id === serviceId);
                                if (service) {
                                    setSelectedService(service);
                                    setFormData(prev => ({
                                        ...prev,
                                        service_type: service.service_name,
                                        quote_amount: service.base_price || '',
                                        estimated_duration_hours: service.estimated_hours || ''
                                    }));
                                }
                            }}
                            disabled={!formData.rubro || loadingServices}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar servicio" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredServices.length > 0 ? (
                                    filteredServices.map(service => (
                                        <SelectItem key={service.id} value={service.id}>
                                            {service.service_name} {service.base_price ? `- $${service.base_price}` : ''}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>No hay servicios en este rubro</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {selectedService && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold text-proman-navy mb-2">Servicio Seleccionado:</h4>
                        <p className="text-sm text-gray-700 mb-2">{selectedService.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Precio Base:</span>
                                <span className="font-semibold ml-2">${selectedService.base_price || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Duración:</span>
                                <span className="font-semibold ml-2">{selectedService.estimated_hours}h</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Precio del Servicio ($)" 
                        name="quote_amount" 
                        type="number" 
                        step="0.01"
                        value={formData.quote_amount}
                        onChange={(e) => setFormData({...formData, quote_amount: e.target.value})}
                        placeholder="Ajusta según necesidad"
                    />
                    <InputField 
                        label="Duración Estimada (hrs)" 
                        name="estimated_duration_hours" 
                        type="number" 
                        step="0.5"
                        value={formData.estimated_duration_hours}
                        onChange={(e) => setFormData({...formData, estimated_duration_hours: e.target.value})}
                    />
                </div>
            </div>

            <div className="border-t pt-4">
                <h3 className="font-semibold text-proman-navy mb-3">👤 Asignar Técnico</h3>
                
                <div className="mb-4">
                    <Label className="block text-sm font-medium text-proman-navy mb-2">
                        Técnico Asignado (Email)
                    </Label>
                    <Select
                        value={formData.assigned_to}
                        onValueChange={(v) => setFormData(prev => ({...prev, assigned_to: v}))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar técnico" />
                        </SelectTrigger>
                        <SelectContent>
                            {loadingEmployees ? (
                                <SelectItem value="loading" disabled>Cargando técnicos...</SelectItem>
                            ) : employees.length > 0 ? (
                                employees.map(emp => (
                                    <SelectItem key={emp.email} value={emp.email}>
                                        {emp.employee_name || emp.full_name} ({emp.email})
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>No hay técnicos disponibles</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                        Puedes asignar ahora o programar fecha/hora abajo para ver disponibilidad
                    </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-proman-navy mb-3 text-sm">Programación del Trabajo (Opcional)</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <InputField label="Fecha" name="scheduled_date" type="date" value={formData.scheduled_date} onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})} />
                        <InputField label="Hora Inicio" name="scheduled_start_time" type="time" value={formData.scheduled_start_time} onChange={(e) => setFormData({...formData, scheduled_start_time: e.target.value})} />
                        <div>
                            <Label className="block text-sm font-medium text-proman-navy mb-1">Duración (hrs)</Label>
                            <Input 
                                type="number" 
                                step="0.5"
                                value={formData.estimated_duration_hours}
                                onChange={(e) => setFormData({...formData, estimated_duration_hours: e.target.value})}
                                name="estimated_duration_hours"
                                placeholder="2"
                            />
                        </div>
                    </div>

                    {formData.scheduled_date && formData.scheduled_start_time && formData.estimated_duration_hours && (
                        <div className="border-t pt-4 mt-4">
                            <p className="text-sm font-semibold text-proman-navy mb-3">Verificar Disponibilidad de Técnicos:</p>
                            <EmployeeSelector 
                                selectedDate={formData.scheduled_date}
                                startTime={formData.scheduled_start_time}
                                duration={parseFloat(formData.estimated_duration_hours)}
                                onSelect={(email) => setFormData(prev => ({...prev, assigned_to: email}))}
                                currentAssignee={formData.assigned_to}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div>
                <Label className="block text-sm font-medium text-proman-navy mb-2">Descripción del Problema (Opcional)</Label>
                <Textarea 
                    name="message" 
                    value={formData.message || ''}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    rows={3}
                    placeholder="Detalles adicionales del cliente sobre el problema..."
                />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button 
                    type="submit" 
                    className="bg-proman-yellow text-proman-navy hover:opacity-90" 
                    disabled={isSubmitting || !formData.location || !formData.rubro}
                    onClick={() => console.log('🖱️ Botón clickeado. Estado:', { isSubmitting, location: formData.location, rubro: formData.rubro })}
                >
                    {isSubmitting ? "Creando..." : "Crear Trabajo"}
                </Button>
            </div>
        </form>
    );
}

const InputField = ({ label, ...props }) => <div><Label className="block text-sm font-medium text-proman-navy mb-1">{label}</Label><Input {...props} /></div>;
const SelectField = ({ label, options, ...props }) => <div><Label className="block text-sm font-medium text-proman-navy mb-1">{label}</Label><Select {...props}><SelectTrigger><SelectValue placeholder={`Seleccionar ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>;
const InfoRow = ({ label, value }) => <div className="flex justify-between"><span className="text-gray-600">{label}:</span><span className="font-medium text-right">{value}</span></div>;

const ImageUploader = ({ label, imageUrl, onFileSelect, isUploading, disabled }) => {
    return (
        <div className="space-y-2">
            <Label className="block text-sm font-medium text-proman-navy">{label}</Label>
            <div className="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center relative">
                {imageUrl ? <img src={imageUrl} alt={label} className="w-full h-full object-contain rounded-lg" /> : <Camera className="w-8 h-8 text-gray-300"/>}
                {!disabled && <Input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => onFileSelect(e.target.files[0])} />}
                {isUploading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><p>Subiendo...</p></div>}
            </div>
        </div>
    );
};





function GenerateInvoiceButton({ inquiry }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const queryClient = useQueryClient();

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        
        try {
            const response = await base44.functions.invoke('generateInvoice', {
                inquiryId: inquiry.id,
                invoiceDate: invoiceDate
            });

            if (response.data.success) {
                await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
                await queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });
                
                // Abrir PDF en nueva pestaña
                window.open(response.data.pdf_url, '_blank');
            } else {
                setError('Error al generar factura');
            }
        } catch (err) {
            setError('Error al generar factura: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-2">
            <div>
                <Label className="text-sm font-medium text-proman-navy">Fecha de Factura</Label>
                <Input 
                    type="date" 
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="mt-1"
                />
            </div>
            <Button 
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-proman-yellow text-proman-navy hover:opacity-90"
            >
                <FileDown className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generando Factura...' : 'Generar Factura con IVA'}
            </Button>
            {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
            {inquiry.quote_pdf_url && (
                <a href={inquiry.quote_pdf_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                    <Button type="button" variant="outline" size="sm" className="w-full text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Ver Última Factura Generada
                    </Button>
                </a>
            )}
        </div>
    );
}



function QuickPaymentForm({ onSubmit, isSubmitting, onCancel }) {
    const [formData, setFormData] = useState({
        amount_paid: "",
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: "efectivo",
        transaction_id: "",
        confirmation_url: "",
        notes: ""
    });
    const [confirmationFile, setConfirmationFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (file) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData(prev => ({ ...prev, confirmation_url: file_url }));
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    React.useEffect(() => {
        if (confirmationFile) {
            handleFileUpload(confirmationFile);
        }
    }, [confirmationFile]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="block text-sm font-medium text-proman-navy mb-2">
                        Monto Pagado ($) *
                    </Label>
                    <Input
                        type="number"
                        step="0.01"
                        required
                        value={formData.amount_paid}
                        onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                        placeholder="0.00"
                    />
                </div>

                <div>
                    <Label className="block text-sm font-medium text-proman-navy mb-2">
                        Fecha de Pago *
                    </Label>
                    <Input
                        type="date"
                        required
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <Label className="block text-sm font-medium text-proman-navy mb-2">
                    Método de Pago *
                </Label>
                <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    required
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="deposito">Depósito</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="block text-sm font-medium text-proman-navy mb-2">
                    ID de Transacción (Opcional)
                </Label>
                <Input
                    value={formData.transaction_id}
                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    placeholder="Ej: TRANS-12345"
                />
            </div>

            <div>
                <Label className="block text-sm font-medium text-proman-navy mb-2">
                    Comprobante de Pago (Opcional)
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {formData.confirmation_url ? (
                        <div className="space-y-2">
                            <img 
                                src={formData.confirmation_url} 
                                alt="Comprobante" 
                                className="max-h-32 mx-auto rounded"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setFormData({ ...formData, confirmation_url: "" })}
                            >
                                Cambiar imagen
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                            <p className="text-sm text-gray-600">Subir captura o recibo</p>
                            <Input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => setConfirmationFile(e.target.files[0])}
                                disabled={isUploading}
                                className="cursor-pointer"
                            />
                            {isUploading && <p className="text-xs text-blue-600">Subiendo...</p>}
                        </div>
                    )}
                </div>
            </div>

            <div>
                <Label className="block text-sm font-medium text-proman-navy mb-2">
                    Notas (Opcional)
                </Label>
                <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Información adicional sobre el pago..."
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    className="bg-proman-yellow text-proman-navy hover:opacity-90"
                    disabled={isSubmitting || isUploading}
                >
                    {isSubmitting ? "Registrando..." : "Registrar Pago"}
                </Button>
            </div>
        </form>
    );
}