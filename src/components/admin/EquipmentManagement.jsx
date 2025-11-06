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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Edit2, Package, AlertTriangle, Wrench, Zap, 
  Hammer, PaintBucket, Shield, Ruler, User, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const categoryConfig = {
  plomeria: { label: "Plomería", icon: Wrench, color: "bg-blue-100 text-blue-800" },
  electricidad: { label: "Electricidad", icon: Zap, color: "bg-yellow-100 text-yellow-800" },
  construccion: { label: "Construcción", icon: Hammer, color: "bg-gray-100 text-gray-800" },
  pintura: { label: "Pintura", icon: PaintBucket, color: "bg-purple-100 text-purple-800" },
  seguridad: { label: "Seguridad", icon: Shield, color: "bg-red-100 text-red-800" },
  medicion: { label: "Medición", icon: Ruler, color: "bg-green-100 text-green-800" },
  otro: { label: "Otro", icon: Package, color: "bg-gray-100 text-gray-800" }
};

const conditionConfig = {
  excelente: { label: "Excelente", color: "bg-green-100 text-green-800" },
  bueno: { label: "Bueno", color: "bg-blue-100 text-blue-800" },
  regular: { label: "Regular", color: "bg-yellow-100 text-yellow-800" },
  malo: { label: "Malo", color: "bg-orange-100 text-orange-800" },
  requiere_mantenimiento: { label: "Requiere Mantenimiento", color: "bg-red-100 text-red-800" }
};

