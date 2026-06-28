import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock3, MapPin, TriangleAlert, User } from 'lucide-react';
import { getWorkflowStageMeta, formatMissingFields } from '@/lib/workflow';

export default function WorkflowCard({ inquiry, customer, workOrder, onOpen }) {
  const stageMeta = getWorkflowStageMeta(workOrder?.workflow_stage);
  const missing = formatMissingFields(workOrder?.missing_operational_fields || inquiry?.missing_info || inquiry?.missing_fields).slice(0, 3);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-proman-navy">{workOrder?.customer_name || customer?.full_name || inquiry?.client_name || 'Cliente por confirmar'}</p>
          <p className="text-xs text-gray-500">{workOrder?.requested_services?.[0] || inquiry?.service_type || 'Servicio por clasificar'}</p>
        </div>
        <Badge className={stageMeta.badgeClass}>{stageMeta.label}</Badge>
      </div>

      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-proman-yellow" />{workOrder?.location || inquiry?.location_name || inquiry?.location || 'Ubicación pendiente'}</div>
        <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-proman-yellow" />{workOrder?.scheduled_date || inquiry?.scheduled_date || 'Sin fecha'}</div>
        <div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-proman-yellow" />{workOrder?.scheduled_start_time || inquiry?.scheduled_start_time || inquiry?.preferred_time || 'Sin hora'}</div>
        <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-proman-yellow" />{workOrder?.technician_name || inquiry?.assigned_to || 'Sin técnico'}</div>
      </div>

      {missing.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          <div className="mb-1 flex items-center gap-1 font-medium"><TriangleAlert className="h-3.5 w-3.5" />Faltantes</div>
          <p>{missing.join(' · ')}</p>
        </div>
      )}

      <Button onClick={onOpen} variant="outline" className="mt-3 w-full">Abrir gestión</Button>
    </div>
  );
}