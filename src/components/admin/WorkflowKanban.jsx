import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { WORKFLOW_STAGES, getWorkflowStage } from '@/lib/workflow';
import WorkflowColumn from './workflow/WorkflowColumn';

export default function WorkflowKanban({ inquiries, customers, onOpenInquiry }) {
  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['workflowWorkOrders'],
    queryFn: () => base44.entities.WorkOrder.list('-updated_date', 500),
    initialData: []
  });

  const customerMap = useMemo(() => Object.fromEntries((customers || []).map((item) => [item.id, item])), [customers]);
  const workOrderMap = useMemo(() => Object.fromEntries((workOrders || []).map((item) => [item.inquiry_id, item])), [workOrders]);

  const stageGroups = useMemo(() => {
    const empty = Object.fromEntries(WORKFLOW_STAGES.map((stage) => [stage.id, []]));
    (inquiries || []).forEach((inquiry) => {
      const workOrder = workOrderMap[inquiry.id];
      const stage = getWorkflowStage(inquiry, workOrder);
      empty[stage].push({ inquiry, customer: customerMap[inquiry.customer_id], workOrder });
    });
    return empty;
  }, [customerMap, inquiries, workOrderMap]);

  if (isLoading && !workOrders.length) {
    return <div className="rounded-3xl border bg-white p-8 text-center text-gray-500">Cargando pipeline inteligente...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-white p-5">
        <h2 className="text-xl font-bold text-proman-navy">Pipeline Inteligente de Servicios</h2>
        <p className="mt-1 text-sm text-gray-600">Cada conversación termina convertida en etapas operativas claras, orden de trabajo y seguimiento técnico.</p>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4">
          {WORKFLOW_STAGES.map((stage) => (
            <WorkflowColumn key={stage.id} stage={stage} items={stageGroups[stage.id] || []} onOpen={onOpenInquiry} />
          ))}
        </div>
      </div>
    </div>
  );
}