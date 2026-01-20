import { AlertCircle, Calendar, Clock, ClipboardCheck, FileText, FileCheck, ThumbsUp, CheckCircle, MapPin } from "lucide-react";

export const statusConfig = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  evaluacion_agendada: { label: "Evaluación Agendada", color: "bg-indigo-100 text-indigo-800", icon: Calendar },
  evaluacion_pendiente: { label: "Evaluación Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  evaluacion_realizada: { label: "Evaluación Realizada", color: "bg-green-100 text-green-800", icon: ClipboardCheck },
  cotizacion_pendiente: { label: "Cotización Pendiente", color: "bg-orange-100 text-orange-800", icon: FileText },
  cotizacion_realizada: { label: "Cotización Realizada", color: "bg-purple-100 text-purple-800", icon: FileCheck },
  pendiente_aprobacion: { label: "Trabajo pendiente de aprobación", color: "bg-orange-200 text-orange-900", icon: Clock },
  trabajo_aprobado: { label: "Trabajo Aprobado", color: "bg-teal-100 text-teal-800", icon: ThumbsUp },
  agendado: { label: "Agendado", color: "bg-indigo-100 text-indigo-800", icon: Calendar },
  en_ruta: { label: "🚗 En Ruta", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  en_sitio: { label: "📍 En Sitio", color: "bg-blue-100 text-blue-800", icon: MapPin },
  en_proceso: { label: "Trabajo en Proceso", color: "bg-blue-100 text-blue-800", icon: Clock },
  terminado: { label: "Terminado", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  completado: { label: "Completado", color: "bg-green-100 text-green-800", icon: CheckCircle },
  cerrado: { label: "Cerrado", color: "bg-gray-100 text-gray-800", icon: CheckCircle },
  incidencia: { label: "⚠️ Incidencia", color: "bg-red-100 text-red-800", icon: AlertCircle },
  perdido: { label: "Perdido", color: "bg-gray-200 text-gray-700", icon: AlertCircle }
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