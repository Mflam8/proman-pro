import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  User, Star, Edit2, UserPlus, Clock, CheckCircle, Camera, MessageCircle, Copy, DollarSign, ExternalLink, Plus
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { statusConfig, priorityConfig } from "@/components/utils/inquiryConfig";
import { InputField, InfoRow } from "@/components/common/FormFields";
import ImageUploader from "./ImageUploader";
import QuickPaymentForm from "./QuickPaymentForm";
import BillingDetails from "./BillingDetails";
import WorkExpenses from "./WorkExpenses";
import EmployeeSelector from "./EmployeeSelector";
import WhatsAppConversationPanel from "./WhatsAppConversationPanel";
import WhatsAppQuoteActions from "./WhatsAppQuoteActions";

export default function InquiryDetailForm({ 
  inquiry, 
  customer, 
  customers, 
  onUpdate, 
  isUpdating, 
  isAdmin, 
  isSupervisor, 
  getSurveyLink, 
  getWhatsAppUpdateLink, 
  onDelete 
}) {
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: progressLogs } = useQuery({
    queryKey: ['progressLogs', inquiry.id],
    queryFn: () => base44.entities.ProgressLog.filter({ inquiry_id: inquiry.id }, '-created_date'),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments', inquiry.id],
    queryFn: () => base44.entities.Payment.filter({ inquiry_id: inquiry.id }, '-payment_date'),
    initialData: [],
  });

  const { data: currentInquiry } = useQuery({
    queryKey: ['inquiry', inquiry.id],
    queryFn: () => base44.entities.ClientInquiry.filter({ id: inquiry.id }).then(res => res[0]),
    initialData: inquiry,
    refetchInterval: 3000,
  });

  const { data: billingItems } = useQuery({
    queryKey: ['billingItems', inquiry.id],
    queryFn: () => base44.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiry.id }),
    initialData: [],
  });

  // Servicios activos para selección rápida
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.filter({ is_active: true }),
    initialData: [],
  });

  // Crea línea de cotización automáticamente al elegir un servicio
  const createBillingItem = useMutation({
    mutationFn: async ({ service }) => {
      const price = service.base_price ?? service.price_range_min ?? 0;
      const item = await base44.entities.DetalleFacturaTrabajo.create({
        inquiry_id: inquiry.id,
        tipo_item: 'servicio',
        descripcion: service.service_name,
        descripcion_detallada: service.description || '',
        cantidad: 1,
        unidad_medida: 'unidad',
        precio_unitario: price,
        monto_total_item: price,
        es_cotizacion: true,
        incluir_iva: false,
        opcion_numero: 1
      });
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiry.id] });
    },
  });

  const handleSelectService = async (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    await handleAutoSaveChange('service_type', service.service_name);
    const exists = billingItems.some(item =>
      item.tipo_item === 'servicio' && (item.descripcion || '').toLowerCase() === service.service_name.toLowerCase()
    );
    if (!exists) {
      createBillingItem.mutate({ service });
    }
  };

  const createPayment = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      const paymentData = { ...data, recorded_by: currentUser.email, inquiry_id: inquiry.id };
      const payment = await base44.entities.Payment.create(paymentData);
      
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

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const calculatedFinalAmount = billingItems.reduce((sum, item) => sum + (item.monto_total_item || 0), 0);
  const finalAmount = parseFloat(calculatedFinalAmount > 0 ? calculatedFinalAmount : (currentInquiry?.final_amount || currentInquiry?.quote_amount || formData.final_amount || formData.quote_amount || 0)) || 0;
  const remainingAmount = finalAmount - totalPaid;

  useEffect(() => {
    const latestData = currentInquiry || inquiry;
    setFormData({
      ...latestData,
      progress_percentage: latestData.progress_percentage || 0,
      scheduled_date: latestData.scheduled_date || '',
      scheduled_start_time: latestData.scheduled_start_time || '',
      estimated_duration_hours: latestData.estimated_duration_hours || '',
      quote_pdf_url: latestData.quote_pdf_url || '',
      location_name: latestData.location_name || '',
    });
  }, [inquiry, currentInquiry]);

  useEffect(() => {
    if (calculatedFinalAmount > 0 && calculatedFinalAmount !== formData.final_amount) {
      setFormData(prev => ({ ...prev, final_amount: calculatedFinalAmount }));
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
    // Preparar solo los campos que necesitamos actualizar
    let updateData = { [field]: value };
    
    if (field === 'status' && value === 'completado') {
      updateData.progress_percentage = 100;
      
      const allPayments = await base44.entities.Payment.filter({ inquiry_id: inquiry.id });
      const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      const finalAmount = formData.final_amount || formData.quote_amount || 0;
      
      if (totalPaid >= finalAmount && finalAmount > 0) {
        updateData.payment_status = 'pagado';
      } else if (totalPaid > 0) {
        updateData.payment_status = 'parcial';
      } else {
        updateData.payment_status = 'pendiente';
      }
    }
    
    // Actualizar formData local para la UI
    setFormData(prev => ({ ...prev, ...updateData }));
    
    try {
      await onUpdate({ id: inquiry.id, data: updateData });
      await queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert("Error al guardar: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { id, ...updateData } = formData;
      updateData.progress_percentage = Number(formData.progress_percentage) || 0;
      
      const progressChanged = 
        formData.progress_percentage !== inquiry.progress_percentage ||
        formData.work_notes_done !== inquiry.work_notes_done ||
        formData.work_notes_pending !== inquiry.work_notes_pending ||
        formData.before_image_url !== inquiry.before_image_url ||
        formData.after_image_url !== inquiry.after_image_url;

      if (progressChanged) {
        try {
          const currentUser = await base44.auth.me();
          
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
            log_type: 'avance_tecnico',
            timestamp: new Date().toISOString(),
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

  const workStats = useMemo(() => {
    if (progressLogs.length === 0) return null;
    
    const firstLog = progressLogs[progressLogs.length - 1];
    const lastLog = progressLogs[0];
    
    const startDate = new Date(firstLog.created_date);
    const lastUpdate = new Date(lastLog.created_date);
    const daysPassed = Math.ceil((lastUpdate - startDate) / (1000 * 60 * 60 * 24));
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-6">
          {/* 1. INFORMACIÓN DEL CLIENTE */}
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
                    <Badge className="bg-green-100 text-green-800">Cliente Registrado</Badge>
                    {customer.is_vip && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Star className="w-3 h-3 mr-1" />VIP
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
                    <p className="text-xs text-yellow-800">⚠️ Cliente no vinculado a base de datos</p>
                  </div>
                  <InfoRow label="Nombre" value={inquiry.client_name || "N/A"} />
                  <InfoRow label="Teléfono" value={inquiry.phone || "N/A"} />
                  {canEdit && (
                    <Button type="button" size="sm" className="w-full mt-3 bg-proman-yellow text-proman-navy" onClick={() => setShowCustomerEdit(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />Vincular Cliente
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
                      <Select value={formData.rubro} onValueChange={(v) => handleAutoSaveChange('rubro', v)} disabled={isUpdating}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                      <Select
                        value={services.find(s => s.service_name === (formData.service_type || ''))?.id || ''}
                        onValueChange={(v) => handleSelectService(v)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecciona un servicio" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.service_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

          {/* 2. PANEL ADMINISTRATIVO — movido a columna derecha */}

          <WhatsAppQuoteActions
            inquiryId={inquiry.id}
            customerId={customer?.id || inquiry.customer_id}
            phone={customer?.phone || inquiry.phone}
          />

          <WhatsAppConversationPanel 
            customerId={customer?.id || inquiry.customer_id}
            inquiryId={inquiry.id}
            phone={customer?.phone || inquiry.phone}
          />

        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">
          {canEdit && (
            <Card className="border-2 border-purple-500 bg-purple-50/30">
              <CardHeader className="bg-purple-500 text-white">
                <CardTitle>⚙️ Panel Administrativo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-proman-navy mb-2">Estado</Label>
                    <Select value={formData.status || 'nuevo'} onValueChange={(v) => handleAutoSaveChange('status', v)} disabled={isUpdating}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-proman-navy mb-2">Prioridad</Label>
                    <Select value={formData.priority || 'media'} onValueChange={(v) => handleAutoSaveChange('priority', v)} disabled={isUpdating}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div><Label className="text-xs">Fecha</Label><Input type="date" value={formData.scheduled_date || ''} onChange={(e) => setFormData(p => ({...p, scheduled_date: e.target.value}))} disabled={isUpdating} /></div>
                    <div><Label className="text-xs">Hora</Label><Input type="time" value={formData.scheduled_start_time || ''} onChange={(e) => setFormData(p => ({...p, scheduled_start_time: e.target.value}))} disabled={isUpdating} /></div>
                    <div><Label className="text-xs">Duración (hrs)</Label><Input type="number" step="0.5" value={formData.estimated_duration_hours || ''} onChange={(e) => setFormData(p => ({...p, estimated_duration_hours: parseFloat(e.target.value)}))} disabled={isUpdating} /></div>
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
                  <InputField label="Cotización ($)" type="number" value={formData.quote_amount} onChange={(e) => setFormData(p => ({...p, quote_amount: e.target.value}))} disabled={isUpdating} />
                  <InputField label="Monto Final ($)" type="number" value={formData.final_amount} onChange={(e) => setFormData(p => ({...p, final_amount: e.target.value}))} disabled={isUpdating} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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



            {/* 5. ACTUALIZACIÓN DE PROGRESO */}
          <Card className="border-2 border-blue-500 bg-blue-50/30">
            <CardHeader className="bg-blue-500 text-white">
              <CardTitle className="flex items-center gap-2">👷 Actualización de Progreso</CardTitle>
              <p className="text-xs text-blue-100 mt-1">Cada cambio que guardes se registrará automáticamente en el historial</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border">
                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-1">📅 Fecha del Trabajo</label>
                  <Input type="date" value={formData.current_work_date || new Date().toISOString().split('T')[0]} onChange={(e) => setFormData(prev => ({...prev, current_work_date: e.target.value}))} disabled={isUpdating || !canEdit} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-1">⏱️ Horas Trabajadas</label>
                  <Input type="number" step="0.5" min="0" value={formData.current_hours_worked || ''} onChange={(e) => setFormData(prev => ({...prev, current_hours_worked: parseFloat(e.target.value) || 0}))} disabled={isUpdating || !canEdit} placeholder="Ej: 8" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">
                  Porcentaje de Avance: <span className="text-xl font-bold text-blue-600">{formData.progress_percentage || 0}%</span>
                </label>
                <Slider
                  value={[Number(formData.progress_percentage) || 0]}
                  onValueChange={(val) => setFormData(prev => ({...prev, progress_percentage: Number(val[0])}))}
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
              <p className="text-xs text-blue-100 mt-1">Las fotos se guardarán en el historial de esta actualización</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <ImageUploader label="Antes" imageUrl={formData.before_image_url} onFileSelect={setBeforeImageFile} isUploading={isUploading} disabled={!canEdit} />
              <ImageUploader label="Después" imageUrl={formData.after_image_url} onFileSelect={setAfterImageFile} isUploading={isUploading} disabled={!canEdit} />
            </CardContent>
          </Card>

          {/* HISTORIAL COMPLETO */}
          {progressLogs.length > 0 && (
            <Card className="border-2 border-green-500">
              <CardHeader className="bg-green-500 text-white">
                <CardTitle className="flex items-center justify-between">
                  <span>📊 Historial Completo de Trabajo</span>
                  <Badge className="bg-white text-green-700">
                    {progressLogs.length} {progressLogs.length === 1 ? 'actualización' : 'actualizaciones'}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-green-100 mt-1">Registro cronológico de todos los avances realizados</p>
              </CardHeader>
              <CardContent className="pt-4">
                {workStats && (
                  <div className="bg-white rounded-lg p-4 mb-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
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
                        {!isLast && <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-300" />}
                        
                        <div className="flex gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            isFirst ? 'bg-blue-500' : isLast ? 'bg-green-500' : 'bg-gray-400'
                          }`}>
                            <span className="text-white font-bold text-sm">{log.progress_percentage}%</span>
                          </div>
                          
                          <div className="flex-1 bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <Badge className={isFirst ? "bg-blue-500 text-white" : isLast ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>
                                  {isFirst && "🏁 Inicio"}
                                  {isLast && "✅ Última actualización"}
                                  {!isFirst && !isLast && `Actualización ${progressLogs.length - idx}`}
                                </Badge>
                                {log.hours_worked > 0 && (
                                  <Badge className="bg-orange-100 text-orange-800">
                                    <Clock className="w-3 h-3 mr-1" />{log.hours_worked}h trabajadas
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-gray-700">
                                  {log.work_date ? format(new Date(log.work_date), "dd MMM yyyy", { locale: es }) : format(new Date(log.created_date), "dd MMM yyyy", { locale: es })}
                                </p>
                                <p className="text-xs text-gray-500">Registrado: {format(new Date(log.created_date), "HH:mm", { locale: es })}</p>
                              </div>
                            </div>
                            
                            {log.work_done && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />Trabajo Realizado:
                                </p>
                                <p className="text-sm text-gray-700 bg-green-50 rounded p-2">{log.work_done}</p>
                              </div>
                            )}
                            
                            {log.work_pending && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />Pendiente:
                                </p>
                                <p className="text-sm text-gray-700 bg-orange-50 rounded p-2">{log.work_pending}</p>
                              </div>
                            )}

                            {(log.before_photos?.length > 0 || log.after_photos?.length > 0) && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                                  <Camera className="w-3 h-3" />Fotografías de esta actualización:
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {log.before_photos?.map((photo, photoIdx) => (
                                    <div key={`before-${photoIdx}`} className="relative">
                                      <img src={photo} alt="Antes" className="w-full h-24 object-cover rounded border-2 border-blue-200" />
                                      <Badge className="absolute top-1 left-1 text-xs bg-blue-500">Antes</Badge>
                                    </div>
                                  ))}
                                  {log.after_photos?.map((photo, photoIdx) => (
                                    <div key={`after-${photoIdx}`} className="relative">
                                      <img src={photo} alt="Después" className="w-full h-24 object-cover rounded border-2 border-green-200" />
                                      <Badge className="absolute top-1 left-1 text-xs bg-green-500">Después</Badge>
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
                                  <User className="w-3 h-3" />Actualizado por: <span className="font-medium">{log.updated_by}</span>
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

        </div>

        {/* COLUMNA TRES */}
        <div className="space-y-6">
          {/* 6. PAGOS */}
          <Card className="border-2 border-teal-500">
            <CardHeader className="bg-teal-500 text-white">
              <div className="flex justify-between items-center">
                <CardTitle>💰 Pagos del Servicio</CardTitle>
                {canEdit && (
                  <Button type="button" size="sm" onClick={() => setShowPaymentModal(true)} className="bg-white text-green-700 hover:bg-gray-100">
                    <Plus className="w-4 h-4 mr-1" />Registrar Pago
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
                        <Badge className="bg-blue-100 text-blue-800">{payment.payment_method}</Badge>
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
                            <ExternalLink className="w-3 h-3 mr-1" />Ver Comprobante
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

          {/* 3. COTIZACIÓN / FACTURACIÓN */}
          <BillingDetails inquiryId={inquiry.id} canEdit={canEdit} inquiry={inquiry} />

          {/* 4. GASTOS DEL TRABAJO */}
          <WorkExpenses inquiryId={inquiry.id} canEdit={canEdit} />

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

          {/* ACCIONES CON CLIENTE */}
          {canEdit && (
            <Card>
              <CardHeader><CardTitle>Acciones con Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <a href={getWhatsAppUpdateLink(formData)} target="_blank" rel="noopener noreferrer" className="block">
                  <Button type="button" variant="outline" className="w-full">
                    <MessageCircle className="w-4 h-4 mr-2" />Notificar Avance
                  </Button>
                </a>
                {inquiry.status === 'completado' && (
                  <div>
                    <Label className="text-sm font-medium">Enlace de Encuesta:</Label>
                    <div className="flex gap-2 mt-1">
                      <Input readOnly value={getSurveyLink(inquiry.id)} className="text-xs" />
                      <Button type="button" size="icon" onClick={() => navigator.clipboard.writeText(getSurveyLink(inquiry.id))}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {canEdit && (
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-safe">
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