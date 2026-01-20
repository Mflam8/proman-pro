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
import { Phone, MapPin, FileText, Clock, AlertCircle, User, Star, DollarSign, Building, Home as HomeIcon, Bot, Plus } from "lucide-react";
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
      const newInquiry = await base44.entities.ClientInquiry.create(data);
      
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
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowCreateModal(false);
    },
  });

  const getCustomerForInquiry = (inquiry) => {
    if (inquiry.customer_id) {
      return customers.find(c => c.id === inquiry.customer_id);
    }
    return null;
  };
  
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
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Portal de Gestión</h1>
            <p className="text-gray-200">
              {isAdmin ? 'Administra trabajos, clientes y empleados' : 'Gestiona trabajos y clientes'}
            </p>
          </div>
          <div className="flex gap-3">
            {(isAdmin || isSupervisor) && (
              <a href={base44.agents.getWhatsAppConnectURL('gestionBot')} target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-500 hover:bg-green-600 text-white">
                  <Bot className="w-4 h-4 mr-2" />Bot de Gestión por WhatsApp
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
                      <button onClick={() => setActiveTab("all")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "all" ? "bg-white text-proman-navy shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>Todos</button>
                      <button onClick={() => setActiveTab("nuevo")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "nuevo" ? "bg-white text-proman-navy shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>Nuevos</button>
                      <button onClick={() => setActiveTab("activos")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "activos" ? "bg-white text-proman-navy shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>Activos</button>
                      <button onClick={() => setActiveTab("completado")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "completado" ? "bg-white text-proman-navy shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>Completados</button>
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
                  <Card key={inquiry.id} className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-proman-yellow" onClick={() => setSelectedInquiry(inquiry)}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                              <User className="w-6 h-6 text-proman-navy" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-xl font-bold text-proman-navy">{displayName}</h3>
                                {customer && <Badge className="bg-green-100 text-green-800"><User className="w-3 h-3 mr-1" />Cliente Registrado</Badge>}
                                {customer?.customer_type && (
                                  <Badge className={customer.customer_type === "residencial" ? "bg-blue-100 text-blue-800" : customer.customer_type === "comercial" ? "bg-indigo-100 text-indigo-800" : "bg-purple-100 text-purple-800"}>
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
                                {inquiry.satisfaction_rating && <Badge className="bg-yellow-100 text-yellow-800"><Star className="w-3 h-3 mr-1"/> {inquiry.satisfaction_rating}/5</Badge>}
                                {inquiry.payment_status === 'pendiente' && <Badge className="bg-red-100 text-red-800"><DollarSign className="w-3 h-3 mr-1"/> Pendiente de Pago</Badge>}
                                {inquiry.payment_status === 'parcial' && <Badge className="bg-orange-100 text-orange-800"><DollarSign className="w-3 h-3 mr-1"/> Pago Parcial</Badge>}
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-proman-yellow" /><span>{displayPhone}</span></div>
                            <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-proman-yellow" /><span>{inquiry.location}</span></div>
                            <div className="flex items-center gap-2 text-gray-600"><FileText className="w-4 h-4 text-proman-yellow" /><span>{inquiry.rubro ? `${inquiry.rubro} - ` : ''}{inquiry.service_type}</span></div>
                            {inquiry.preferred_time && <div className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4 text-proman-yellow" /><span>{inquiry.preferred_time}</span></div>}
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
            {filteredInquiries.length === 0 && !isLoadingInquiries && <p className="text-center text-gray-500 mt-8">No se encontraron solicitudes.</p>}
            {isLoadingInquiries && <p className="text-center text-gray-500 mt-8">Cargando solicitudes...</p>}
          </TabsContent>

          <TabsContent value="calendario">
            <ScheduleCalendar onSelectJob={(job) => setSelectedInquiry(job)} />
          </TabsContent>

          <TabsContent value="clientes">
            <CustomerManagement />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="servicios"><ServiceManagement /></TabsContent>
              <TabsContent value="pagos"><PaymentManagement /></TabsContent>
              <TabsContent value="inventario"><EquipmentManagement /></TabsContent>
              <TabsContent value="empleados"><EmployeeManagement /></TabsContent>
              <TabsContent value="reportes"><ReportsManagement /></TabsContent>
              <TabsContent value="automatizaciones"><AutomationsControlPanel /></TabsContent>
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