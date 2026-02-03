import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Calendar, Clock, CheckCircle } from "lucide-react";

const DAYS_MAP = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado"
};

export default function EmployeeSelector({ selectedDate, startTime, duration, onSelect, currentAssignee }) {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listAllUsers', {});
      return response.data.users.filter(u => u.employee_type === 'Empleado' || u.employee_type === 'Supervisor');
    },
    initialData: [],
  });

  const { data: allSchedules } = useQuery({
    queryKey: ['allSchedules'],
    queryFn: () => base44.entities.EmployeeSchedule.list(),
  });

  const checkAvailability = (employeeEmail) => {
    if (!selectedDate || !startTime) return null;

    const date = new Date(selectedDate);
    const dayOfWeek = DAYS_MAP[date.getDay()];
    
    const employeeSchedule = allSchedules?.find(
      s => s.employee_email === employeeEmail && 
           s.day_of_week === dayOfWeek && 
           s.is_available
    );

    if (!employeeSchedule) return { available: false, reason: "No trabaja este día" };

    const [scheduleStartH, scheduleStartM] = employeeSchedule.start_time.split(':').map(Number);
    const [scheduleEndH, scheduleEndM] = employeeSchedule.end_time.split(':').map(Number);
    const [workStartH, workStartM] = startTime.split(':').map(Number);

    const scheduleStart = scheduleStartH * 60 + scheduleStartM;
    const scheduleEnd = scheduleEndH * 60 + scheduleEndM;
    const workStart = workStartH * 60 + workStartM;
    const workEnd = workStart + (duration || 2) * 60;

    if (workStart < scheduleStart || workEnd > scheduleEnd) {
      return { 
        available: false, 
        reason: `Solo trabaja ${employeeSchedule.start_time}-${employeeSchedule.end_time}` 
      };
    }

    return { available: true, schedule: employeeSchedule };
  };

  if (!employees) return <p>Cargando empleados...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-proman-yellow" />
        <span className="text-sm font-medium text-proman-navy">
          Empleados disponibles {selectedDate && startTime ? `para ${selectedDate} a las ${startTime}` : ''}
        </span>
      </div>

      {!selectedDate || !startTime ? (
        <p className="text-sm text-gray-500 italic">
          Selecciona fecha y hora para ver disponibilidad
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {employees.map((emp) => {
            const availability = checkAvailability(emp.email);
            const isCurrentAssignee = emp.email === currentAssignee;

            return (
              <Card 
                key={emp.email} 
                className={`border-2 transition-all ${
                  isCurrentAssignee ? 'border-proman-yellow bg-yellow-50' : 
                  availability?.available ? 'border-green-200 hover:border-green-400 cursor-pointer' : 
                  'border-gray-200 opacity-60'
                }`}
                onClick={() => availability?.available && onSelect(emp.email)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.profile_picture_url || `https://ui-avatars.com/api/?name=${emp.full_name}&background=fdc80c&color=252a5c&size=40`}
                        alt={emp.full_name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-proman-navy">{emp.full_name}</span>
                          {isCurrentAssignee && (
                            <Badge className="bg-proman-yellow text-proman-navy text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Asignado
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{emp.role}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      {availability?.available ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Disponible
                        </Badge>
                      ) : (
                        <div className="text-xs text-red-600">
                          {availability?.reason || "No disponible"}
                        </div>
                      )}
                      {availability?.schedule && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {availability.schedule.start_time}-{availability.schedule.end_time}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}