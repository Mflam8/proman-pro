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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Portal de Agendamiento Corporativo</h1>
          <p className="text-sm sm:text-base text-gray-600">Programa tus servicios de mantenimiento - Disponibilidad: 7:00 PM - 4:00 AM</p>
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

        <div className="grid grid-cols-1 gap-6">
          <SchedulingForm 
            onSuccess={() => {
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 5000);
            }} 
          />
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

  const isDayBlocked = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.some(s => s.scheduled_date === dateStr);
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
    <Card className="shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span className="text-lg sm:text-xl">Selecciona una Fecha</span>
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'month' ? 'default' : 'outline'}
              onClick={() => setViewMode('month')}
              className={`flex-1 sm:flex-none ${viewMode === 'month' ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-500 text-white hover:bg-blue-400 border-white/20'}`}
            >
              Mes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'week' ? 'default' : 'outline'}
              onClick={() => setViewMode('week')}
              className={`flex-1 sm:flex-none ${viewMode === 'week' ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-500 text-white hover:bg-blue-400 border-white/20'}`}
            >
              Semana
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'day' ? 'default' : 'outline'}
              onClick={() => setViewMode('day')}
              className={`flex-1 sm:flex-none ${viewMode === 'day' ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-500 text-white hover:bg-blue-400 border-white/20'}`}
            >
              Día
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
          <Button type="button" variant="outline" size="sm" onClick={handlePrevious} className="hover:bg-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h3 className="font-bold text-base sm:text-lg text-gray-900 text-center px-2 capitalize">
            {viewMode === 'month' && format(currentDate, "MMMM yyyy", { locale: es })}
            {viewMode === 'week' && `${format(startOfWeek(currentDate), "d MMM", { locale: es })} - ${format(endOfWeek(currentDate), "d MMM yyyy", { locale: es })}`}
            {viewMode === 'day' && format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={handleNext} className="hover:bg-white">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="mb-6">
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 bg-gray-200 p-0.5 sm:p-1 rounded-lg">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-gray-700 py-1 sm:py-2 bg-gray-100">
                  {day}
                </div>
              ))}
              {days.map((day, idx) => {
                const daySchedules = getSchedulesForDate(day);
                const isSelected = formData.scheduled_date === format(day, 'yyyy-MM-dd');
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isPast = day < new Date() && !isSameDay(day, new Date());
                const isBlocked = isDayBlocked(day);
                
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isPast || isBlocked}
                    onClick={() => !isBlocked && setFormData({ ...formData, scheduled_date: format(day, 'yyyy-MM-dd') })}
                    className={`
                      relative p-1.5 sm:p-2 min-h-[50px] sm:min-h-[65px] text-xs sm:text-sm transition-all
                      ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
                      ${isPast ? 'opacity-30 cursor-not-allowed bg-gray-100' : ''}
                      ${isBlocked && !isPast ? 'bg-red-50 text-red-400 cursor-not-allowed opacity-60' : ''}
                      ${!isPast && !isBlocked ? 'hover:scale-105 hover:shadow-md active:scale-95' : ''}
                      ${isSelected ? 'bg-blue-600 text-white shadow-lg scale-105 ring-2 ring-blue-400' : 'bg-white'}
                      ${isToday && !isSelected && !isBlocked ? 'ring-2 ring-blue-300 font-bold' : ''}
                    `}
                  >
                    <div className="font-semibold">{format(day, 'd')}</div>
                    {isBlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[10px] sm:text-xs font-bold text-red-500 bg-white/80 px-1 rounded">Ocupado</div>
                      </div>
                    )}
                    {daySchedules.length > 0 && !isBlocked && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
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
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {days.map((day, idx) => {
                const daySchedules = getSchedulesForDate(day);
                const isSelected = formData.scheduled_date === format(day, 'yyyy-MM-dd');
                const isToday = isSameDay(day, new Date());
                const isPast = day < new Date() && !isSameDay(day, new Date());
                const isBlocked = isDayBlocked(day);
                
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isPast || isBlocked}
                    onClick={() => !isBlocked && setFormData({ ...formData, scheduled_date: format(day, 'yyyy-MM-dd') })}
                    className={`
                      p-2 sm:p-3 border-2 rounded-xl transition-all min-h-[90px] sm:min-h-[110px] relative
                      ${isPast ? 'opacity-30 cursor-not-allowed bg-gray-100' : ''}
                      ${isBlocked && !isPast ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-60' : ''}
                      ${!isPast && !isBlocked ? 'hover:scale-105 hover:shadow-lg active:scale-95' : ''}
                      ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-xl scale-105' : 'bg-white border-gray-200'}
                      ${isToday && !isSelected && !isBlocked ? 'border-blue-400 ring-2 ring-blue-200' : ''}
                    `}
                  >
                    <div className="text-[10px] sm:text-xs font-semibold uppercase">{format(day, 'EEE', { locale: es })}</div>
                    <div className="text-xl sm:text-3xl font-bold mt-1">{format(day, 'd')}</div>
                    {isBlocked && (
                      <div className="text-[10px] sm:text-xs font-bold text-red-600 mt-1">Ocupado</div>
                    )}
                    {daySchedules.length > 0 && !isBlocked && (
                      <div className={`text-[10px] sm:text-xs mt-2 font-medium ${isSelected ? 'text-white' : 'text-blue-600'}`}>
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
              {isDayBlocked(currentDate) ? (
                <div className="bg-red-50 border-2 border-red-200 p-8 rounded-2xl text-center">
                  <div className="text-6xl mb-3">🚫</div>
                  <h3 className="text-xl font-bold text-red-900 mb-2">Día Ocupado</h3>
                  <p className="text-red-700">Ya existe un servicio agendado para este día</p>
                  <p className="text-sm text-red-600 mt-2">Selecciona otra fecha disponible</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, scheduled_date: format(currentDate, 'yyyy-MM-dd') })}
                  className={`
                    w-full p-8 sm:p-10 border-4 rounded-2xl transition-all
                    ${formData.scheduled_date === format(currentDate, 'yyyy-MM-dd') 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xl scale-105' 
                      : 'bg-white hover:border-blue-500 hover:shadow-xl hover:scale-102 active:scale-98 border-gray-300'}
                  `}
                >
                  <div className="text-center">
                    <div className="text-5xl sm:text-6xl font-bold">{format(currentDate, 'd')}</div>
                    <div className="text-lg sm:text-xl mt-3 capitalize">{format(currentDate, "EEEE", { locale: es })}</div>
                    <div className="text-base sm:text-lg opacity-80 capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Form Fields */}
        {formData.scheduled_date && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t-2 border-blue-100 pt-6 mt-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-xl mb-4 text-white shadow-lg">
              <p className="text-sm sm:text-base font-bold capitalize">
                📅 {format(parseISO(formData.scheduled_date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </p>
              <p className="text-xs opacity-90 mt-1">Horario: 7:00 PM - 4:00 AM</p>
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
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-6 text-lg shadow-xl hover:shadow-2xl transition-all"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "⏳ Agendando..." : "✅ Confirmar Agendamiento"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}