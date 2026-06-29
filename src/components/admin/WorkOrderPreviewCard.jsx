import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { unwrapRecords } from '@/utils/entityRecord';
import { getWorkflowStageMeta, formatMissingFields } from '@/lib/workflow';

export default function WorkOrderPreviewCard({ inquiryId }) {
  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrderPreview', inquiryId],
    queryFn: () => base44.entities.WorkOrder.filter({ inquiry_id: inquiryId }, '-updated_date', 1).then(unwrapRecords),
    initialData: []
  });

  const workOrder = workOrders[0];
  if (!workOrder) {
    return (
      <Card>
        <CardHeader><CardTitle>Orden de trabajo inteligente</CardTitle></CardHeader>
        <CardContent className="text-sm text-gray-500">Aún no se ha sincronizado una orden operativa para este servicio.</CardContent>
      </Card>
    );
  }

  const stageMeta = getWorkflowStageMeta(workOrder.workflow_stage);
  const missing = formatMissingFields(workOrder.missing_operational_fields);
  const requestedServices = Array.isArray(workOrder.requested_services) ? workOrder.requested_services : [];
  const requiredMaterials = Array.isArray(workOrder.required_materials) ? workOrder.required_materials : [];

  return (
    <Card className="border-2 border-cyan-500 bg-cyan-50/40">
      <CardHeader className="bg-cyan-500 text-white">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>🧠 Orden de trabajo inteligente</CardTitle>
          <Badge className="bg-white text-cyan-700">{stageMeta.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 text-sm">
        <p className="text-gray-700">{workOrder.operational_summary || 'Sin resumen operativo'}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-gray-600">
          <div><strong>Contacto:</strong> {workOrder.contact_name || 'Pendiente'}</div>
          <div><strong>Teléfono:</strong> {workOrder.contact_phone || 'Pendiente'}</div>
          <div><strong>Ubicación:</strong> {workOrder.location || 'Pendiente'}</div>
          <div><strong>Fecha/Hora:</strong> {[workOrder.scheduled_date, workOrder.scheduled_start_time].filter(Boolean).join(' · ') || 'Pendiente'}</div>
        </div>
        {requestedServices.length > 0 && <div><strong>Servicios:</strong> {requestedServices.join(' · ')}</div>}
        {requiredMaterials.length > 0 && <div><strong>Materiales:</strong> {requiredMaterials.join(' · ')}</div>}
        {workOrder.safety_notes && <div><strong>Seguridad:</strong> {workOrder.safety_notes}</div>}
        {missing.length > 0 && <div><strong>Faltantes:</strong> {missing.join(' · ')}</div>}
      </CardContent>
    </Card>
  );
}