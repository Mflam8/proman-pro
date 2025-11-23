import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { createPageUrl } from "@/utils";
import {
  Phone, MapPin, Clock, FileText, CheckCircle, AlertCircle, Calendar, DollarSign, User, Filter, Percent, Camera, MessageCircle, Star, Copy, ExternalLink, UserPlus, Edit2, Building, Home as HomeIcon, ClipboardCheck, FileCheck, ThumbsUp, FileDown, Plus
} from "lucide-react";
import { format, parseISO, addHours } from "date-fns";
import { es } from "date-fns/locale";
import EmployeeManagement from "../components/admin/EmployeeManagement";
import ServiceManagement from "../components/admin/ServiceManagement";
import CustomerManagement from "../components/admin/CustomerManagement";
import EquipmentManagement from "../components/admin/EquipmentManagement";
import PaymentManagement from "../components/admin/PaymentManagement";
import BillingDetails from "../components/admin/BillingDetails";

const statusConfig = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  evaluacion_agendada: { label: "Evaluación Agendada", color: "bg-indigo-100 text-indigo-800", icon: Calendar },
  evaluacion_pendiente: { label: "Evaluación Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  evaluacion_realizada: { label: "Evaluación Realizada", color: "bg-green-100 text-green-800", icon: ClipboardCheck },
  cotizacion_pendiente: { label: "Cotización Pendiente", color: "bg-orange-100 text-orange-800", icon: FileText },
  cotizacion_realizada: { label: "Cotización Realizada", color: "bg-purple-100 text-purple-800", icon: FileCheck },
  trabajo_aprobado: { label: "Trabajo Aprobado", color: "bg-teal-100 text-teal-800", icon: ThumbsUp },
  en_proceso: { label: "Trabajo en Proceso", color: "bg-blue-100 text-blue-800", icon: Clock },
  completado: { label: "Trabajo Completado", color: "bg-green-100 text-green-800", icon: CheckCircle }
};

