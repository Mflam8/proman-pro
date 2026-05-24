import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, MapPin, AlertCircle } from "lucide-react";
import { InputField, SelectField } from "@/components/common/FormFields";
import EmployeeSelector from "./EmployeeSelector";
import { normalizePhone } from "@/components/utils/normalizeData";

export default function InquiryCreateForm({ customers, onSubmit, isSubmitting, onCancel }) {
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
    queryFn: async () => {
      const response = await base44.functions.invoke('listAllUsers', {});
      return response.data.users.filter(u => u.employee_type === 'Empleado' || u.employee_type === 'Supervisor');
    },
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
    
    const normalizedPhone = normalizePhone(selectedCustomer?.phone || '');
    const jobData = {
      ...formData,
      customer_id: selectedCustomer?.id,
      client_name: selectedCustomer?.full_name,
      phone: normalizedPhone || selectedCustomer?.phone,
      normalized_phone: normalizedPhone,
      status: 'nuevo',
      commercial_status: 'nuevo',
      work_status: 'nuevo',
      conversation_status: 'abierta',
      human_review_status: 'not_required'
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
                      {customer.is_vip && <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>}
                      {customer.is_emergency && (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 mr-1" />EMERGENCIA
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
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
          <Button type="button" onClick={() => setStep('createCustomer')} className="flex-1 bg-proman-yellow text-proman-navy">
            <UserPlus className="w-4 h-4 mr-2" />Crear Cliente Nuevo
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
          <Button type="button" variant="outline" onClick={() => setStep('selectCustomer')}>Atrás</Button>
          <Button 
            type="button"
            onClick={() => createCustomer.mutate({
              ...newCustomerData,
              normalized_phone: normalizePhone(newCustomerData.phone),
              canonical_wa_id: normalizePhone(newCustomerData.phone)
            })}
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
                  <AlertCircle className="w-3 h-3 mr-1" />EMERGENCIA
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
            <Select value={formData.location} onValueChange={(v) => setFormData({...formData, location: v})} required>
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
          <Label className="block text-sm font-medium text-proman-navy mb-2">Técnico Asignado (Email)</Label>
          <Select value={formData.assigned_to} onValueChange={(v) => setFormData(prev => ({...prev, assigned_to: v}))}>
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
        >
          {isSubmitting ? "Creando..." : "Crear Trabajo"}
        </Button>
      </div>
    </form>
  );
}