import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DollarSign, Plus, Calendar, CreditCard, FileText, TrendingUp, AlertCircle, ExternalLink, Upload } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const paymentMethodConfig = {
  efectivo: { label: "Efectivo", icon: DollarSign, color: "bg-green-100 text-green-800" },
  transferencia: { label: "Transferencia", icon: CreditCard, color: "bg-blue-100 text-blue-800" },
  deposito: { label: "Depósito", icon: CreditCard, color: "bg-indigo-100 text-indigo-800" },
  tarjeta: { label: "Tarjeta", icon: CreditCard, color: "bg-purple-100 text-purple-800" },
  otro: { label: "Otro", icon: FileText, color: "bg-gray-100 text-gray-800" }
};

const paymentStatusConfig = {
  pendiente: { label: "Pendiente", color: "bg-red-100 text-red-800" },
  parcial: { label: "Parcial", color: "bg-yellow-100 text-yellow-800" },
  pagado: { label: "Pagado", color: "bg-green-100 text-green-800" }
};

export default function PaymentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const queryClient = useQueryClient();

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-payment_date'),
    initialData: [],
  });

  const { data: inquiries } = useQuery({
    queryKey: ['clientInquiries'],
    queryFn: () => base44.entities.ClientInquiry.list(),
    initialData: [],
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: [],
  });

  const createPayment = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      const paymentData = { ...data, recorded_by: currentUser.email };
      const payment = await base44.entities.Payment.create(paymentData);
      
      // Actualizar el estado de pago del inquiry
      const inquiry = inquiries.find(i => i.id === data.inquiry_id);
      if (inquiry) {
        const allPayments = await base44.entities.Payment.filter({ inquiry_id: data.inquiry_id });
        const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0) + data.amount_paid;
        const finalAmount = inquiry.final_amount || inquiry.quote_amount || 0;
        
        let newPaymentStatus = 'pendiente';
        if (totalPaid >= finalAmount) {
          newPaymentStatus = 'pagado';
        } else if (totalPaid > 0) {
          newPaymentStatus = 'parcial';
        }
        
        await base44.entities.ClientInquiry.update(inquiry.id, { payment_status: newPaymentStatus });
      }
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      setShowCreateModal(false);
    },
  });

  const getInquiryForPayment = (payment) => {
    return inquiries.find(i => i.id === payment.inquiry_id);
  };

  const getCustomerForInquiry = (inquiry) => {
    if (inquiry?.customer_id) {
      return customers.find(c => c.id === inquiry.customer_id);
    }
    return null;
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    const inquiry = getInquiryForPayment(payment);
    const customer = getCustomerForInquiry(inquiry);
    return (
      customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry?.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.phone?.includes(searchTerm) ||
      inquiry?.phone?.includes(searchTerm) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyRevenue = payments
      .filter(p => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear;
      })
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    
    const paymentsByMethod = {};
    payments.forEach(p => {
      paymentsByMethod[p.payment_method] = (paymentsByMethod[p.payment_method] || 0) + 1;
    });

    return {
      total: payments.length,
      totalRevenue,
      monthlyRevenue,
      paymentsByMethod
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">${stats.totalRevenue.toFixed(2)}</div>
                <div className="text-xs text-gray-600">Ingresos Totales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">${stats.monthlyRevenue.toFixed(2)}</div>
                <div className="text-xs text-gray-600">Este Mes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-purple-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.total}</div>
                <div className="text-xs text-gray-600">Total Pagos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-proman-yellow flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-proman-navy" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">
                  ${stats.total > 0 ? (stats.totalRevenue / stats.total).toFixed(0) : 0}
                </div>
                <div className="text-xs text-gray-600">Promedio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Registro de Pagos</CardTitle>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-proman-yellow text-proman-navy hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Buscar por cliente, teléfono o ID de transacción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredPayments.map((payment) => {
              const inquiry = getInquiryForPayment(payment);
              const customer = getCustomerForInquiry(inquiry);
              const clientName = customer?.full_name || inquiry?.client_name || "Cliente desconocido";
              const MethodIcon = paymentMethodConfig[payment.payment_method]?.icon || FileText;

              return (
                <Card
                  key={payment.id}
                  className="border-2 border-gray-100 hover:border-proman-yellow transition-all cursor-pointer"
                  onClick={() => setSelectedPayment(payment)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-proman-navy">{clientName}</h3>
                          <Badge className={paymentMethodConfig[payment.payment_method]?.color}>
                            <MethodIcon className="w-3 h-3 mr-1" />
                            {paymentMethodConfig[payment.payment_method]?.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-lg">${payment.amount_paid}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4 text-proman-yellow" />
                            <span>{format(new Date(payment.payment_date), "dd MMM yyyy", { locale: es })}</span>
                          </div>
                          {payment.transaction_id && (
                            <div className="text-xs text-gray-500 col-span-2">
                              ID: {payment.transaction_id}
                            </div>
                          )}
                        </div>
                        {inquiry && (
                          <div className="mt-2 text-xs text-gray-500">
                            Servicio: {inquiry.rubro} - {inquiry.service_type}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">
                          Registrado por
                        </span>
                        <div className="text-sm text-gray-700">{payment.recorded_by}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredPayments.length === 0 && !isLoadingPayments && (
            <p className="text-center text-gray-500 py-8">No se encontraron pagos</p>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Modal */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={() => setShowCreateModal(false)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            </DialogHeader>
            <PaymentForm
              inquiries={inquiries}
              customers={customers}
              onSubmit={createPayment.mutate}
              isSubmitting={createPayment.isPending}
              onCancel={() => setShowCreateModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles del Pago</DialogTitle>
            </DialogHeader>
            <PaymentDetail
              payment={selectedPayment}
              inquiry={getInquiryForPayment(selectedPayment)}
              customer={getCustomerForInquiry(getInquiryForPayment(selectedPayment))}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PaymentForm({ inquiries, customers, onSubmit, isSubmitting, onCancel }) {
  const [formData, setFormData] = useState({
    inquiry_id: "",
    amount_paid: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "efectivo",
    destination_account_type: "n/a",
    collected_by: "",
    transaction_id: "",
    confirmation_url: "",
    notes: ""
  });
  const [confirmationFile, setConfirmationFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedInquiry = inquiries.find(i => i.id === formData.inquiry_id);
  const customer = selectedInquiry?.customer_id 
    ? customers.find(c => c.id === selectedInquiry.customer_id)
    : null;

  // Mostrar todos los trabajos excepto los nuevos y pendientes de evaluación
  const completedInquiries = inquiries.filter(i => 
    i.status !== 'nuevo' && i.status !== 'evaluacion_pendiente' && i.status !== 'evaluacion_agendada'
  );

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
      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Trabajo Asociado *
        </Label>
        <Select
          value={formData.inquiry_id}
          onValueChange={(value) => setFormData({ ...formData, inquiry_id: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar trabajo" />
          </SelectTrigger>
          <SelectContent>
            {completedInquiries.map(inquiry => {
              const customer = inquiry.customer_id 
                ? customers.find(c => c.id === inquiry.customer_id)
                : null;
              const clientName = customer?.full_name || inquiry.client_name || "Sin nombre";
              
              return (
                <SelectItem key={inquiry.id} value={inquiry.id}>
                  {clientName} - {inquiry.service_type} ({inquiry.status})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {selectedInquiry && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-proman-navy mb-2">
            Información del Trabajo:
          </p>
          <div className="text-xs text-gray-700 space-y-1">
            <div>Cliente: {customer?.full_name || selectedInquiry.client_name}</div>
            <div>Servicio: {selectedInquiry.rubro} - {selectedInquiry.service_type}</div>
            <div>Monto Cotizado: ${selectedInquiry.quote_amount || 0}</div>
            <div>Monto Final: ${selectedInquiry.final_amount || selectedInquiry.quote_amount || 0}</div>
            {selectedInquiry.payment_status && (
              <div className="flex items-center gap-2">
                Estado de Pago: 
                <Badge className={paymentStatusConfig[selectedInquiry.payment_status]?.color}>
                  {paymentStatusConfig[selectedInquiry.payment_status]?.label}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-proman-navy mb-2">
            Método de Pago *
          </Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => {
              // Si es efectivo, por defecto cuenta n/a, si es transferencia/deposito sugerir algo?
              // Mejor dejar que el usuario elija.
              setFormData({ ...formData, payment_method: value });
            }}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar método" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(paymentMethodConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="block text-sm font-medium text-proman-navy mb-2">
            Cuenta Destino
          </Label>
          <Select
            value={formData.destination_account_type}
            onValueChange={(value) => setFormData({ ...formData, destination_account_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="n/a">N/A (Efectivo)</SelectItem>
              <SelectItem value="propia">Cuenta Propia (Empresa)</SelectItem>
              <SelectItem value="terceros">Cuenta de Terceros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Recibido por (Técnico/Persona)
        </Label>
        <Input
          value={formData.collected_by}
          onChange={(e) => setFormData({ ...formData, collected_by: e.target.value })}
          placeholder="Ej: Juan Carlos"
        />
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
              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
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

function PaymentDetail({ payment, inquiry, customer }) {
  const MethodIcon = paymentMethodConfig[payment.payment_method]?.icon || FileText;
  const clientName = customer?.full_name || inquiry?.client_name || "Cliente desconocido";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Información del Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Monto Pagado:</span>
            <span className="font-bold text-2xl text-green-600">${payment.amount_paid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha:</span>
            <span className="font-medium">{format(new Date(payment.payment_date), "dd 'de' MMMM, yyyy", { locale: es })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Método:</span>
            <Badge className={paymentMethodConfig[payment.payment_method]?.color}>
              <MethodIcon className="w-3 h-3 mr-1" />
              {paymentMethodConfig[payment.payment_method]?.label}
            </Badge>
          </div>
          {payment.transaction_id && (
            <div className="flex justify-between">
              <span className="text-gray-600">ID Transacción:</span>
              <span className="font-medium">{payment.transaction_id}</span>
            </div>
          )}
          {payment.collected_by && (
            <div className="flex justify-between">
              <span className="text-gray-600">Recibido por:</span>
              <span className="font-medium text-proman-navy">{payment.collected_by}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Registrado por:</span>
            <span className="font-medium">{payment.recorded_by}</span>
          </div>
        </CardContent>
      </Card>

      {inquiry && (
        <Card>
          <CardHeader>
            <CardTitle>Trabajo Asociado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-medium">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Servicio:</span>
              <span className="font-medium">{inquiry.rubro} - {inquiry.service_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto Final:</span>
              <span className="font-medium">${inquiry.final_amount || inquiry.quote_amount || 0}</span>
            </div>
            {inquiry.payment_status && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Estado de Pago:</span>
                <Badge className={paymentStatusConfig[inquiry.payment_status]?.color}>
                  {paymentStatusConfig[inquiry.payment_status]?.label}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {payment.confirmation_url && (
        <Card>
          <CardHeader>
            <CardTitle>Comprobante</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <img 
                src={payment.confirmation_url} 
                alt="Comprobante" 
                className="max-h-48 rounded border"
              />
              <a 
                href={payment.confirmation_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver completo
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {payment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{payment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}