const priorityConfig = {
  baja: { label: "Baja", color: "bg-gray-100 text-gray-700" },
  media: { label: "Media", color: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-700" }
};

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
    queryFn: () => {
      const orderBy = sortOrder === "desc" ? '-created_date' : 'created_date';
      return base44.entities.ClientInquiry.filter({}, orderBy);
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
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
    }
  });

  const getCustomerForInquiry = (inquiry) => {
    if (inquiry.customer_id) {
      return customers.find(c => c.id === inquiry.customer_id);
    }
    return null;
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesTab = activeTab === "all" || inquiry.status === activeTab;
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
    evaluacion_pendiente: inquiries.filter(i => i.status === "evaluacion_pendiente" || i.status === "evaluacion_agendada").length,
    cotizacion_pendiente: inquiries.filter(i => i.status === "cotizacion_pendiente").length,
    en_proceso: inquiries.filter(i => i.status === "en_proceso").length
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
          {mainTab === "trabajos" && (
            <Button onClick={() => setShowCreateModal(true)} className="bg-proman-yellow text-proman-navy hover:opacity-90">
                Nuevo Trabajo
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={mainTab} onValueChange={setMainTab} className="mb-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="trabajos" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
              📋 Gestión de Trabajos
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
              </>
            )}
          </TabsList>

          <TabsContent value="trabajos">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-proman-navy">{stats.total}</div><div className="text-sm text-gray-600">Total</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-blue-600">{stats.nuevo}</div><div className="text-sm text-gray-600">Nuevos</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-yellow-600">{stats.evaluacion_pendiente}</div><div className="text-sm text-gray-600">Evaluaciones</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-orange-600">{stats.cotizacion_pendiente}</div><div className="text-sm text-gray-600">Cotizaciones</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold text-indigo-600">{stats.en_proceso}</div><div className="text-sm text-gray-600">En Proceso</div></CardContent></Card>
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
                    <div className="inline-flex bg-gray-100 rounded-lg p-1">
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
                        onClick={() => setActiveTab("en_proceso")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeTab === "en_proceso"
                            ? "bg-white text-proman-navy shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        En Proceso
                      </button>
                      <button
                        onClick={() => setActiveTab("completado")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeTab === "completado"
                            ? "bg-white text-proman-navy shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Completado
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

function InquiryDetailForm({ inquiry, customer, customers, onUpdate, isUpdating, isAdmin, isSupervisor, getSurveyLink, getWhatsAppUpdateLink }) {
    const canEdit = isAdmin || isSupervisor;
    const [showCustomerEdit, setShowCustomerEdit] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const queryClient = useQueryClient();
    
    const [formData, setFormData] = useState({
        ...inquiry,
        scheduled_date: inquiry.scheduled_date || '',
        scheduled_start_time: inquiry.scheduled_start_time || '',
        estimated_duration_hours: inquiry.estimated_duration_hours || '',
        quote_pdf_url: inquiry.quote_pdf_url || '',
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
    const finalAmount = calculatedFinalAmount > 0 ? calculatedFinalAmount : (currentInquiry?.final_amount || currentInquiry?.quote_amount || formData.final_amount || formData.quote_amount || 0);
    const remainingAmount = finalAmount - totalPaid;

    useEffect(() => {
        setFormData({
            ...inquiry,
            scheduled_date: inquiry.scheduled_date || '',
            scheduled_start_time: inquiry.scheduled_start_time || '',
            estimated_duration_hours: inquiry.estimated_duration_hours || '',
            quote_pdf_url: inquiry.quote_pdf_url || '',
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const { id, ...updateData } = formData;
            
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
        
        return {
            totalUpdates: progressLogs.length,
            daysPassed: daysPassed,
            startDate: startDate,
            lastUpdate: lastUpdate,
            currentProgress: lastLog.progress_percentage
        };
    }, [progressLogs]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card className="border-2 border-blue-500 bg-blue-50/30">
                        <CardHeader className="bg-blue-500 text-white">
                            <CardTitle className="flex items-center gap-2">
                                👷 Actualización de Progreso del Trabajo
                            </CardTitle>
                            <p className="text-xs text-blue-100 mt-1">
                                Cada cambio que guardes se registrará automáticamente en el historial
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-proman-navy mb-2">Porcentaje de Avance: {formData.progress_percentage || 0}%</label>
                                <Slider
                                    value={[formData.progress_percentage || 0]}
                                    onValueChange={(val) => setFormData(prev => ({...prev, progress_percentage: val[0]}))}
                                    max={100} step={10}
                                    disabled={isUpdating || !canEdit}
                                />
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
                                    <div className="bg-white rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-600">{workStats.currentProgress}%</p>
                                            <p className="text-xs text-gray-600">Avance Actual</p>
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
                                                            <div>
                                                                <Badge className={
                                                                    isFirst ? "bg-blue-500 text-white" :
                                                                    isLast ? "bg-green-500 text-white" :
                                                                    "bg-gray-500 text-white"
                                                                }>
                                                                    {isFirst && "🏁 Inicio"}
                                                                    {isLast && "✅ Última actualización"}
                                                                    {!isFirst && !isLast && `Actualización ${progressLogs.length - idx}`}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs font-semibold text-gray-700">
                                                                    {format(new Date(log.created_date), "dd MMM yyyy", { locale: es })}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {format(new Date(log.created_date), "HH:mm", { locale: es })}
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

                    {canEdit && (
                        <Card className="border-2 border-purple-500 bg-purple-50/30">
                            <CardHeader className="bg-purple-500 text-white">
                                <CardTitle>⚙️ Panel de Gestión Administrativa</CardTitle>
                                <p className="text-xs text-purple-100 mt-1">
                                    Solo para administradores: gestiona estados, programación y asignaciones
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="block text-sm font-medium text-proman-navy mb-2">Estado</Label>
                                        <Select value={formData.status} onValueChange={(v) => setFormData(p => ({...p, status: v}))} disabled={isUpdating}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(statusConfig).map(([k, v]) => (
                                                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="block text-sm font-medium text-proman-navy mb-2">Prioridad</Label>
                                        <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({...p, priority: v}))} disabled={isUpdating}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(priorityConfig).map(([k, v]) => (
                                                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-semibold text-proman-navy mb-3">Programación del Trabajo</h3>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <Label className="block text-sm font-medium text-proman-navy mb-1">Fecha</Label>
                                            <Input 
                                                type="date" 
                                                value={formData.scheduled_date || ''} 
                                                onChange={(e) => setFormData(p => ({...p, scheduled_date: e.target.value}))}
                                                disabled={isUpdating}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium text-proman-navy mb-1">Hora Inicio</Label>
                                            <Input 
                                                type="time" 
                                                value={formData.scheduled_start_time || ''} 
                                                onChange={(e) => setFormData(p => ({...p, scheduled_start_time: e.target.value}))}
                                                disabled={isUpdating}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium text-proman-navy mb-1">Duración (hrs)</Label>
                                            <Input 
                                                type="number" 
                                                step="0.5"
                                                value={formData.estimated_duration_hours || ''} 
                                                onChange={(e) => setFormData(p => ({...p, estimated_duration_hours: parseFloat(e.target.value)}))}
                                                disabled={isUpdating}
                                                placeholder="2"
                                            />
                                        </div>
                                    </div>

                                    <EmployeeSelector 
                                        selectedDate={formData.scheduled_date}
                                        startTime={formData.scheduled_start_time}
                                        duration={formData.estimated_duration_hours}
                                        onSelect={(email) => setFormData(p => ({...p, assigned_to: email}))}
                                        currentAssignee={formData.assigned_to}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <InputField label="Monto Cotización ($)" name="quote_amount" type="number" value={formData.quote_amount} onChange={(e) => setFormData(p => ({...p, quote_amount: e.target.value}))} disabled={isUpdating} />
                                    <InputField label="Monto Final ($)" name="final_amount" type="number" value={formData.final_amount} onChange={(e) => setFormData(p => ({...p, final_amount: e.target.value}))} disabled={isUpdating} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="block text-sm font-medium text-proman-navy mb-1">Estado de Pago</Label>
                                        <Select
                                            value={formData.payment_status || 'pendiente'}
                                            onValueChange={(v) => setFormData(p => ({...p, payment_status: v}))}
                                            disabled={isUpdating}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Estado de pago" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                                <SelectItem value="parcial">Parcial</SelectItem>
                                                <SelectItem value="pagado">Pagado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="block text-sm font-medium text-proman-navy mb-1">Técnico Asignado</Label>
                                        <Input 
                                            value={formData.assigned_to || ''} 
                                            disabled 
                                            placeholder="Selecciona arriba por disponibilidad"
                                            className="bg-gray-50"
                                        />
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t">
                                    <Label className="block text-sm font-medium text-proman-navy mb-2">
                                        📄 Enlace PDF de Cotización
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={formData.quote_pdf_url || ''} 
                                            onChange={(e) => setFormData(p => ({...p, quote_pdf_url: e.target.value}))}
                                            placeholder="https://ejemplo.com/cotizacion.pdf"
                                            disabled={isUpdating}
                                        />
                                        {formData.quote_pdf_url && (
                                            <a 
                                                href={formData.quote_pdf_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Button type="button" size="icon" variant="outline">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Pega aquí el enlace del PDF de la cotización que enviaste al cliente
                                    </p>
                                </div>
                                
                                <Textarea name="notes" placeholder="Notas internas administrativas..." value={formData.notes || ''} onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))} rows={2} disabled={isUpdating} />
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
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
                                        Cambiar Cliente
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {customer ? (
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge className="bg-green-100 text-green-800">
                                            Cliente Registrado en Base de Datos
                                        </Badge>
                                        {customer.is_vip && (
                                            <Badge className="bg-yellow-100 text-yellow-800">
                                                <Star className="w-3 h-3 mr-1" />
                                                VIP
                                            </Badge>
                                        )}
                                    </div>
                                    <InfoRow label="Nombre" value={customer.full_name} />
                                    <InfoRow label="Teléfono Principal" value={customer.phone} />
                                    {customer.secondary_phone && (
                                        <InfoRow label="Teléfono Secundario" value={customer.secondary_phone} />
                                    )}
                                    {customer.email && (
                                        <InfoRow label="Email" value={customer.email} />
                                    )}
                                    <InfoRow label="Tipo" value={customer.customer_type} />
                                    {customer.addresses && customer.addresses.length > 0 && (
                                        <div className="pt-2 border-t">
                                            <span className="text-gray-600 font-medium">Direcciones:</span>
                                            {customer.addresses.map((addr, idx) => (
                                                <div key={idx} className="ml-4 mt-1 text-xs text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{addr.label}:</span> {addr.location}
                                                        {addr.is_primary && <Badge className="ml-2 text-xs bg-green-100 text-green-800">Principal</Badge>}
                                                        {addr.map_url && (
                                                            <a 
                                                                href={addr.map_url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <MapPin className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="pt-2 border-t">
                                        <InfoRow label="Total Trabajos" value={`${customer.total_jobs || 0} trabajos`} />
                                        <InfoRow label="Total Gastado" value={`$${customer.total_spent || 0}`} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                        <p className="text-xs text-yellow-800">
                                            ⚠️ <strong>Cliente no vinculado:</strong> Este trabajo no está vinculado a un cliente en la base de datos. Datos temporales en el trabajo.
                                        </p>
                                    </div>
                                    <InfoRow label="Nombre" value={inquiry.client_name || "N/A"} />
                                    <InfoRow label="Teléfono" value={inquiry.phone || "N/A"} />
                                    {canEdit && (
                                        <Button 
                                            type="button"
                                            size="sm"
                                            className="w-full mt-3 bg-proman-yellow text-proman-navy"
                                            onClick={() => setShowCustomerEdit(true)}
                                        >
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Vincular con Cliente Existente
                                        </Button>
                                    )}
                                </>
                            )}

                            {showCustomerEdit && (
                                <div className="pt-3 border-t space-y-3">
                                    <Input 
                                        placeholder="Buscar cliente por nombre o teléfono..."
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                    />
                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        {filteredCustomersForSearch.length > 0 ? (
                                            filteredCustomersForSearch.map(c => (
                                                <div 
                                                    key={c.id}
                                                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => handleChangeCustomer(c.id)}
                                                >
                                                    <div className="font-medium">{c.full_name}</div>
                                                    <div className="text-xs text-gray-500">{c.phone} • {c.customer_type}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-500 text-sm">No hay clientes que coincidan.</p>
                                        )}
                                    </div>
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setShowCustomerEdit(false)}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            )}

                            <div className="pt-2 border-t">
                                <InfoRow label="Ubicación del Trabajo" value={currentInquiry?.location || inquiry.location} />
                                <InfoRow label="Servicio" value={`${currentInquiry?.rubro || inquiry.rubro} - ${currentInquiry?.service_type || inquiry.service_type}`} />
                                <InfoRow label="Estado Actual" value={statusConfig[currentInquiry?.status || inquiry.status]?.label || 'N/A'} />
                                <InfoRow label="Recibido" value={format(new Date(inquiry.created_date), "dd MMM yyyy, HH:mm", { locale: es })} />
                                {inquiry.message && <div className="pt-2"><p className="text-gray-600 mt-1 italic">"{inquiry.message}"</p></div>}
                            </div>
                        </CardContent>
                    </Card>

                    <BillingDetails inquiryId={inquiry.id} canEdit={canEdit} inquiry={inquiry} />

                    {canEdit && (
                        <Card>
                            <CardHeader><CardTitle>Acciones con Cliente</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <a href={getWhatsAppUpdateLink(formData)} target="_blank" rel="noopener noreferrer" className="block">
                                    <Button type="button" variant="outline" className="w-full"><MessageCircle className="w-4 h-4 mr-2" />Notificar Avance por WhatsApp</Button>
                                </a>
                                {inquiry.status === 'completado' && (
                                    <>
                                        <GenerateInvoiceButton inquiry={inquiry} />
                                        <div>
                                            <Label className="text-sm font-medium">Enlace de Encuesta:</Label>
                                            <div className="flex gap-2 mt-1">
                                                <Input readOnly value={getSurveyLink(inquiry.id)} className="text-xs" />
                                                <Button type="button" size="icon" onClick={() => navigator.clipboard.writeText(getSurveyLink(inquiry.id))}><Copy className="w-4 h-4" /></Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-2 border-green-500">
                        <CardHeader className="bg-green-500 text-white">
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
                </div>
            </div>
            
            {canEdit && (
              <div className="flex justify-end pt-4">
                  <Button type="submit" className="bg-proman-yellow text-proman-navy hover:opacity-90" disabled={isUpdating || isUploading}>
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
        const jobData = {
            ...formData,
            customer_id: selectedCustomer?.id,
            client_name: selectedCustomer?.full_name,
            phone: selectedCustomer?.phone,
            status: 'nuevo'
        };
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
                            <EmployeeSelectorCreate 
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

function EmployeeSelector({ selectedDate, startTime, duration, onSelect, currentAssignee }) {
    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.User.filter({ employee_type: 'Empleado' }),
        initialData: [],
    });

    const { data: schedules, isLoading: loadingSchedules } = useQuery({
        queryKey: ['employeeSchedules', selectedDate],
        queryFn: async () => {
            if (!selectedDate) return [];
            const allSchedules = await base44.entities.EmployeeSchedule.filter();
            return allSchedules.filter(s => s.date === selectedDate);
        },
        enabled: !!selectedDate,
        initialData: [],
        refetchInterval: 60 * 1000
    });

    const availability = useMemo(() => {
        if (!selectedDate || !startTime || !duration || !employees.length || loadingSchedules) {
            return {};
        }

        const proposedStartDateStr = `${selectedDate}T${startTime}:00`;
        const proposedStart = parseISO(proposedStartDateStr);
        const proposedEnd = addHours(proposedStart, duration);

        const employeeAvailability = {};

        employees.forEach(employee => {
            const employeeSchedules = schedules.filter(s => s.employee_email === employee.email);
            let isAvailable = true;

            for (const schedule of employeeSchedules) {
                const scheduleStart = parseISO(`${schedule.date}T${schedule.start_time}:00`);
                const scheduleEnd = parseISO(`${schedule.date}T${schedule.end_time}:00`); 

                if (proposedStart < scheduleEnd && proposedEnd > scheduleStart) {
                    isAvailable = false;
                    break;
                }
            }
            employeeAvailability[employee.email] = isAvailable;
        });

        return employeeAvailability;

    }, [selectedDate, startTime, duration, employees, schedules, loadingSchedules]);

    if (loadingEmployees || loadingSchedules) {
        return <p className="text-gray-500 text-sm">Cargando disponibilidad de técnicos...</p>;
    }

    if (!selectedDate || !startTime || !duration) {
        return <p className="text-gray-500 text-sm">Selecciona una fecha, hora y duración para ver la disponibilidad.</p>;
    }
    
    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-proman-navy">Seleccionar Técnico (Disponibilidad)</h4>
            <RadioGroup onValueChange={onSelect} value={currentAssignee || ''} className="grid grid-cols-2 gap-2">
                {employees.map(employee => {
                    const available = availability[employee.email];
                    const isDisabled = !available;
                    const isSelected = currentAssignee === employee.email;
                    const displayName = employee.employee_name || employee.full_name;
                    
                    return (
                        <div key={employee.email}>
                            <RadioGroupItem
                                value={employee.email}
                                id={`employee-${employee.email}`}
                                className="peer sr-only"
                                disabled={isDisabled}
                            />
                            <Label
                                htmlFor={`employee-${employee.email}`}
                                className={`flex flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                                    isSelected ? "border-proman-yellow ring-2 ring-proman-yellow" : ""
                                } ${
                                    isDisabled ? "opacity-50 cursor-not-allowed bg-gray-100" : ""
                                }`}
                            >
                                <span>{displayName}</span>
                                <span className={`text-sm font-medium ${available ? 'text-green-600' : 'text-red-600'}`}>
                                    {available ? 'Disponible' : 'Ocupado'}
                                </span>
                            </Label>
                        </div>
                    );
                })}
            </RadioGroup>
            {employees.length === 0 && <p className="text-gray-500 text-sm">No se encontraron técnicos para asignar.</p>}
        </div>
    );
}

function EmployeeSelectorCreate({ selectedDate, startTime, duration, onSelect, currentAssignee }) {
    return <EmployeeSelector 
        selectedDate={selectedDate}
        startTime={startTime}
        duration={duration}
        onSelect={onSelect}
        currentAssignee={currentAssignee}
    />;
}

function GenerateInvoiceButton({ inquiry }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const queryClient = useQueryClient();

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        
        try {
            const response = await base44.functions.invoke('generateInvoice', {
                inquiryId: inquiry.id
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
        <div>
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