import { AlertCircle, Calendar, Clock, ClipboardCheck, FileText, FileCheck, ThumbsUp, CheckCircle, MapPin } from "lucide-react";

export const statusConfig = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  pendiente_cotizacion: { label: "Pendiente de cotización", color: "bg-orange-100 text-orange-800", icon: FileText },
  pendiente_agenda: { label: "Pendiente de agenda", color: "bg-amber-100 text-amber-800", icon: Clock },
  evaluacion_agendada: { label: "Evaluación Agendada", color: "bg-indigo-100 text-indigo-800", icon: Calendar },
  evaluacion_pendiente: { label: "Evaluación Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  evaluacion_realizada: { label: "Evaluación Realizada", color: "bg-green-100 text-green-800", icon: ClipboardCheck },
  cotizacion_pendiente: { label: "Cotización Pendiente", color: "bg-orange-100 text-orange-800", icon: FileText },
  cotizacion_realizada: { label: "Cotización Realizada", color: "bg-purple-100 text-purple-800", icon: FileCheck },
  pendiente_aprobacion: { label: "Pendiente de aprobación", color: "bg-orange-200 text-orange-900", icon: Clock },
  trabajo_aprobado: { label: "Trabajo Aprobado", color: "bg-teal-100 text-teal-800", icon: ThumbsUp },
  agendado: { label: "Agendado", color: "bg-indigo-100 text-indigo-800", icon: Calendar },
  en_ruta: { label: "En Ruta", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  en_sitio: { label: "En Sitio", color: "bg-blue-100 text-blue-800", icon: MapPin },
  en_proceso: { label: "En Proceso", color: "bg-blue-100 text-blue-800", icon: Clock },
  terminado: { label: "Terminado", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  completado: { label: "Completado", color: "bg-green-100 text-green-800", icon: CheckCircle },
  pendiente_facturacion: { label: "Pendiente facturación", color: "bg-orange-100 text-orange-800", icon: FileText },
  facturado: { label: "Facturado", color: "bg-sky-100 text-sky-800", icon: FileCheck },
  pagado: { label: "Pagado", color: "bg-emerald-100 text-emerald-900", icon: CheckCircle },
  cerrado: { label: "Cerrado", color: "bg-gray-100 text-gray-800", icon: CheckCircle },
  incidencia: { label: "Incidencia", color: "bg-red-100 text-red-800", icon: AlertCircle },
  perdido: { label: "Perdido", color: "bg-gray-200 text-gray-700", icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "bg-slate-200 text-slate-700", icon: AlertCircle }
};

export const commercialStatusConfig = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  calificando: { label: "Calificando", color: "bg-sky-100 text-sky-800" },
  cotizacion_pendiente: { label: "Cotización pendiente", color: "bg-orange-100 text-orange-800" },
  cotizado: { label: "Cotizado", color: "bg-purple-100 text-purple-800" },
  pendiente_aprobacion: { label: "Pendiente aprobación", color: "bg-amber-100 text-amber-800" },
  aprobado: { label: "Aprobado", color: "bg-emerald-100 text-emerald-800" },
  perdido: { label: "Perdido", color: "bg-gray-200 text-gray-700" },
  cancelado: { label: "Cancelado", color: "bg-slate-200 text-slate-700" },
  dormido: { label: "Dormido", color: "bg-stone-200 text-stone-700" }
};

export const workStatusConfig = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  agendado: { label: "Agendado", color: "bg-indigo-100 text-indigo-800" },
  en_ruta: { label: "En ruta", color: "bg-yellow-100 text-yellow-800" },
  en_sitio: { label: "En sitio", color: "bg-cyan-100 text-cyan-800" },
  en_proceso: { label: "En proceso", color: "bg-blue-100 text-blue-800" },
  completado: { label: "Completado", color: "bg-green-100 text-green-800" },
  cerrado: { label: "Cerrado", color: "bg-gray-100 text-gray-800" },
  incidencia: { label: "Incidencia", color: "bg-red-100 text-red-800" },
  cancelado: { label: "Cancelado", color: "bg-slate-200 text-slate-700" }
};

export const priorityConfig = {
  baja: { label: "Baja", color: "bg-gray-100 text-gray-700" },
  media: { label: "Media", color: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-700" }
};

export const activeStatuses = [
  "trabajo_aprobado", "agendado", "en_ruta", "en_sitio", "en_proceso", 
  "terminado", "evaluacion_agendada", "evaluacion_pendiente", 
  "evaluacion_realizada", "cotizacion_pendiente", "cotizacion_realizada", 
  "pendiente_aprobacion"
];