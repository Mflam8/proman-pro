import React, { useState, useEffect, useMemo } from "react";
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
import { groupInquiriesByCustomer, normalizeInquiryData } from "@/components/utils/normalizeData";
import ProjectGroupView from "../components/admin/ProjectGroupView";
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
import TrustedDirectory from "../components/admin/TrustedDirectory";
import CorporateSchedulingManagement from "../components/admin/CorporateSchedulingManagement";
import CorporateReports from "../components/admin/CorporateReports";
import WhatsAppManagement from "../components/admin/WhatsAppManagement";
import WorkflowKanban from "../components/admin/WorkflowKanban";
import AgentChatWidget from "../components/agents/AgentChatWidget";

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('503') ? digits.slice(-8) : digits.slice(-8);
};

export default function ClientManagement() {
  const [user, setUser] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc");
  const [mainTab, setMainTab] = useState("trabajos");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [viewMode, setViewMode] = useState("individual"); // "individual" o "grouped"
  const [clientTypeFilter, setClientTypeFilter] = useState("all"); // "all", "corporativo", "residencial", "comercial"
  const ITEMS_PER_PAGE = 20;
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

  const { data: allInquiries, isLoading: isLoadingInquiries } = useQuery({
    queryKey: ['clientInquiries', sortOrder],
    queryFn: async () => {
      const orderBy = sortOrder === "desc" ? '-created_date' : 'created_date';
      const rawData = await base44.entities.ClientInquiry.filter({}, orderBy);
      // Normalizar datos al recibirlos
      return rawData.map(item => {
        const normalized = item.data ? { ...item, ...item.data } : item;
        return normalizeInquiryData(normalized);
      });
    },
    enabled: !!user && hasManagementAccess,
    initialData: [],
  });



  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const raw = await base44.entities.Customer.list();
      return raw.map((c) => (c && c.data ? { ...c, ...c.data } : c));
    },
    enabled: !!user && hasManagementAccess,
    initialData: [],
  });
  
  const { data: itemsIndex } = useQuery({
    queryKey: ['detalleItemsIndex'],
    queryFn: async () => {
      const all = await base44.entities.DetalleFacturaTrabajo.filter({});
      const idx = {};
      all.forEach((it) => {
        const data = it.data || it;
        const key = data.inquiry_id;
        if (!key) return;
        const blob = ((data.descripcion || '') + ' ' + (data.descripcion_detallada || ''))
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        if (!blob.trim()) return;
        idx[key] = (idx[key] || '') + ' ' + blob;
      });
      return idx;
    },
    enabled: !!user && hasManagementAccess,
    initialData: {}
  });

  const updateInquiry = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientInquiry.update(id, data),
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      await queryClient.invalidateQueries({ queryKey: ['inquiry', variables.id] }); 
      await queryClient.invalidateQueries({ queryKey: ['employeeSchedules'] }); 
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      // Update selected inquiry immediately
      if (selectedInquiry && selectedInquiry.id === variables.id) {
        setSelectedInquiry(prev => ({ ...prev, ...variables.data }));
      }
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
  
  const filteredInquiries = allInquiries.filter(inquiry => {
    let matchesTab = false;
    if (activeTab === "all") {
      matchesTab = true;
    } else if (activeTab === "activos") {
      matchesTab = activeStatuses.includes(inquiry.status);
    } else {
      matchesTab = inquiry.status === activeTab;
    }
    
    const customer = getCustomerForInquiry(inquiry);
    
    // Filter by client type
    let matchesClientType = true;
    if (clientTypeFilter === "corporativo") {
      matchesClientType = inquiry.lead_source === "corporativo";
    } else if (clientTypeFilter === "residencial") {
      matchesClientType = inquiry.lead_source !== "corporativo" && (!customer || customer.customer_type === "residencial");
    } else if (clientTypeFilter === "comercial") {
      matchesClientType = inquiry.lead_source !== "corporativo" && customer?.customer_type === "comercial";
    }
    
    // Búsqueda (tolerante a acentos) e incluye ítems de cotización
    const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const searchText = norm(searchTerm.trim());
    const searchPhone = normalizePhone(searchTerm);
    const matchesSearch =
      searchText === "" ||
      norm(inquiry.client_name).includes(searchText) ||
      norm(customer?.full_name).includes(searchText) ||
      (searchPhone && (
        normalizePhone(inquiry.phone).includes(searchPhone) ||
        normalizePhone(customer?.phone).includes(searchPhone) ||
        normalizePhone(customer?.secondary_phone).includes(searchPhone) ||
        normalizePhone(customer?.wa_id).includes(searchPhone)
      )) ||
      norm(inquiry.service_type).includes(searchText) ||
      norm(inquiry.rubro).includes(searchText) ||
      norm(inquiry.location_name).includes(searchText) ||
      norm(inquiry.restaurant_name).includes(searchText) ||
      (itemsIndex && itemsIndex[inquiry.id] && itemsIndex[inquiry.id].includes(searchText));

    return matchesTab && matchesSearch && matchesClientType;
  });


  const stats = {
    total: allInquiries.length,
    nuevo: allInquiries.filter(i => i.status === "nuevo").length,
    activos: allInquiries.filter(i => activeStatuses.includes(i.status)).length,
    completado: allInquiries.filter(i => i.status === "completado").length
  };

  // Paginate after filtering
  const totalFiltered = filteredInquiries.length;
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedInquiries = filteredInquiries.slice(startIndex, endIndex);
  // Agrupar por cliente si está en modo agrupado (después de paginar)
  const groupedProjects = viewMode === "grouped"
    ? groupInquiriesByCustomer(paginatedInquiries, customers)
    : [];
  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  
  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, clientTypeFilter, activeTab]);

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
        <div className="flex gap-6">
          {/* Sidebar de navegación */}
          <div className="w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  <button
                    onClick={() => setMainTab("trabajos")}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                      mainTab === "trabajos" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="text-lg">📋</span>
                    <span>Gestión de Trabajos</span>
                  </button>
                  <button
                    onClick={() => setMainTab("pipeline")}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                      mainTab === "pipeline" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="text-lg">🧠</span>
                    <span>Pipeline Inteligente</span>
                  </button>
                  <button
                    onClick={() => setMainTab("calendario")}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                      mainTab === "calendario" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="text-lg">📅</span>
                    <span>Calendario</span>
                  </button>
                  <button
                    onClick={() => setMainTab("clientes")}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                      mainTab === "clientes" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="text-lg">👥</span>
                    <span>Gestión de Clientes</span>
                  </button>
                  <button
                    onClick={() => setMainTab("whatsapp")}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                      mainTab === "whatsapp" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="text-lg">💬</span>
                    <span>Conversaciones WhatsApp</span>
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setMainTab("servicios")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "servicios" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">🛠️</span>
                        <span>Gestión de Servicios</span>
                      </button>
                      <button
                        onClick={() => setMainTab("pagos")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "pagos" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">💰</span>
                        <span>Gestión de Pagos</span>
                      </button>
                      <button
                        onClick={() => setMainTab("inventario")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "inventario" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">📦</span>
                        <span>Inventario</span>
                      </button>
                      <button
                        onClick={() => setMainTab("empleados")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "empleados" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">👤</span>
                        <span>Gestión de Empleados</span>
                      </button>
                      <button
                        onClick={() => setMainTab("reportes")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "reportes" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">📊</span>
                        <span>Reportes</span>
                      </button>
                      <button
                        onClick={() => setMainTab("automatizaciones")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "automatizaciones" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">🤖</span>
                        <span>Automatizaciones</span>
                      </button>
                      <button
                        onClick={() => setMainTab("directorio")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "directorio" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">🛡️</span>
                        <span>Directorio Bot</span>
                      </button>
                      <button
                        onClick={() => setMainTab("corporativo")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "corporativo" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">🏢</span>
                        <span>Agendamientos Corporativos</span>
                      </button>
                      <button
                        onClick={() => setMainTab("reportes-corporativo")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                          mainTab === "reportes-corporativo" ? "bg-proman-yellow text-proman-navy" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-lg">📑</span>
                        <span>Reportes Corporativos</span>
                      </button>
                    </>
                  )}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            <Tabs value={mainTab} onValueChange={setMainTab}>

          <TabsContent value="trabajos">
            {isAdmin && (customers.filter(c => c.source === 'whatsapp_bot').length > 0 || 
              allInquiries.filter(i => i.source === 'whatsapp_bot').length > 0) && (
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
                        <strong> {customers.filter(c => c.source === 'whatsapp_bot').length} cliente(s)</strong> y 
                        <strong> {allInquiries.filter(i => i.source === 'whatsapp_bot').length} trabajo(s)</strong> desde WhatsApp
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
                        placeholder="Buscar por nombre, teléfono, servicio, rubro o ítems (ej. enchape)..."
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setSearchTerm(searchDraft); } }}
                        className="w-full"
                      />
                    </div>
                    <Button onClick={() => setSearchTerm(searchDraft)} className="w-full sm:w-auto">Buscar</Button>
                    <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Tipo de cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        <SelectItem value="corporativo">Corporativos</SelectItem>
                        <SelectItem value="residencial">Residenciales</SelectItem>
                        <SelectItem value="comercial">Comerciales</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={viewMode} onValueChange={setViewMode}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Modo de vista" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Vista Individual</SelectItem>
                        <SelectItem value="grouped">Vista por Proyecto</SelectItem>
                      </SelectContent>
                    </Select>
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

            <div className="space-y-4">
              {/* Pagination Controls Top */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages} • Mostrando {paginatedInquiries.length} de {totalFiltered} trabajos filtrados
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      ← Anterior
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente →
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {viewMode === "grouped" ? (
                  // Vista agrupada por proyecto
                  groupedProjects.map((projectData) => (
                    <ProjectGroupView
                      key={projectData.customer.id}
                      customerData={projectData}
                      onClick={() => {
                        // Abrir el primer trabajo activo
                        const firstActive = projectData.jobs.find(j => j.status !== 'completado' && j.status !== 'cancelado');
                        setSelectedInquiry(firstActive || projectData.jobs[0]);
                      }}
                    />
                  ))
                ) : (
                 // Vista individual (original)
                 paginatedInquiries.map((inquiry) => {
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
                                {inquiry.source === 'whatsapp_bot' && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <Bot className="w-3 h-3 mr-1" />WhatsApp Bot
                                  </Badge>
                                )}
                                {inquiry.satisfaction_rating && <Badge className="bg-yellow-100 text-yellow-800"><Star className="w-3 h-3 mr-1"/> {inquiry.satisfaction_rating}/5</Badge>}
                                {inquiry.payment_status === 'pendiente' && inquiry.final_amount > 0 && (
                                  <Badge className="bg-red-100 text-red-800">
                                    <DollarSign className="w-3 h-3 mr-1"/> ${inquiry.final_amount} Pendiente
                                  </Badge>
                                )}
                                {inquiry.payment_status === 'parcial' && (
                                  <Badge className="bg-orange-100 text-orange-800">
                                    <DollarSign className="w-3 h-3 mr-1"/> Pago Parcial
                                  </Badge>
                                )}
                                {inquiry.payment_status === 'pagado' && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <DollarSign className="w-3 h-3 mr-1"/> Pagado
                                  </Badge>
                                )}
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
                  })
                )}
              </div>

              {/* Pagination Controls Bottom */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      ← Anterior
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente →
                    </Button>
                  </div>
                </div>
              )}

              {totalFiltered === 0 && !isLoadingInquiries && <p className="text-center text-gray-500 mt-8">No se encontraron solicitudes con los filtros seleccionados.</p>}
              {isLoadingInquiries && <p className="text-center text-gray-500 mt-8">Cargando solicitudes...</p>}
            </div>
          </TabsContent>

          <TabsContent value="pipeline">
            <WorkflowKanban inquiries={allInquiries} customers={customers} onOpenInquiry={setSelectedInquiry} />
          </TabsContent>

          <TabsContent value="calendario">
            <ScheduleCalendar onSelectJob={(job) => setSelectedInquiry(job)} />
          </TabsContent>

          <TabsContent value="clientes">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppManagement />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="servicios"><ServiceManagement /></TabsContent>
              <TabsContent value="pagos"><PaymentManagement /></TabsContent>
              <TabsContent value="inventario"><EquipmentManagement /></TabsContent>
              <TabsContent value="empleados"><EmployeeManagement /></TabsContent>
              <TabsContent value="reportes"><ReportsManagement /></TabsContent>
              <TabsContent value="automatizaciones"><AutomationsControlPanel /></TabsContent>
              <TabsContent value="directorio"><TrustedDirectory /></TabsContent>
              <TabsContent value="corporativo"><CorporateSchedulingManagement /></TabsContent>
              <TabsContent value="reportes-corporativo"><CorporateReports /></TabsContent>
            </>
          )}
        </Tabs>
          </div>
        </div>
      </div>
      
      {selectedInquiry && (
        <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] lg:w-[calc(100vw-4rem)] max-w-7xl h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] rounded-2xl p-0 overflow-y-auto">
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
              onCreateInquiry={(customerId) => {
                setSelectedInquiry(null);
                setShowCreateModal(true);
              }}
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
      <AgentChatWidget agentName="gestionBot" />
    </div>
  );
}