import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from "date-fns";
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
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formData, setFormData] = useState({
    scheduled_by_name: '',
    scheduled_by_lastname: '',
    restaurant_name: '',
    location_name: '',
    scheduled_date: '',
    message: ''
  });

  const queryClient = useQueryClient();

  const { data: schedules } = useQuery({
    queryKey: ['corporate-schedule-form'],
    queryFn: async () => {
      const items = await base44.entities.ClientInquiry.filter({
        lead_source: 'corporativo'
      });
      return items.filter(item => item.scheduled_date);
    },
    initialData: [],
  });

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
        location_name: '',
        scheduled_date: '',
        message: ''
      });
      onSuccess();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.scheduled_by_name || !formData.scheduled_by_lastname || !formData.restaurant_name || !formData.location_name || !formData.scheduled_date || !formData.message) {
      alert('⚠️ Por favor completa todos los campos obligatorios');
      return;
    }
    createMutation.mutate({
      ...formData,
      scheduled_start_time: '19:00',
      estimated_duration_hours: 4,
      service_type: 'Mantenimiento nocturno'
    });
  };

  const getDaysInView = () => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const getSchedulesForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(s => s.scheduled_date === dateStr);
  };

  const days = getDaysInView();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Selecciona una Fecha
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'month' ? 'default' : 'outline'}
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' ? 'bg-blue-600' : ''}
            >
              Mes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'week' ? 'default' : 'outline'}
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'bg-blue-600' : ''}
            >
              Semana
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'day' ? 'default' : 'outline'}
              onClick={() => setViewMode('day')}
              className={viewMode === 'day' ? 'bg-blue-600' : ''}
            >
              Día
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg">
          <Button type="button" variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-bold text-lg text-gray-900">
            {viewMode === 'month' && format(currentDate, "MMMM yyyy", { locale: es })}
            {viewMode === 'week' && `${format(startOfWeek(currentDate), "d MMM", { locale: es })} - ${format(endOfWeek(currentDate), "d MMM yyyy", { locale: es })}`}
            {viewMode === 'day' && format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="mb-6">
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-1">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
              {days.map((day, idx) => {
                const daySchedules = getSchedulesForDate(day);
                const isSelected = formData.scheduled_date === format(day, 'yyyy-MM-dd');
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isPast = day < new Date() && !isSameDay(day, new Date());
                
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isPast}
                    onClick={() => setFormData({ ...formData, scheduled_date: format(day, 'yyyy-MM-dd') })}
                    className={`
                      relative p-2 min-h-[60px] text-sm border rounded transition-all
                      ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
                      ${isPast ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-500'}
                      ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}
                      ${isToday && !isSelected ? 'border-2 border-blue-400' : ''}
                    `}
                  >
                    <div className="font-semibold">{format(day, 'd')}</div>
                    {daySchedules.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                        {daySchedules.slice(0, 3).map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, idx) => {
                const daySchedules = getSchedulesForDate(day);
                const isSelected = formData.scheduled_date === format(day, 'yyyy-MM-dd');
                const isToday = isSameDay(day, new Date());
                const isPast = day < new Date() && !isSameDay(day, new Date());
                
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isPast}
                    onClick={() => setFormData({ ...formData, scheduled_date: format(day, 'yyyy-MM-dd') })}
                    className={`
                      p-3 border rounded-lg transition-all min-h-[100px]
                      ${isPast ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-500'}
                      ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}
                      ${isToday && !isSelected ? 'border-2 border-blue-400' : ''}
                    `}
                  >
                    <div className="text-xs font-medium">{format(day, 'EEE', { locale: es })}</div>
                    <div className="text-2xl font-bold mt-1">{format(day, 'd')}</div>
                    {daySchedules.length > 0 && (
                      <div className={`text-xs mt-2 ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                        {daySchedules.length} servicio{daySchedules.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, scheduled_date: format(currentDate, 'yyyy-MM-dd') })}
                className={`
                  w-full p-6 border-2 rounded-lg transition-all
                  ${formData.scheduled_date === format(currentDate, 'yyyy-MM-dd') 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white hover:border-blue-500'}
                `}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold">{format(currentDate, 'd')}</div>
                  <div className="text-lg mt-2">{format(currentDate, 'MMMM yyyy', { locale: es })}</div>
                </div>
              </button>
              {getSchedulesForDate(currentDate).length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900">
                    {getSchedulesForDate(currentDate).length} servicio(s) ya agendado(s) este día
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Fields */}
        {formData.scheduled_date && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4"
          >
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-semibold text-blue-900">
                📅 Fecha seleccionada: {format(parseISO(formData.scheduled_date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
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
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder="Ej: Plaza Mundo, Metrocentro, Santa Elena"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del Trabajo <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Describe el trabajo a realizar..."
              rows={3}
              required
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
        )}
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
      ['Fecha', 'Agendado Por', 'Restaurante', 'Sucursal', 'Descripción'].join(','),
      ...schedules.map(s => [
        s.scheduled_date || '',
        `${s.scheduled_by_name || ''} ${s.scheduled_by_lastname || ''}`.trim(),
        s.restaurant_name || '',
        s.location_name || '',
        s.message || ''
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
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-blue-900 text-lg">{item.restaurant_name}</span>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span className="font-medium">{item.location_name}</span>
                            </div>
                            <p className="text-xs text-gray-600">Agendado por: {item.scheduled_by_name} {item.scheduled_by_lastname}</p>
                            {item.message && (
                              <p className="text-xs text-gray-600 mt-1 italic">{item.message}</p>
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