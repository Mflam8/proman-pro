import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock3, MapPin, Wrench } from "lucide-react";
import TechnicianWorkOrderModal from "./TechnicianWorkOrderModal";
import { getWorkflowStage } from "@/lib/workflow";

function buildMapUrl(address, location) {
  const query = [address, location].filter(Boolean).join(', ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export default function JobList({ user, filterMode = 'all' }) {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const { data: workOrders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['assignedWorkOrders', user.email],
    queryFn: () => base44.entities.WorkOrder.filter({ technician_email: user.email }, '-updated_date', 200),
    enabled: !!user,
    initialData: []
  });
  const { data: inquiries = [], isLoading: isLoadingInquiries } = useQuery({
    queryKey: ['assignedInquiries', user.email],
    queryFn: () => base44.entities.ClientInquiry.filter({ assigned_to: user.email }, '-updated_date', 200),
    enabled: !!user,
    initialData: []
  });

  const visibleOrders = useMemo(() => {
    const workOrderMap = Object.fromEntries(workOrders.map((item) => [item.inquiry_id, item]));
    const derived = inquiries.map((inquiry) => {
      const workOrder = workOrderMap[inquiry.id];
      if (workOrder) return workOrder;
      return {
        id: null,
        inquiry_id: inquiry.id,
        workflow_stage: getWorkflowStage(inquiry, null),
        status: 'draft',
        customer_name: inquiry.client_name,
        contact_name: inquiry.client_name,
        contact_phone: inquiry.phone,
        address: inquiry.address,
        location: inquiry.location_name || inquiry.location,
        map_url: buildMapUrl(inquiry.address, inquiry.location_name || inquiry.location),
        requested_services: inquiry.service_type ? [inquiry.service_type] : [],
        required_materials: [],
        scheduled_date: inquiry.scheduled_date,
        scheduled_start_time: inquiry.scheduled_start_time,
        special_instructions: inquiry.notes,
        customer_observations: inquiry.descripcion_libre || inquiry.message,
        completion_summary: inquiry.work_notes_done,
        materials_used_summary: null,
        before_photo_urls: inquiry.before_image_url ? [inquiry.before_image_url] : [],
        after_photo_urls: inquiry.after_image_url ? [inquiry.after_image_url] : []
      };
    });
    const today = new Date().toISOString().split('T')[0];
    return (filterMode === 'today' ? derived.filter((item) => item.scheduled_date === today) : derived);
  }, [filterMode, inquiries, workOrders]);

  if (isLoadingOrders || isLoadingInquiries) return <p>Cargando órdenes de trabajo...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-white p-5">
        <h2 className="text-xl font-bold text-proman-navy">{filterMode === 'today' ? 'Agenda de hoy' : 'Mis órdenes de trabajo'}</h2>
        <p className="mt-1 text-sm text-gray-600">Aquí ves solo la información operativa que necesitas para ejecutar el servicio en campo.</p>
      </div>
      <div className="grid gap-4">
        {visibleOrders.length > 0 ? visibleOrders.map((order, index) => (
          <Card key={order.id || `${order.inquiry_id}-${index}`} className="border-l-4 border-proman-yellow shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-proman-navy">{order.customer_name}</h3>
                    <Badge className="bg-cyan-100 text-cyan-900">{order.workflow_stage}</Badge>
                  </div>
                  <p className="text-sm text-gray-700">{order.requested_services?.join(' · ') || 'Servicio por confirmar'}</p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-proman-yellow" />{order.address || order.location || 'Ubicación pendiente'}</div>
                    <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-proman-yellow" />{order.scheduled_date || 'Sin fecha'}</div>
                    <div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-proman-yellow" />{order.scheduled_start_time || 'Sin hora'}</div>
                  </div>
                </div>
                <Button className="bg-proman-yellow text-proman-navy hover:opacity-90" onClick={() => setSelectedWorkOrder(order)}><Wrench className="w-4 h-4 mr-2" />Abrir orden</Button>
              </div>
            </CardContent>
          </Card>
        )) : <div className="rounded-3xl border border-dashed bg-white p-8 text-center text-gray-500">No hay órdenes {filterMode === 'today' ? 'para hoy' : 'asignadas'} en este momento.</div>}
      </div>
      {selectedWorkOrder && <TechnicianWorkOrderModal workOrder={selectedWorkOrder} isOpen={!!selectedWorkOrder} onClose={() => setSelectedWorkOrder(null)} user={user} />}
    </div>
  );
}