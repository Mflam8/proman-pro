import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Wrench } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const statusColors = {
  nuevo: "bg-blue-500",
  evaluacion_agendada: "bg-indigo-500",
  evaluacion_pendiente: "bg-yellow-500",
  evaluacion_realizada: "bg-green-500",
  cotizacion_pendiente: "bg-orange-500",
  cotizacion_realizada: "bg-purple-500",
  trabajo_aprobado: "bg-teal-500",
  en_proceso: "bg-blue-600",
  completado: "bg-green-600"
};

export default function ScheduleCalendar({ onSelectJob }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week"); // "week" or "day"
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.filter({ employee_type: 'Empleado' }),
    initialData: [],
  });

  const { data: inquiries } = useQuery({
    queryKey: ['scheduledInquiries'],
    queryFn: () => base44.entities.ClientInquiry.filter({}),
    initialData: [],
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: [],
  });

  // Filter only scheduled jobs
  const scheduledJobs = useMemo(() => {
    return inquiries.filter(job => job.scheduled_date && job.assigned_to);
  }, [inquiries]);

  // Get week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter jobs by employee and date range
  const filteredJobs = useMemo(() => {
    let jobs = scheduledJobs;
    
    if (selectedEmployee !== "all") {
      jobs = jobs.filter(job => job.assigned_to === selectedEmployee);
    }

    if (viewMode === "week") {
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      jobs = jobs.filter(job => {
        const jobDate = parseISO(job.scheduled_date);
        return jobDate >= weekStart && jobDate <= weekEnd;
      });
    } else {
      jobs = jobs.filter(job => isSameDay(parseISO(job.scheduled_date), currentDate));
    }

    return jobs;
  }, [scheduledJobs, selectedEmployee, viewMode, currentDate, weekStart]);

  // Group jobs by employee and day
  const jobsByEmployeeAndDay = useMemo(() => {
    const grouped = {};
    
    const employeesToShow = selectedEmployee === "all" 
      ? employees 
      : employees.filter(e => e.email === selectedEmployee);

    employeesToShow.forEach(emp => {
      grouped[emp.email] = {
        employee: emp,
        days: {}
      };
      
      weekDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        grouped[emp.email].days[dateKey] = [];
      });
    });

    filteredJobs.forEach(job => {
      if (grouped[job.assigned_to]) {
        const dateKey = job.scheduled_date;
        if (grouped[job.assigned_to].days[dateKey]) {
          grouped[job.assigned_to].days[dateKey].push(job);
        }
      }
    });

    // Sort jobs by start time within each day
    Object.values(grouped).forEach(empData => {
      Object.keys(empData.days).forEach(dateKey => {
        empData.days[dateKey].sort((a, b) => {
          const timeA = a.scheduled_start_time || "00:00";
          const timeB = b.scheduled_start_time || "00:00";
          return timeA.localeCompare(timeB);
        });
      });
    });

    return grouped;
  }, [employees, filteredJobs, weekDays, selectedEmployee]);

  const getCustomerName = (job) => {
    if (job.customer_id) {
      const customer = customers.find(c => c.id === job.customer_id);
      return customer?.full_name || job.client_name || "Sin nombre";
    }
    return job.client_name || "Sin nombre";
  };

  const navigateWeek = (direction) => {
    if (direction === "prev") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const navigateDay = (direction) => {
    if (direction === "prev") {
      setCurrentDate(addDays(currentDate, -1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate hours worked per day per employee
  const getHoursForDay = (employeeEmail, dateKey) => {
    const jobs = jobsByEmployeeAndDay[employeeEmail]?.days[dateKey] || [];
    return jobs.reduce((sum, job) => sum + (job.estimated_duration_hours || 0), 0);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => viewMode === "week" ? navigateWeek("prev") : navigateDay("prev")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>Hoy</Button>
              <Button variant="outline" size="icon" onClick={() => viewMode === "week" ? navigateWeek("next") : navigateDay("next")}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-proman-navy ml-2">
                {viewMode === "week" 
                  ? `${format(weekStart, "d MMM", { locale: es })} - ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`
                  : format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
                }
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los técnicos</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.email} value={emp.email}>
                      {emp.employee_name || emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="day">Día</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-proman-navy">{filteredJobs.length}</div>
            <div className="text-sm text-gray-600">Trabajos Programados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredJobs.reduce((sum, j) => sum + (j.estimated_duration_hours || 0), 0)}h
            </div>
            <div className="text-sm text-gray-600">Horas Totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredJobs.filter(j => j.status === 'completado').length}
            </div>
            <div className="text-sm text-gray-600">Completados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredJobs.filter(j => j.status !== 'completado').length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </CardContent>
        </Card>
      </div>

      {/* Week View */}
      {viewMode === "week" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left bg-gray-50 w-40 sticky left-0">Técnico</th>
                  {weekDays.map(day => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <th 
                        key={day.toISOString()} 
                        className={`p-3 text-center border-l ${isToday ? 'bg-proman-yellow/20' : 'bg-gray-50'}`}
                      >
                        <div className="font-medium">{format(day, "EEE", { locale: es })}</div>
                        <div className={`text-lg ${isToday ? 'text-proman-navy font-bold' : ''}`}>
                          {format(day, "d")}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.values(jobsByEmployeeAndDay).map(({ employee, days }) => (
                  <tr key={employee.email} className="border-b hover:bg-gray-50">
                    <td className="p-3 bg-white sticky left-0 border-r">
                      <div className="flex items-center gap-2">
                        <img 
                          src={employee.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.employee_name || employee.full_name)}&background=fdc80c&color=252a5c&size=32`}
                          alt={employee.employee_name || employee.full_name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-sm">{employee.employee_name || employee.full_name}</div>
                          <div className="text-xs text-gray-500">{employee.email.split('@')[0]}</div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayJobs = days[dateKey] || [];
                      const totalHours = getHoursForDay(employee.email, dateKey);
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                        <td 
                          key={dateKey} 
                          className={`p-2 border-l align-top ${isToday ? 'bg-proman-yellow/10' : ''}`}
                        >
                          {dayJobs.length > 0 && (
                            <div className="space-y-1">
                              {dayJobs.map(job => (
                                <div 
                                  key={job.id}
                                  onClick={() => onSelectJob?.(job)}
                                  className={`p-2 rounded-lg text-white text-xs cursor-pointer hover:opacity-80 transition-opacity ${statusColors[job.status] || 'bg-gray-500'}`}
                                >
                                  <div className="font-semibold truncate">{getCustomerName(job)}</div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    {job.scheduled_start_time || '--:--'} 
                                    {job.estimated_duration_hours && ` (${job.estimated_duration_hours}h)`}
                                  </div>
                                  <div className="truncate opacity-90">{job.service_type}</div>
                                </div>
                              ))}
                              <div className="text-xs text-gray-500 text-center pt-1">
                                Total: {totalHours}h
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {Object.keys(jobsByEmployeeAndDay).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay técnicos con trabajos programados</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.values(jobsByEmployeeAndDay).map(({ employee, days }) => {
            const dateKey = format(currentDate, 'yyyy-MM-dd');
            const dayJobs = days[dateKey] || [];
            const totalHours = dayJobs.reduce((sum, j) => sum + (j.estimated_duration_hours || 0), 0);
            
            return (
              <Card key={employee.email}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={employee.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.employee_name || employee.full_name)}&background=fdc80c&color=252a5c&size=40`}
                        alt={employee.employee_name || employee.full_name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <CardTitle className="text-base">{employee.employee_name || employee.full_name}</CardTitle>
                        <p className="text-xs text-gray-500">{dayJobs.length} trabajos • {totalHours}h</p>
                      </div>
                    </div>
                    <Badge className={totalHours > 8 ? "bg-red-100 text-red-800" : totalHours > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {totalHours > 0 ? `${totalHours}h` : 'Libre'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {dayJobs.length > 0 ? (
                    <div className="space-y-2">
                      {dayJobs.map(job => (
                        <div 
                          key={job.id}
                          onClick={() => onSelectJob?.(job)}
                          className="p-3 border rounded-lg hover:border-proman-yellow cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-proman-navy">{getCustomerName(job)}</div>
                            <Badge className={`${statusColors[job.status]} text-white text-xs`}>
                              {job.status?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-proman-yellow" />
                              {job.scheduled_start_time || '--:--'} - {job.estimated_duration_hours}h
                            </div>
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-proman-yellow" />
                              {job.service_type}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-proman-yellow" />
                              {job.location}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Sin trabajos programados</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 justify-center">
            <span className="text-sm text-gray-600 mr-2">Estados:</span>
            {Object.entries(statusColors).slice(0, 6).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${color}`}></div>
                <span className="text-xs text-gray-600">{status.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}