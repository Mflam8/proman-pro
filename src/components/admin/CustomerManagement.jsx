
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  User, UserPlus, Phone, Mail, MapPin, Star, DollarSign,
  Briefcase, Edit2, Plus, Home, Building, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
    initialData: [],
  });

  const { data: allJobs } = useQuery({
    queryKey: ['allJobs'],
    queryFn: () => base44.entities.ClientInquiry.list(),
    initialData: [],
  });

  const createCustomer = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowCreateModal(false);
    },
  });

  const updateCustomer = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditingCustomer(null);
      setSelectedCustomer(null);
    },
  });

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = searchTerm === "" ||
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || c.customer_type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: customers.length,
    residencial: customers.filter(c => c.customer_type === "residencial").length,
    comercial: customers.filter(c => c.customer_type === "comercial").length,
    vip: customers.filter(c => c.is_vip).length,
    avgSpent: customers.length > 0 ?
      (customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / customers.length).toFixed(0) : 0,
  };

  const getCustomerJobs = (customerId) => {
    return allJobs.filter(j => j.customer_id === customerId);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-proman-yellow flex items-center justify-center">
                <User className="w-5 h-5 text-proman-navy" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.total}</div>
                <div className="text-xs text-gray-600">Total Clientes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-blue-100 flex items-center justify-center">
                <Home className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.residencial}</div>
                <div className="text-xs text-gray-600">Residenciales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-indigo-100 flex items-center justify-center">
                <Building className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600">{stats.comercial}</div>
                <div className="text-xs text-gray-600">Comerciales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-yellow-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.vip}</div>
                <div className="text-xs text-gray-600">VIP</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">${stats.avgSpent}</div>
                <div className="text-xs text-gray-600">Gasto Promedio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Base de Clientes</CardTitle>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-proman-yellow text-proman-navy hover:opacity-90"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="residencial">Residencial</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="corporativo">Corporativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredCustomers.map((customer) => {
              const customerJobs = getCustomerJobs(customer.id);
              const primaryAddress = customer.addresses?.find(a => a.is_primary) || customer.addresses?.[0];

              return (
                <Card
                  key={customer.id}
                  className="border-2 border-gray-100 hover:border-proman-yellow transition-all cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-proman-navy" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-lg font-bold text-proman-navy">
                                {customer.full_name}
                              </h3>
                              {customer.is_vip && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  <Star className="w-3 h-3 mr-1" />
                                  VIP
                                </Badge>
                              )}
                              <Badge className={
                                customer.customer_type === "residencial" ? "bg-blue-100 text-blue-800" :
                                customer.customer_type === "comercial" ? "bg-indigo-100 text-indigo-800" :
                                "bg-purple-100 text-purple-800"
                              }>
                                {customer.customer_type}
                              </Badge>
                            </div>
                            <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-proman-yellow" />
                                <span>{customer.phone}</span>
                              </div>
                              {customer.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-proman-yellow" />
                                  <span>{customer.email}</span>
                                </div>
                              )}
                              {primaryAddress && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-proman-yellow" />
                                  <span>{primaryAddress.label}: {primaryAddress.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-proman-yellow" />
                                <span>{customerJobs.length} trabajos</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {customer.addresses && customer.addresses.length > 1 && (
                          <div className="mt-2 pl-15 text-xs text-gray-500">
                            +{customer.addresses.length - 1} dirección(es) más
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {customer.total_spent > 0 && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">${customer.total_spent}</div>
                            <div className="text-xs text-gray-500">Total gastado</div>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCustomer(customer);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredCustomers.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No se encontraron clientes</p>
              <p className="text-sm text-gray-400 mt-1">Crea tu primer cliente para empezar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCustomer) && (
        <CustomerFormModal
          customer={editingCustomer}
          isOpen={showCreateModal || !!editingCustomer}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCustomer(null);
          }}
          onSubmit={(data) => {
            if (editingCustomer) {
              updateCustomer.mutate({ id: editingCustomer.id, data });
            } else {
              createCustomer.mutate(data);
            }
          }}
          isSubmitting={createCustomer.isPending || updateCustomer.isPending}
        />
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          jobs={getCustomerJobs(selectedCustomer.id)}
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={(customer) => {
            setSelectedCustomer(null);
            setEditingCustomer(customer);
          }}
        />
      )}
    </div>
  );
}

