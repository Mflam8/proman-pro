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
import { Calendar, MapPin, Trash2, Edit2, Download, Building } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function CorporateSchedulingManagement() {
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['corporate-schedules-admin'],
    queryFn: async () => {
      const items = await base44.entities.ClientInquiry.filter({
        lead_source: 'corporativo'
      }, '-scheduled_date');
      return items;
    },
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientInquiry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['corporate-schedules-admin']);
      queryClient.invalidateQueries(['clientInquiries']);
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientInquiry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['corporate-schedules-admin']);
      queryClient.invalidateQueries(['clientInquiries']);
    },
  });

  const handleDownload = () => {
    const csv = [
      ['Fecha', 'Agendado Por', 'Restaurante', 'Sucursal', 'Descripción', 'Estado', 'ID'].join(','),
      ...schedules.map(s => [
        s.scheduled_date || '',
        `${s.scheduled_by_name || ''} ${s.scheduled_by_lastname || ''}`.trim(),
        s.restaurant_name || '',
        s.location_name || '',
        s.message || '',
        s.status || '',
        s.id || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agendamientos_corporativos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleDelete = (item) => {
    if (confirm(`¿Eliminar agendamiento de ${item.restaurant_name} - ${item.location_name}?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const filteredSchedules = schedules.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    return (
      s.restaurant_name?.toLowerCase().includes(searchLower) ||
      s.location_name?.toLowerCase().includes(searchLower) ||
      s.scheduled_by_name?.toLowerCase().includes(searchLower) ||
      s.scheduled_by_lastname?.toLowerCase().includes(searchLower) ||
      s.scheduled_date?.includes(searchTerm)
    );
  });

  const groupedByDate = filteredSchedules.reduce((acc, item) => {
    const date = item.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">📅 Agendamientos Corporativos</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Gestión completa de servicios agendados por McDonald's y Panda Express
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleDownload}
              disabled={schedules.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar por restaurante, sucursal, fecha o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-proman-navy">{schedules.length}</div>
                <div className="text-sm text-gray-600">Total Agendamientos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {schedules.filter(s => s.restaurant_name === "McDonald's").length}
                </div>
                <div className="text-sm text-gray-600">McDonald's</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-600">
                  {schedules.filter(s => s.restaurant_name === "Panda Express").length}
                </div>
                <div className="text-sm text-gray-600">Panda Express</div>
              </CardContent>
            </Card>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando agendamientos...</p>
            </div>
          )}

          {!isLoading && filteredSchedules.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? "No se encontraron resultados" : "No hay agendamientos corporativos"}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {Object.keys(groupedByDate).sort().reverse().map(date => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gray-50 py-2 px-3 rounded-lg">
                  <Calendar className="w-5 h-5 text-proman-yellow" />
                  <h3 className="font-bold text-proman-navy text-lg">
                    {format(parseISO(date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                  </h3>
                  <Badge className="ml-2">{groupedByDate[date].length} servicio(s)</Badge>
                </div>
                
                <div className="space-y-3 pl-6">
                  {groupedByDate[date].map(item => (
                    <Card key={item.id} className={`border-l-4 ${
                      item.restaurant_name === "McDonald's" ? "border-yellow-500 bg-yellow-50" : "border-red-500 bg-red-50"
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Building className={`w-6 h-6 ${
                                item.restaurant_name === "McDonald's" ? "text-yellow-600" : "text-red-600"
                              }`} />
                              <div>
                                <h4 className="font-bold text-lg text-proman-navy">
                                  {item.restaurant_name}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4" />
                                  <span className="font-medium">{item.location_name}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                              <div>
                                <span className="text-gray-500">Agendado por:</span>
                                <p className="font-medium text-gray-800">
                                  {item.scheduled_by_name} {item.scheduled_by_lastname}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Estado:</span>
                                <p>
                                  <Badge className={
                                    item.status === 'completado' ? 'bg-green-100 text-green-800' :
                                    item.status === 'en_proceso' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {item.status}
                                  </Badge>
                                </p>
                              </div>
                            </div>

                            {item.message && (
                              <div className="mt-3 p-2 bg-white rounded border">
                                <span className="text-xs text-gray-500 font-semibold">Descripción:</span>
                                <p className="text-sm text-gray-700 mt-1">{item.message}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingItem(item)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {editingItem && (
        <EditScheduleModal
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(data) => updateMutation.mutate({ id: editingItem.id, data })}
          isSaving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditScheduleModal({ item, isOpen, onClose, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    scheduled_by_name: item.scheduled_by_name || '',
    scheduled_by_lastname: item.scheduled_by_lastname || '',
    restaurant_name: item.restaurant_name || '',
    location_name: item.location_name || '',
    scheduled_date: item.scheduled_date || '',
    message: item.message || '',
    status: item.status || 'pendiente_agenda'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Agendamiento Corporativo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <Input
                value={formData.scheduled_by_name}
                onChange={(e) => setFormData({ ...formData, scheduled_by_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Apellido</label>
              <Input
                value={formData.scheduled_by_lastname}
                onChange={(e) => setFormData({ ...formData, scheduled_by_lastname: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Restaurante</label>
            <Select 
              value={formData.restaurant_name} 
              onValueChange={(v) => setFormData({ ...formData, restaurant_name: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="McDonald's">McDonald's</SelectItem>
                <SelectItem value="Panda Express">Panda Express</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sucursal</label>
            <Input
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fecha del Servicio</label>
            <Input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Estado del Trabajo</label>
            <Select 
              value={formData.status} 
              onValueChange={(v) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente_agenda">Pendiente de Agenda</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción del Trabajo</label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-proman-yellow text-proman-navy"
              disabled={isSaving}
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}