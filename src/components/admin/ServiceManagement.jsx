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
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox import
import { Label } from "@/components/ui/label"; // Added Label import
import { Plus, Edit2, Clock, DollarSign, Wrench, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const complexityConfig = {
  basico: { label: "Básico", color: "bg-blue-100 text-blue-800", icon: "⭐" },
  medio: { label: "Medio", color: "bg-yellow-100 text-yellow-800", icon: "⭐⭐" },
  complejo: { label: "Complejo", color: "bg-orange-100 text-orange-800", icon: "⭐⭐⭐" },
  experto: { label: "Experto", color: "bg-red-100 text-red-800", icon: "⭐⭐⭐⭐" }
};

export default function ServiceManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  // Removed filterRubro state, replaced by activeTab
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('-created_date'),
    initialData: [],
  });

  const createService = useMutation({
    mutationFn: (data) => base44.entities.Service.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowCreateModal(false);
      alert('✅ Servicio creado correctamente');
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      alert('❌ Error al crear servicio: ' + (error.message || 'Error desconocido'));
    },
  });

  const updateService = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Service.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditingService(null);
      alert('✅ Servicio actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      alert('❌ Error al actualizar servicio: ' + (error.message || 'Error desconocido'));
    },
  });

  // Services filtered only by search term, tabs will handle rubro filtering
  const searchedServices = services.filter(s => {
    return searchTerm === "" ||
      s.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: services.length,
    byRubro: {
      hogar: services.filter(s => s.rubros?.includes("Hogar")).length,
      comercial: services.filter(s => s.rubros?.includes("Comercial")).length,
      restaurantes: services.filter(s => s.rubros?.includes("Restaurantes")).length,
      hospitales: services.filter(s => s.rubros?.includes("Hospitales")).length,
      emergencias: services.filter(s => s.rubros?.includes("Emergencias")).length,
    },
    avgHours: services.length > 0 ?
      (services.reduce((sum, s) => sum + (s.estimated_hours || 0), 0) / services.length).toFixed(1) : 0,
    avgPrice: services.length > 0 ?
      (services.reduce((sum, s) => sum + (s.base_price || 0), 0) / services.length).toFixed(0) : 0,
  };

  const rubros = ["Hogar", "Comercial", "Restaurantes", "Hospitales", "Emergencias"];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-proman-yellow flex items-center justify-center">
                <Wrench className="w-5 h-5 text-proman-navy" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.total}</div>
                <div className="text-xs text-gray-600">Servicios</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.avgHours}h</div>
                <div className="text-xs text-gray-600">Promedio duración</div>
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
                <div className="text-2xl font-bold text-proman-navy">${stats.avgPrice}</div>
                <div className="text-xs text-gray-600">Precio promedio</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hexagon bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{stats.byRubro.hogar}</div>
                <div className="text-xs text-gray-600">Servicios hogar</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Catálogo de Servicios</CardTitle>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-proman-yellow text-proman-navy hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Servicio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            {/* Removed the old Select for filtering by rubro */}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-4">
              <TabsTrigger value="all">Todos</TabsTrigger>
              {rubros.map(rubro => (
                <TabsTrigger key={rubro} value={rubro}>{rubro}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <div className="grid gap-4">
                {searchedServices.map((service) => (
                  <Card key={service.id} className="border-2 border-gray-100 hover:border-proman-yellow transition-all">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="flex flex-wrap gap-2">
                              {service.rubros?.map(rubro => (
                                <Badge key={rubro} className="bg-proman-navy text-white">{rubro}</Badge>
                              ))}
                              <Badge className={complexityConfig[service.complexity_level]?.color}>
                                {complexityConfig[service.complexity_level]?.icon} {complexityConfig[service.complexity_level]?.label}
                              </Badge>
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-proman-navy mb-1">
                            {service.service_name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {service.description}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock className="w-4 h-4 text-proman-yellow" />
                              <span className="font-medium">{service.estimated_hours}h</span>
                            </div>
                            {service.base_price && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="font-medium">${service.base_price}</span>
                              </div>
                            )}
                            {service.price_range_min && service.price_range_max && (
                              <div className="text-xs text-gray-500 col-span-2">
                                Rango: ${service.price_range_min} - ${service.price_range_max}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingService(service)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {searchedServices.length === 0 && !isLoading && (
                <p className="text-center text-gray-500 py-8">No se encontraron servicios</p>
              )}
            </TabsContent>

            {rubros.map(rubro => (
              <TabsContent key={rubro} value={rubro}>
                <div className="grid gap-4">
                  {searchedServices
                    .filter(s => s.rubros?.includes(rubro)) // Filter services by selected rubro
                    .map((service) => (
                      <Card key={service.id} className="border-2 border-gray-100 hover:border-proman-yellow transition-all">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3 mb-2">
                                <div className="flex flex-wrap gap-2">
                                  {service.rubros?.map(r => ( // Display all rubros for the service
                                    <Badge key={r} className="bg-proman-navy text-white">{r}</Badge>
                                  ))}
                                  <Badge className={complexityConfig[service.complexity_level]?.color}>
                                    {complexityConfig[service.complexity_level]?.icon} {complexityConfig[service.complexity_level]?.label}
                                  </Badge>
                                </div>
                              </div>
                              <h3 className="text-lg font-bold text-proman-navy mb-1">
                                {service.service_name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">
                                {service.description}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Clock className="w-4 h-4 text-proman-yellow" />
                                  <span className="font-medium">{service.estimated_hours}h</span>
                                </div>
                                {service.base_price && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                    <span className="font-medium">${service.base_price}</span>
                                  </div>
                                )}
                                {service.price_range_min && service.price_range_max && (
                                  <div className="text-xs text-gray-500 col-span-2">
                                    Rango: ${service.price_range_min} - ${service.price_range_max}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingService(service)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                {searchedServices.filter(s => s.rubros?.includes(rubro)).length === 0 && !isLoading && (
                  <p className="text-center text-gray-500 py-8">No se encontraron servicios en este rubro.</p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Modals */}
      {showCreateModal && (
        <ServiceFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={createService.mutate}
          isSubmitting={createService.isPending}
        />
      )}

      {editingService && (
        <ServiceFormModal
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          service={editingService}
          onSubmit={(data) => updateService.mutate({ id: editingService.id, data })}
          isSubmitting={updateService.isPending}
        />
      )}
    </div>
  );
}

function ServiceFormModal({ isOpen, onClose, service, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState(service || {
    rubros: [], // Changed from 'rubro' to 'rubros' (array)
    service_name: "",
    description: "",
    complexity_level: "medio",
    estimated_hours: "",
    base_price: "",
    price_range_min: "",
    price_range_max: "",
    is_active: true
  });

  const rubros = ["Hogar", "Comercial", "Restaurantes", "Hospitales", "Emergencias"];

  const handleRubroToggle = (rubro) => {
    const currentRubros = formData.rubros || [];
    const newRubros = currentRubros.includes(rubro)
      ? currentRubros.filter(r => r !== rubro)
      : [...currentRubros, rubro];
    setFormData({...formData, rubros: newRubros});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.rubros.length === 0) {
      alert('Debes seleccionar al menos un rubro');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Editar Servicio" : "Crear Nuevo Servicio"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rubros Checkboxes */}
          <div>
            <Label className="block text-sm font-medium text-proman-navy mb-3">
              Rubros Aplicables * <span className="text-xs text-gray-500">(Selecciona uno o más)</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {rubros.map(rubro => (
                <div key={rubro} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rubro-${rubro}`}
                    checked={formData.rubros?.includes(rubro)}
                    onCheckedChange={() => handleRubroToggle(rubro)}
                  />
                  <Label
                    htmlFor={`rubro-${rubro}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {rubro}
                  </Label>
                </div>
              ))}
            </div>
            {formData.rubros?.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Debes seleccionar al menos un rubro</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-proman-navy mb-2">Nivel de Complejidad</Label>
              <Select
                value={formData.complexity_level}
                onValueChange={(value) => setFormData({...formData, complexity_level: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">⭐ Básico</SelectItem>
                  <SelectItem value="medio">⭐⭐ Medio</SelectItem>
                  <SelectItem value="complejo">⭐⭐⭐ Complejo</SelectItem>
                  <SelectItem value="experto">⭐⭐⭐⭐ Experto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-proman-navy mb-2">Nombre del Servicio *</Label>
            <Input
              required
              value={formData.service_name}
              onChange={(e) => setFormData({...formData, service_name: e.target.value})}
              placeholder="Ej: Destapado de Tuberías"
            />
          </div>

          <div>
            <Label className="block text-sm font-medium text-proman-navy mb-2">Descripción</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe qué incluye este servicio..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="block text-sm font-medium text-proman-navy mb-2">Horas Estimadas *</Label>
              <Input
                type="number"
                step="0.5"
                required
                value={formData.estimated_hours}
                onChange={(e) => setFormData({...formData, estimated_hours: parseFloat(e.target.value)})}
                placeholder="2.5"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium text-proman-navy mb-2">Precio Base ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.base_price || ''}
                onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value)})}
                placeholder="150"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-proman-navy mb-2">Rango Mínimo ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_range_min || ''}
                onChange={(e) => setFormData({...formData, price_range_min: parseFloat(e.target.value)})}
                placeholder="100"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-proman-navy mb-2">Rango Máximo ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_range_max || ''}
                onChange={(e) => setFormData({...formData, price_range_max: parseFloat(e.target.value)})}
                placeholder="200"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>💡 Consejo:</strong> Al seleccionar múltiples rubros, este servicio aparecerá en todos ellos. Puedes ajustar el precio base y duración según el tipo de cliente más común.
            </p>
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
              {isSubmitting ? "Guardando..." : service ? "Actualizar" : "Crear Servicio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}