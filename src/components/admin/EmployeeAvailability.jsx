import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

const DAYS_MAP = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
  domingo: "Dom"
};

export default function EmployeeAvailability({ employeeEmail }) {
  const { data: schedules } = useQuery({
    queryKey: ['employeeSchedule', employeeEmail],
    queryFn: () => base44.entities.EmployeeSchedule.filter({ employee_email: employeeEmail }),
    enabled: !!employeeEmail,
  });

  if (!schedules || schedules.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Sin horario configurado
      </div>
    );
  }

  const availableDays = schedules.filter(s => s.is_available);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Calendar className="w-4 h-4 text-proman-yellow" />
        <span className="font-medium">Disponibilidad:</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {availableDays.map((schedule) => (
          <Badge key={schedule.id} variant="outline" className="text-xs">
            {DAYS_MAP[schedule.day_of_week]} {schedule.start_time}-{schedule.end_time}
          </Badge>
        ))}
      </div>
      {availableDays.length === 0 && (
        <p className="text-xs text-gray-500 italic">No hay días disponibles</p>
      )}
    </div>
  );
}