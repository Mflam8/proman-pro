import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Save } from "lucide-react";

const DAYS = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" }
];

export default function ScheduleManager({ user }) {
  const queryClient = useQueryClient();
  const [editingSchedules, setEditingSchedules] = useState({});

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['employeeSchedule', user.email],
    queryFn: () => base44.entities.EmployeeSchedule.filter({ employee_email: user.email }),
    enabled: !!user,
  });

  const upsertSchedule = useMutation({
    mutationFn: async (data) => {
      const existing = schedules?.find(s => s.day_of_week === data.day_of_week);
      if (existing) {
        return base44.entities.EmployeeSchedule.update(existing.id, data);
      }
      return base44.entities.EmployeeSchedule.create({ ...data, employee_email: user.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSchedule'] });
    },
  });

  const handleScheduleChange = (day, field, value) => {
    setEditingSchedules(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] || schedules?.find(s => s.day_of_week === day) || { day_of_week: day, start_time: "08:00", end_time: "17:00", is_available: true }),
        [field]: value
      }
    }));
  };

  const handleSave = (day) => {
    const schedule = editingSchedules[day];
    if (schedule) {
      upsertSchedule.mutate(schedule);
      setEditingSchedules(prev => {
        const newState = { ...prev };
        delete newState[day];
        return newState;
      });
    }
  };

  const getScheduleForDay = (day) => {
    return editingSchedules[day] || schedules?.find(s => s.day_of_week === day) || {
      day_of_week: day,
      start_time: "08:00",
      end_time: "17:00",
      is_available: false
    };
  };

  if (isLoading) return <p>Cargando horario...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-proman-yellow" />
          Mi Horario Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Configura tu disponibilidad para cada día de la semana. Los trabajos se asignarán según tu horario.
        </p>

        {DAYS.map((day) => {
          const schedule = getScheduleForDay(day.value);
          const isEditing = !!editingSchedules[day.value];

          return (
            <div key={day.value} className="border rounded-2xl p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-proman-navy w-full sm:w-24">{day.label}</span>
                  <Switch
                    checked={schedule.is_available}
                    onCheckedChange={(checked) => handleScheduleChange(day.value, 'is_available', checked)}
                  />
                  <span className="text-sm text-gray-600">
                    {schedule.is_available ? "Disponible" : "No disponible"}
                  </span>
                </div>
                {isEditing && (
                  <Button
                    size="sm"
                    onClick={() => handleSave(day.value)}
                    disabled={upsertSchedule.isPending}
                    className="w-full sm:w-auto bg-proman-yellow text-proman-navy"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                )}
              </div>

              {schedule.is_available && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto_1fr] sm:items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <Input
                      type="time"
                      value={schedule.start_time}
                      onChange={(e) => handleScheduleChange(day.value, 'start_time', e.target.value)}
                      className="w-full sm:w-32"
                    />
                  </div>
                  <span className="hidden sm:block text-gray-400">a</span>
                  <Input
                    type="time"
                    value={schedule.end_time}
                    onChange={(e) => handleScheduleChange(day.value, 'end_time', e.target.value)}
                    className="w-full sm:w-32"
                  />
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Asegúrate de actualizar tu horario si cambia tu disponibilidad. 
            Esto ayuda al equipo a asignarte trabajos en los momentos correctos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}