export default function EquipmentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [assigningEquipment, setAssigningEquipment] = useState(null);
  const queryClient = useQueryClient();

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list('-created_date'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'Empleado' || u.role === 'Supervisor');
    },
    initialData: [],
  });

  const createEquipment = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setShowCreateModal(false);
    },
  });

  const updateEquipment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEditingEquipment(null);
      setAssigningEquipment(null);
    },
  });

  const filteredEquipment = equipment.filter(e => {
    const matchesSearch = searchTerm === "" || 
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || e.category === activeCategory;
    return matchesSearch && matchesCategory && e.is_active !== false;
  });

  const stats = {
    total: equipment.length,
    available: equipment.reduce((sum, e) => sum + (e.available_quantity || 0), 0),
    inUse: equipment.reduce((sum, e) => sum + (e.in_use_quantity || 0), 0),
    lowStock: equipment.filter(e => (e.available_quantity || 0) <= (e.min_stock_alert || 0)).length,
    needsMaintenance: equipment.filter(e => e.condition === 'requiere_mantenimiento').length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-proman-yellow flex items-center justify-center">
                <Package className="w-5 h-5 text-proman-navy" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.total}</div>
                <div className="text-xs text-gray-600">Total Equipos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-green-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                <div className="text-xs text-gray-600">Disponibles</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.inUse}</div>
                <div className="text-xs text-gray-600">En Uso</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
                <div className="text-xs text-gray-600">Stock Bajo</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-red-100 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.needsMaintenance}</div>
                <div className="text-xs text-gray-600">Mantenimiento</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Inventario de Equipos</CardTitle>
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-proman-yellow text-proman-navy hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Equipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar equipos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-6"
          />

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
            <TabsList className="grid grid-cols-4 md:grid-cols-8 bg-gray-100 w-full">
              <TabsTrigger value="all" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                Todos
              </TabsTrigger>
              {Object.entries(categoryConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <TabsTrigger 
                    key={key} 
                    value={key}
                    className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy"
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    <span className="hidden md:inline">{config.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipment.map((item) => {
              const CategoryIcon = categoryConfig[item.category]?.icon || Package;
              const isLowStock = (item.available_quantity || 0) <= (item.min_stock_alert || 0);
              
              return (
                <Card 
                  key={item.id} 
                  className={`border-2 hover:border-proman-yellow transition-all ${
                    isLowStock ? 'border-orange-300' : 'border-gray-100'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-12 h-12 hexagon ${categoryConfig[item.category]?.color || 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                          <CategoryIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-proman-navy mb-1">{item.name}</h3>
                          {item.brand && (
                            <p className="text-xs text-gray-500">{item.brand} {item.model}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingEquipment(item)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Disponibles:</span>
                        <span className={`font-bold ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
                          {item.available_quantity || 0} / {item.total_quantity || 0}
                        </span>
                      </div>
                      {(item.in_use_quantity || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">En uso:</span>
                          <span className="font-bold text-blue-600">{item.in_use_quantity}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={categoryConfig[item.category]?.color}>
                        {categoryConfig[item.category]?.label}
                      </Badge>
                      <Badge className={conditionConfig[item.condition]?.color}>
                        {conditionConfig[item.condition]?.label}
                      </Badge>
                      {isLowStock && (
                        <Badge className="bg-orange-100 text-orange-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Stock Bajo
                        </Badge>
                      )}
                    </div>

                    {item.assigned_to && item.assigned_to.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Asignado a:</p>
                        <div className="space-y-1">
                          {item.assigned_to.map((assignment, idx) => (
                            <div key={idx} className="text-xs flex items-center gap-2">
                              <User className="w-3 h-3 text-proman-yellow" />
                              <span>{assignment.employee_email} ({assignment.quantity})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setAssigningEquipment(item)}
                      >
                        Asignar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredEquipment.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No se encontraron equipos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingEquipment) && (
        <EquipmentFormModal
          equipment={editingEquipment}
          isOpen={showCreateModal || !!editingEquipment}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEquipment(null);
          }}
          onSubmit={(data) => {
            if (editingEquipment) {
              updateEquipment.mutate({ id: editingEquipment.id, data });
            } else {
              createEquipment.mutate(data);
            }
          }}
          isSubmitting={createEquipment.isPending || updateEquipment.isPending}
        />
      )}

      {/* Assign Equipment Modal */}
      {assigningEquipment && (
        <AssignEquipmentModal
          equipment={assigningEquipment}
          employees={employees}
          isOpen={!!assigningEquipment}
          onClose={() => setAssigningEquipment(null)}
          onSubmit={(data) => updateEquipment.mutate({ id: assigningEquipment.id, data })}
          isSubmitting={updateEquipment.isPending}
        />
      )}
    </div>
  );
}

function EquipmentFormModal({ equipment, isOpen, onClose, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState(equipment || {
    name: "",
    category: "plomeria",
    description: "",
    brand: "",
    model: "",
    serial_number: "",
    total_quantity: 1,
    available_quantity: 1,
    in_use_quantity: 0,
    min_stock_alert: 1,
    condition: "bueno",
    location: "",
    purchase_date: "",
    purchase_price: "",
    current_value: "",
    is_active: true,
    requires_certification: false,
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipment ? "Editar Equipo" : "Agregar Nuevo Equipo"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-proman-navy">Información Básica</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Nombre del Equipo *</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Taladro Inalámbrico"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Categoría *</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Marca</label>
                <Input
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  placeholder="DeWalt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Modelo</label>
                <Input
                  value={formData.model || ''}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="DCD771C2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Número de Serie</label>
                <Input
                  value={formData.serial_number || ''}
                  onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                  placeholder="ABC123XYZ"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-proman-navy mb-2">Descripción</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detalles del equipo..."
                rows={2}
              />
            </div>
          </div>

          {/* Inventory Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-proman-navy">Inventario</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Cantidad Total *</label>
                <Input
                  type="number"
                  required
                  min="1"
                  value={formData.total_quantity}
                  onChange={(e) => setFormData({...formData, total_quantity: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Disponibles *</label>
                <Input
                  type="number"
                  required
                  min="0"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData({...formData, available_quantity: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">En Uso</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.in_use_quantity || 0}
                  onChange={(e) => setFormData({...formData, in_use_quantity: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Alerta Stock</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_stock_alert || 1}
                  onChange={(e) => setFormData({...formData, min_stock_alert: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Condición</label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData({...formData, condition: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(conditionConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Ubicación</label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Bodega Principal, Estante A3"
                />
              </div>
            </div>
          </div>

          {/* Financial Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-proman-navy">Información Financiera</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Fecha de Compra</label>
                <Input
                  type="date"
                  value={formData.purchase_date || ''}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Precio de Compra ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price || ''}
                  onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value)})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Valor Actual ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.current_value || ''}
                  onChange={(e) => setFormData({...formData, current_value: parseFloat(e.target.value)})}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requires_certification}
                onChange={(e) => setFormData({...formData, requires_certification: e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm text-proman-navy">Requiere certificación para uso</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-proman-navy mb-2">Notas</label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-proman-yellow text-proman-navy hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : equipment ? "Actualizar" : "Crear Equipo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignEquipmentModal({ equipment, employees, isOpen, onClose, onSubmit, isSubmitting }) {
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newAssignment = {
      employee_email: employeeEmail,
      quantity: parseInt(quantity),
      assigned_date: new Date().toISOString().split('T')[0],
      expected_return_date: expectedReturnDate,
      notes
    };

    const existingAssignments = equipment.assigned_to || [];
    const newData = {
      assigned_to: [...existingAssignments, newAssignment],
      available_quantity: (equipment.available_quantity || 0) - parseInt(quantity),
      in_use_quantity: (equipment.in_use_quantity || 0) + parseInt(quantity)
    };

    onSubmit(newData);
  };

  const handleReturn = (assignment) => {
    const updatedAssignments = (equipment.assigned_to || []).filter(
      a => !(a.employee_email === assignment.employee_email && a.assigned_date === assignment.assigned_date)
    );

    const newData = {
      assigned_to: updatedAssignments,
      available_quantity: (equipment.available_quantity || 0) + assignment.quantity,
      in_use_quantity: (equipment.in_use_quantity || 0) - assignment.quantity
    };

    onSubmit(newData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asignar Equipo: {equipment.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-proman-navy">{equipment.total_quantity}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{equipment.available_quantity || 0}</div>
                <div className="text-xs text-gray-600">Disponibles</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{equipment.in_use_quantity || 0}</div>
                <div className="text-xs text-gray-600">En Uso</div>
              </div>
            </div>
          </div>

          {/* Current Assignments */}
          {equipment.assigned_to && equipment.assigned_to.length > 0 && (
            <div>
              <h3 className="font-semibold text-proman-navy mb-3">Asignaciones Actuales</h3>
              <div className="space-y-2">
                {equipment.assigned_to.map((assignment, idx) => (
                  <Card key={idx} className="border-2">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-proman-yellow" />
                          <div>
                            <div className="font-medium text-sm">{assignment.employee_email}</div>
                            <div className="text-xs text-gray-500">
                              Cantidad: {assignment.quantity} | 
                              Desde: {format(new Date(assignment.assigned_date), "dd MMM yyyy", { locale: es })}
                              {assignment.expected_return_date && ` | Retorno: ${format(new Date(assignment.expected_return_date), "dd MMM yyyy", { locale: es })}`}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReturn(assignment)}
                          disabled={isSubmitting}
                        >
                          Devolver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* New Assignment Form */}
          {(equipment.available_quantity || 0) > 0 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-semibold text-proman-navy">Nueva Asignación</h3>
              
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Empleado *</label>
                <Select
                  required
                  value={employeeEmail}
                  onValueChange={setEmployeeEmail}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.email} value={emp.email}>
                        {emp.full_name} - {emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">Cantidad *</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    max={equipment.available_quantity || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">Fecha Retorno Esperada</label>
                  <Input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">Notas</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo de asignación, proyecto, etc..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  className="bg-proman-yellow text-proman-navy hover:opacity-90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Asignando..." : "Asignar Equipo"}
                </Button>
              </div>
            </form>
          )}

          {(equipment.available_quantity || 0) === 0 && (!equipment.assigned_to || equipment.assigned_to.length === 0) && (
            <p className="text-center text-gray-500 py-4">No hay equipos disponibles para asignar</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}