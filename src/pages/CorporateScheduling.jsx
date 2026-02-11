import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const VALID_TOKEN = "proman2024secure";

export default function CorporateScheduling() {
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken === VALID_TOKEN) {
      setIsAuthenticated(true);
      setToken(urlToken);
    }
  }, []);

  const handleTokenSubmit = (e) => {
    e.preventDefault();
    if (token === VALID_TOKEN) {
      setIsAuthenticated(true);
    } else {
      alert('❌ Token inválido');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">🔒 Acceso Corporativo PROMAN</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Token de Acceso</label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Ingresa el token proporcionado"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Acceder
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Portal de Agendamiento Corporativo</h1>
          <p className="text-gray-600">Programa tus servicios de mantenimiento - Disponibilidad: 7:00 PM - 4:00 AM</p>
        </div>

        {showSuccess && (
          <Card className="mb-6 border-green-500 bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">✅ Servicio agendado correctamente</p>
                <p className="text-sm text-green-700">Nos pondremos en contacto para confirmar los detalles</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SchedulingForm 
            onSuccess={() => {
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 5000);
            }} 
          />
          <ScheduleList />
        </div>
      </div>
    </div>
  );
}

function SchedulingForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    scheduled_by_name: '',
    scheduled_by_lastname: '',
    restaurant_name: '',
    location: '',
    location_name: '',
    service_type: '',
    scheduled_date: '',
    scheduled_start_time: '19:00',
    estimated_duration_hours: 2,
    message: ''
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClientInquiry.create({
        ...data,
        rubro: 'Comercial',
        status: 'pendiente_agenda',
        lead_source: 'corporativo',
        source: 'manual'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['corporate-schedule']);
      setFormData({
        scheduled_by_name: '',
        scheduled_by_lastname: '',
        restaurant_name: '',
        location: '',
        location_name: '',
        service_type: '',
        scheduled_date: '',
        scheduled_start_time: '19:00',
        estimated_duration_hours: 2,
        message: ''
      });
      onSuccess();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.scheduled_by_name || !formData.scheduled_by_lastname || !formData.restaurant_name || !formData.location || !formData.scheduled_date || !formData.service_type) {
      alert('⚠️ Por favor completa todos los campos obligatorios');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Agendar Nuevo Servicio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.scheduled_by_name}
                onChange={(e) => setFormData({ ...formData, scheduled_by_name: e.target.value })}
                placeholder="Tu nombre"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.scheduled_by_lastname}
                onChange={(e) => setFormData({ ...formData, scheduled_by_lastname: e.target.value })}
                placeholder="Tu apellido"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restaurante <span className="text-red-500">*</span>
            </label>
            <Select value={formData.restaurant_name} onValueChange={(v) => setFormData({ ...formData, restaurant_name: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona restaurante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="McDonald's">McDonald's</SelectItem>
                <SelectItem value="Panda Express">Panda Express</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación (Departamento) <span className="text-red-500">*</span>
            </label>
            <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="San Salvador">San Salvador</SelectItem>
                <SelectItem value="La Libertad">La Libertad</SelectItem>
                <SelectItem value="Santa Ana">Santa Ana</SelectItem>
                <SelectItem value="San Miguel">San Miguel</SelectItem>
                <SelectItem value="Sonsonate">Sonsonate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal/Local Específico
            </label>
            <Input
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder="Ej: McDonald's Plaza Mundo, Panda Express Metrocentro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Servicio <span className="text-red-500">*</span>
            </label>
            <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fontanería">Fontanería</SelectItem>
                <SelectItem value="Electricidad">Electricidad</SelectItem>
                <SelectItem value="Limpieza de Trampas">Limpieza de Trampas</SelectItem>
                <SelectItem value="Mantenimiento General">Mantenimiento General</SelectItem>
                <SelectItem value="Reparación de Equipos">Reparación de Equipos</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Deseada <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Inicio (7:00 PM - 4:00 AM)
            </label>
            <Input
              type="time"
              value={formData.scheduled_start_time}
              onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">Horario disponible: 19:00 - 04:00</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duración Estimada (horas)
            </label>
            <Input
              type="number"
              min="1"
              max="8"
              value={formData.estimated_duration_hours}
              onChange={(e) => setFormData({ ...formData, estimated_duration_hours: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del Servicio
            </label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Describe brevemente el servicio requerido..."
              rows={4}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Agendando..." : "Confirmar Agendamiento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ScheduleList() {
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['corporate-schedule'],
    queryFn: async () => {
      const items = await base44.entities.ClientInquiry.filter({
        lead_source: 'corporativo'
      }, '-scheduled_date');
      return items.filter(item => item.scheduled_date);
    },
    initialData: [],
    refetchInterval: 30000
  });

  const handleDownload = () => {
    const csv = [
      ['Fecha', 'Hora', 'Agendado Por', 'Restaurante', 'Ubicación', 'Local', 'Servicio', 'Duración (hrs)', 'Estado'].join(','),
      ...schedules.map(s => [
        s.scheduled_date || '',
        s.scheduled_start_time || '',
        `${s.scheduled_by_name || ''} ${s.scheduled_by_lastname || ''}`.trim(),
        s.restaurant_name || '',
        s.location || '',
        s.location_name || '',
        s.service_type || '',
        s.estimated_duration_hours || '',
        s.status || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda_corporativa_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const groupedByDate = schedules.reduce((acc, item) => {
    const date = item.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Servicios Agendados
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownload}
            disabled={schedules.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-500">Cargando agenda...</p>
          </div>
        )}

        {!isLoading && schedules.length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay servicios agendados</p>
          </div>
        )}

        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {Object.keys(groupedByDate).sort().map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900">
                  {format(parseISO(date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </h3>
              </div>
              <div className="space-y-2 pl-6">
                {groupedByDate[date].map(item => (
                  <Card key={item.id} className="border-l-4 border-blue-500 bg-blue-50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-blue-900">
                              {item.scheduled_start_time} 
                              {item.estimated_duration_hours && ` (${item.estimated_duration_hours}h)`}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span>{item.location}</span>
                              {item.location_name && <span className="text-gray-500">• {item.location_name}</span>}
                            </div>
                            <p className="mt-1 font-medium">{item.service_type}</p>
                            {item.message && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.message}</p>
                            )}
                          </div>
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
  );
}