function CustomerFormModal({ customer, isOpen, onClose, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState(customer || {
    full_name: "",
    phone: "",
    secondary_phone: "",
    email: "",
    customer_type: "residencial",
    preferred_contact: "whatsapp",
    addresses: [{ label: "Principal", address: "", location: "San Salvador", reference: "", is_primary: true }],
    notes: "",
    is_vip: false
  });

  const departamentos = [
    "Ahuachapán", "Santa Ana", "Sonsonate", "La Libertad", "San Salvador",
    "Chalatenango", "Cuscatlán", "La Paz", "Cabañas", "San Vicente",
    "Usulután", "San Miguel", "Morazán", "La Unión"
  ];

  const addAddress = () => {
    setFormData({
      ...formData,
      addresses: [...(formData.addresses || []), { label: "", address: "", location: "San Salvador", reference: "", is_primary: false }]
    });
  };

  const removeAddress = (index) => {
    const newAddresses = formData.addresses.filter((_, i) => i !== index);
    setFormData({ ...formData, addresses: newAddresses });
  };

  const updateAddress = (index, field, value) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    if (field === "is_primary" && value) {
      newAddresses.forEach((addr, i) => {
        if (i !== index) addr.is_primary = false;
      });
    }
    setFormData({ ...formData, addresses: newAddresses });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-proman-navy">Información Básica</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Nombre Completo *</label>
                <Input
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Teléfono Principal *</label>
                <Input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="7XXX-XXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Teléfono Secundario</label>
                <Input
                  value={formData.secondary_phone || ''}
                  onChange={(e) => setFormData({...formData, secondary_phone: e.target.value})}
                  placeholder="7XXX-XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Tipo de Cliente</label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value) => setFormData({...formData, customer_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="corporativo">Corporativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Contacto Preferido</label>
                <Select
                  value={formData.preferred_contact}
                  onValueChange={(value) => setFormData({...formData, preferred_contact: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="llamada">Llamada</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_vip}
                    onChange={(e) => setFormData({...formData, is_vip: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-proman-navy">Cliente VIP</span>
                </label>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-proman-navy">Direcciones</h3>
              <Button type="button" size="sm" variant="outline" onClick={addAddress}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar Dirección
              </Button>
            </div>

            {formData.addresses?.map((address, index) => (
              <Card key={index} className="border-2">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-proman-yellow" />
                      <span className="text-sm font-medium">Dirección {index + 1}</span>
                      {address.is_primary && (
                        <Badge className="bg-green-100 text-green-800 text-xs">Principal</Badge>
                      )}
                    </div>
                    {formData.addresses.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeAddress(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Etiqueta (Casa, Oficina...)"
                      value={address.label || ''}
                      onChange={(e) => updateAddress(index, 'label', e.target.value)}
                    />
                    <Select
                      value={address.location || 'San Salvador'}
                      onValueChange={(value) => updateAddress(index, 'location', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    placeholder="Dirección completa"
                    value={address.address || ''}
                    onChange={(e) => updateAddress(index, 'address', e.target.value)}
                  />

                  <Input
                    placeholder="Referencias (cerca de...)"
                    value={address.reference || ''}
                    onChange={(e) => updateAddress(index, 'reference', e.target.value)}
                  />

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={address.is_primary}
                      onChange={(e) => updateAddress(index, 'is_primary', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-600">Marcar como principal</span>
                  </label>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-proman-navy mb-2">Notas</label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Notas sobre el cliente, preferencias, etc..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-proman-yellow text-proman-navy hover:opacity-90" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : customer ? "Actualizar" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailModal({ customer, jobs, isOpen, onClose, onEdit }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">{customer.full_name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={
                  customer.customer_type === "residencial" ? "bg-blue-100 text-blue-800" :
                  customer.customer_type === "comercial" ? "bg-indigo-100 text-indigo-800" :
                  "bg-purple-100 text-purple-800"
                }>
                  {customer.customer_type}
                </Badge>
                {customer.is_vip && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Star className="w-3 h-3 mr-1" />
                    VIP
                  </Badge>
                )}
              </div>
            </div>
            <Button size="sm" onClick={() => onEdit(customer)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-proman-yellow" />
                <span className="font-medium">Principal:</span>
                <a href={`tel:${customer.phone}`} className="text-proman-navy hover:underline">{customer.phone}</a>
              </div>
              {customer.secondary_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-proman-yellow" />
                  <span className="font-medium">Secundario:</span>
                  <a href={`tel:${customer.secondary_phone}`} className="text-proman-navy hover:underline">{customer.secondary_phone}</a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-proman-yellow" />
                  <span className="font-medium">Email:</span>
                  <a href={`mailto:${customer.email}`} className="text-proman-navy hover:underline">{customer.email}</a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-medium">Contacto preferido:</span>
                <Badge variant="outline">{customer.preferred_contact}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          {customer.addresses && customer.addresses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Direcciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.addresses.map((addr, idx) => (
                  <div key={idx} className="border-l-4 border-proman-yellow pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{addr.label}</span>
                      {addr.is_primary && (
                        <Badge className="bg-green-100 text-green-800 text-xs">Principal</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{addr.address}</p>
                    <p className="text-sm text-gray-500">{addr.location}</p>
                    {addr.reference && (
                      <p className="text-xs text-gray-400 mt-1">Ref: {addr.reference}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-proman-navy">{jobs.length}</div>
                <div className="text-sm text-gray-600">Trabajos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">${customer.total_spent || 0}</div>
                <div className="text-sm text-gray-600">Total Gastado</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-proman-navy">{customer.rating || "—"}</div>
                <div className="text-sm text-gray-600">Calificación</div>
              </CardContent>
            </Card>
          </div>

          {/* Jobs History */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historial de Trabajos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{job.service_type || job.rubro}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(job.created_date), "dd MMM yyyy", { locale: es })}
                        </div>
                      </div>
                      <Badge className={
                        job.status === "completado" ? "bg-green-100 text-green-800" :
                        job.status === "en_proceso" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      }>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
