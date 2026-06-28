import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Clock, Sparkles } from "lucide-react";

const DAYS_MAP = { 0: "domingo", 1: "lunes", 2: "martes", 3: "miercoles", 4: "jueves", 5: "viernes", 6: "sabado" };
const ACTIVE_STATUSES = ["nuevo", "agendado", "en_ruta", "en_sitio", "en_proceso", "trabajo_aprobado", "pendiente_facturacion"];

export default function EmployeeSelector({ selectedDate, startTime, duration, serviceType, onSelect, currentAssignee }) {
  const readyForRecommendations = Boolean(selectedDate && startTime);

  const { data: employees = [] } = useQuery({
    queryKey: ['employeesWithProfiles'],
    queryFn: async () => {
      const [usersResponse, employeeProfiles] = await Promise.all([
        base44.functions.invoke('listAllUsers', {}),
        base44.entities.Employee.list()
      ]);
      const profilesByEmail = Object.fromEntries(employeeProfiles.map((item) => [item.email, item]));
      return (usersResponse.data.users || [])
        .filter((user) => user.employee_type === 'Empleado' || user.employee_type === 'Supervisor')
        .map((user) => ({ ...user, profile: profilesByEmail[user.email] || null }));
    },
    enabled: readyForRecommendations,
    initialData: []
  });

  const { data: allSchedules = [] } = useQuery({ queryKey: ['allSchedules'], queryFn: () => base44.entities.EmployeeSchedule.list(), enabled: readyForRecommendations, initialData: [] });
  const { data: allInquiries = [] } = useQuery({ queryKey: ['assignmentLoad'], queryFn: () => base44.entities.ClientInquiry.list('-updated_date', 500), enabled: readyForRecommendations, initialData: [] });

  const scoredEmployees = useMemo(() => employees.map((employee) => {
    if (!selectedDate || !startTime) return { employee, availability: null, score: 0, workload: 0, specialtyMatch: false };
    const date = new Date(selectedDate);
    const dayOfWeek = DAYS_MAP[date.getDay()];
    const schedule = allSchedules.find((item) => item.employee_email === employee.email && item.day_of_week === dayOfWeek && item.is_available);
    if (!schedule) {
      return { employee, availability: { available: false, reason: 'No trabaja este día' }, score: -1, workload: 0, specialtyMatch: false };
    }

    const toMinutes = (value) => {
      const [hours, minutes] = String(value || '00:00').split(':').map(Number);
      return (hours * 60) + minutes;
    };

    const workStart = toMinutes(startTime);
    const workEnd = workStart + (Number(duration || 2) * 60);
    const scheduleStart = toMinutes(schedule.start_time);
    const scheduleEnd = toMinutes(schedule.end_time);
    if (workStart < scheduleStart || workEnd > scheduleEnd) {
      return { employee, availability: { available: false, reason: `Horario ${schedule.start_time}-${schedule.end_time}` }, score: -1, workload: 0, specialtyMatch: false };
    }

    const workload = allInquiries.filter((item) => item.assigned_to === employee.email && ACTIVE_STATUSES.includes(item.status)).length;
    const specialties = (employee.profile?.specialties || []).map((item) => String(item).toLowerCase());
    const specialtyMatch = serviceType ? specialties.some((item) => String(serviceType).toLowerCase().includes(item) || item.includes(String(serviceType).toLowerCase())) : false;
    const baseScore = 100 - (workload * 10) + (specialtyMatch ? 25 : 0) + (employee.employee_type === 'Empleado' ? 10 : 0);

    return {
      employee,
      workload,
      specialtyMatch,
      score: baseScore,
      availability: { available: true, schedule }
    };
  }).sort((a, b) => b.score - a.score), [allInquiries, allSchedules, duration, employees, selectedDate, serviceType, startTime]);

  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-proman-yellow" />
        <span className="text-sm font-medium text-proman-navy">Técnicos recomendados {selectedDate && startTime ? `para ${selectedDate} · ${startTime}` : ''}</span>
      </div>
      {!selectedDate || !startTime ? <p className="text-sm text-gray-500 italic">Selecciona fecha y hora para ver recomendaciones.</p> : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {scoredEmployees.map(({ employee, availability, workload, specialtyMatch }) => {
            const isCurrentAssignee = employee.email === currentAssignee;
            return (
              <Card key={employee.email} className={`border-2 transition-all ${isCurrentAssignee ? 'border-proman-yellow bg-yellow-50' : availability?.available ? 'border-green-200 hover:border-green-400 cursor-pointer' : 'border-gray-200 opacity-60'}`} onClick={() => availability?.available && onSelect(employee.email)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-proman-navy">{employee.full_name}</span>
                        {isCurrentAssignee && <Badge className="bg-proman-yellow text-proman-navy text-xs">Asignado</Badge>}
                        {specialtyMatch && <Badge className="bg-violet-100 text-violet-900 text-xs"><Sparkles className="w-3 h-3 mr-1" />Especialidad</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Carga activa: {workload} · {employee.employee_type}</div>
                      {employee.profile?.specialties?.length > 0 && <div className="mt-1 text-xs text-gray-500">{employee.profile.specialties.join(' · ')}</div>}
                    </div>
                    <div className="text-right text-xs">
                      {availability?.available ? <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Disponible</Badge> : <div className="text-red-600">{availability?.reason || 'No disponible'}</div>}
                      {availability?.schedule && <div className="mt-1 flex items-center justify-end gap-1 text-gray-500"><Clock className="w-3 h-3" />{availability.schedule.start_time}-{availability.schedule.end_time}</div>}
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