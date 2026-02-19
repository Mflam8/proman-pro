import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths,
  startOfWeek, endOfWeek
} from "date-fns";
import { es } from "date-fns/locale";

const RESTAURANTES = ["McDonald's", "Panda Express", "Otro"];

export default function NewCorporateJobModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState([defaultJob()]);

  function defaultJob() {
    return {
      restaurant_name: "",
      location_name: "",
      scheduled_date: "",
      message: "",
      scheduled_by_name: "",
      scheduled_by_lastname: "",
    };
  }

  const updateJob = (idx, field, value) => {
    setJobs(prev => prev.map((j, i) => i === idx ? { ...j, [field]: value } : j));
  };

  const addJob = () => {
    // Copiar la fecha y restaurante del último trabajo para agilizar
    const last = jobs[jobs.length - 1];
    setJobs(prev => [...prev, { ...defaultJob(), scheduled_date: last.scheduled_date, restaurant_name: last.restaurant_name }]);
  };

  const removeJob = (idx) => {
    if (jobs.length === 1) return;
    setJobs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    for (const job of jobs) {
      if (!job.restaurant_name || !job.location_name || !job.scheduled_date || !job.message) {
        alert("⚠️ Completa todos los campos obligatorios en cada trabajo.");
        return;
      }
    }

    setIsSaving(true);
    try {
      for (const job of jobs) {
        await base44.entities.ClientInquiry.create({
          ...job,
          rubro: "Restaurantes",
          lead_source: "corporativo",
          source: "manual",
          status: "agendado",
          scheduled_start_time: "19:00",
          estimated_duration_hours: 4,
          service_type: "Mantenimiento nocturno",
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["corporate-reports"] });
      await queryClient.invalidateQueries({ queryKey: ["clientInquiries"] });
      onClose();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Calendar helpers
  const calendarDays = (() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  })();

  const setDateForJob = (idx, dateStr) => updateJob(idx, "scheduled_date", dateStr);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5 text-blue-600" />
            Nuevo Trabajo Corporativo
          </DialogTitle>
        </DialogHeader>

        {/* Mini calendar shared for date picking */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <Button type="button" variant="ghost" size="sm" className="text-white hover:bg-blue-500"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="font-bold capitalize text-lg">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </span>
            <Button type="button" variant="ghost" size="sm" className="text-white hover:bg-blue-500"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map(d => (
              <div key={d} className="text-xs font-bold opacity-70 py-1">{d}</div>
            ))}
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelectedAny = jobs.some(j => j.scheduled_date === dateStr);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    // Si hay un trabajo sin fecha, asignarle a ese; sino al primero
                    const emptyIdx = jobs.findIndex(j => !j.scheduled_date);
                    const targetIdx = emptyIdx >= 0 ? emptyIdx : 0;
                    setDateForJob(targetIdx, dateStr);
                  }}
                  className={`
                    text-sm py-1.5 rounded-lg transition-all font-medium
                    ${!isCurrentMonth ? "opacity-30" : ""}
                    ${isSelectedAny ? "bg-white text-blue-700 font-bold shadow" : "hover:bg-blue-500"}
                    ${isToday && !isSelectedAny ? "ring-2 ring-white/60" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
          <p className="text-xs opacity-70 mt-2 text-center">
            💡 Haz clic en una fecha del calendario para asignarla al trabajo, o escríbela directamente
          </p>
        </div>

        {/* Job forms */}
        <div className="space-y-4">
          {jobs.map((job, idx) => (
            <div key={idx} className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-blue-800 text-sm">
                  Trabajo #{idx + 1}
                  {job.scheduled_date && (
                    <span className="ml-2 font-normal text-gray-600">
                      — {format(parseISO(job.scheduled_date), "d 'de' MMMM yyyy", { locale: es })}
                    </span>
                  )}
                </span>
                {jobs.length > 1 && (
                  <button type="button" onClick={() => removeJob(idx)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium">
                    ✕ Eliminar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Restaurante *</label>
                  <Select value={job.restaurant_name} onValueChange={(v) => updateJob(idx, "restaurant_name", v)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RESTAURANTES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal *</label>
                  <Input
                    className="bg-white"
                    value={job.location_name}
                    onChange={(e) => updateJob(idx, "location_name", e.target.value)}
                    placeholder="Ej: Plaza Mundo, Santa Elena..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
                  <Input
                    type="date"
                    className="bg-white"
                    value={job.scheduled_date}
                    onChange={(e) => updateJob(idx, "scheduled_date", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Agendado por (Nombre)</label>
                  <div className="flex gap-2">
                    <Input
                      className="bg-white"
                      value={job.scheduled_by_name}
                      onChange={(e) => updateJob(idx, "scheduled_by_name", e.target.value)}
                      placeholder="Nombre"
                    />
                    <Input
                      className="bg-white"
                      value={job.scheduled_by_lastname}
                      onChange={(e) => updateJob(idx, "scheduled_by_lastname", e.target.value)}
                      placeholder="Apellido"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción del trabajo *</label>
                <Textarea
                  className="bg-white"
                  value={job.message}
                  onChange={(e) => updateJob(idx, "message", e.target.value)}
                  placeholder="Ej: Limpieza y mantenimiento de trampa de grasa..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add another job */}
        <Button
          type="button"
          variant="outline"
          onClick={addJob}
          className="w-full border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar otro trabajo para el mismo día u otra fecha
        </Button>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSaving ? "Guardando..." : `Guardar ${jobs.length > 1 ? `${jobs.length} trabajos` : "trabajo"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}