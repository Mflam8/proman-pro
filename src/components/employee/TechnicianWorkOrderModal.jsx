import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, MapPin, Save, Wrench } from 'lucide-react';

export default function TechnicianWorkOrderModal({ workOrder, isOpen, onClose, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ progress_percentage: 0, work_notes_done: '', work_notes_pending: '', materials_used_summary: '', before_image_url: '', after_image_url: '', num_tecnicos: 1, hora_inicio: '', hora_fin: '', observaciones: '' });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setFormData({
      progress_percentage: workOrder.status === 'in_progress' ? 60 : workOrder.status === 'pending_billing' ? 100 : 0,
      work_notes_done: workOrder.completion_summary || '',
      work_notes_pending: '',
      materials_used_summary: workOrder.materials_used_summary || '',
      before_image_url: workOrder.before_photo_urls?.[0] || '',
      after_image_url: workOrder.after_photo_urls?.[0] || '',
      num_tecnicos: 1,
      hora_inicio: workOrder.scheduled_start_time || '',
      hora_fin: '',
      observaciones: workOrder.special_instructions || ''
    });
  }, [workOrder]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['assignedWorkOrders'] });
    queryClient.invalidateQueries({ queryKey: ['todayWorkOrders'] });
    queryClient.invalidateQueries({ queryKey: ['workflowWorkOrders'] });
    queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
  };

  const saveProgress = useMutation({
    mutationFn: async () => {
      await base44.entities.ClientInquiry.update(workOrder.inquiry_id, {
        progress_percentage: Number(formData.progress_percentage) || 0,
        work_notes_done: formData.work_notes_done,
        work_notes_pending: formData.work_notes_pending,
        before_image_url: formData.before_image_url || null,
        after_image_url: formData.after_image_url || null,
        work_status: Number(formData.progress_percentage) > 0 ? 'en_proceso' : 'agendado',
        status: Number(formData.progress_percentage) > 0 ? 'en_proceso' : 'agendado'
      });
      if (workOrder.id) {
        await base44.entities.WorkOrder.update(workOrder.id, {
          status: Number(formData.progress_percentage) > 0 ? 'in_progress' : workOrder.status,
          workflow_stage: Number(formData.progress_percentage) > 0 ? 'In Progress' : workOrder.workflow_stage,
          before_photo_urls: formData.before_image_url ? [formData.before_image_url] : [],
          after_photo_urls: formData.after_image_url ? [formData.after_image_url] : [],
          materials_used_summary: formData.materials_used_summary || null,
          completion_summary: formData.work_notes_done || null,
          last_synced_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => { refresh(); alert('Progreso guardado'); }
  });

  const completeJob = useMutation({
    mutationFn: async () => {
      const cierre = await base44.entities.CierreTrabajo.filter({ trabajo_id: workOrder.inquiry_id }, '-created_date', 1);
      const horasDiurnas = formData.hora_inicio && formData.hora_fin
        ? Math.max(0, (Number(formData.hora_fin.split(':')[0]) * 60 + Number(formData.hora_fin.split(':')[1]) - Number(formData.hora_inicio.split(':')[0]) * 60 - Number(formData.hora_inicio.split(':')[1])) / 60)
        : 0;
      const cierrePayload = {
        trabajo_id: workOrder.inquiry_id,
        num_tecnicos: Number(formData.num_tecnicos) || 1,
        hora_inicio: formData.hora_inicio || workOrder.scheduled_start_time || '08:00',
        hora_fin: formData.hora_fin || workOrder.scheduled_start_time || '17:00',
        horas_diurnas: horasDiurnas,
        horas_nocturnas: 0,
        horas_extra: 0,
        horas_totales: horasDiurnas,
        materiales_costo: 0,
        estado_final: 'completado_exitoso',
        evidencias_url: [formData.before_image_url, formData.after_image_url].filter(Boolean),
        observaciones: [formData.observaciones, formData.materials_used_summary ? `Materiales usados: ${formData.materials_used_summary}` : null].filter(Boolean).join('\n'),
        trabajo_realizado: formData.work_notes_done,
        pendientes: formData.work_notes_pending || '',
        cliente_conformidad: true,
        fecha_cierre: new Date().toISOString().split('T')[0],
        cerrado_por: user.email
      };
      if (cierre[0]) await base44.entities.CierreTrabajo.update(cierre[0].id, cierrePayload);
      else await base44.entities.CierreTrabajo.create(cierrePayload);

      await base44.entities.ClientInquiry.update(workOrder.inquiry_id, {
        progress_percentage: 100,
        work_notes_done: formData.work_notes_done,
        work_notes_pending: formData.work_notes_pending,
        before_image_url: formData.before_image_url || null,
        after_image_url: formData.after_image_url || null,
        work_status: 'completado',
        status: 'pendiente_facturacion',
        completed_at: new Date().toISOString()
      });
      if (workOrder.id) {
        await base44.entities.WorkOrder.update(workOrder.id, {
          status: 'pending_billing',
          workflow_stage: 'Pending Billing',
          before_photo_urls: formData.before_image_url ? [formData.before_image_url] : [],
          after_photo_urls: formData.after_image_url ? [formData.after_image_url] : [],
          materials_used_summary: formData.materials_used_summary || null,
          completion_summary: formData.work_notes_done || null,
          completed_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => { refresh(); alert('Trabajo completado y cierre creado'); onClose(); }
  });

  const uploadImage = async (file, fieldName) => {
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData((prev) => ({ ...prev, [fieldName]: file_url }));
    setIsUploading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Orden de trabajo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{workOrder.customer_name}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <Badge className="bg-cyan-100 text-cyan-900">{workOrder.workflow_stage}</Badge>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-proman-yellow" />{workOrder.address || workOrder.location || 'Ubicación pendiente'}</div>
              {workOrder.map_url && <a href={workOrder.map_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 underline">Abrir navegación</a>}
              <div><strong>Contacto:</strong> {workOrder.contact_name || 'Pendiente'} · {workOrder.contact_phone || 'Sin teléfono'}</div>
              <div><strong>Servicios:</strong> {(workOrder.requested_services || []).join(' · ') || 'Pendiente'}</div>
              <div><strong>Materiales requeridos:</strong> {(workOrder.required_materials || []).join(' · ') || 'Sin definir'}</div>
              <div><strong>Resumen:</strong> {workOrder.operational_summary || 'Sin resumen'}</div>
              {workOrder.safety_notes && <div><strong>Seguridad:</strong> {workOrder.safety_notes}</div>}
              {workOrder.special_instructions && <div><strong>Instrucciones:</strong> {workOrder.special_instructions}</div>}
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500 bg-blue-50/30">
            <CardHeader className="bg-blue-500 text-white"><CardTitle>Ejecución en campo</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" min="0" max="100" placeholder="% avance" value={formData.progress_percentage} onChange={(e) => setFormData((prev) => ({ ...prev, progress_percentage: e.target.value }))} />
                <Input type="number" min="1" placeholder="Técnicos" value={formData.num_tecnicos} onChange={(e) => setFormData((prev) => ({ ...prev, num_tecnicos: e.target.value }))} />
                <Input type="time" value={formData.hora_inicio} onChange={(e) => setFormData((prev) => ({ ...prev, hora_inicio: e.target.value }))} />
                <Input type="time" value={formData.hora_fin} onChange={(e) => setFormData((prev) => ({ ...prev, hora_fin: e.target.value }))} />
              </div>
              <Textarea rows={4} placeholder="Trabajo realizado" value={formData.work_notes_done} onChange={(e) => setFormData((prev) => ({ ...prev, work_notes_done: e.target.value }))} />
              <Textarea rows={3} placeholder="Pendientes / observaciones" value={formData.work_notes_pending} onChange={(e) => setFormData((prev) => ({ ...prev, work_notes_pending: e.target.value }))} />
              <Textarea rows={3} placeholder="Materiales usados" value={formData.materials_used_summary} onChange={(e) => setFormData((prev) => ({ ...prev, materials_used_summary: e.target.value }))} />
              <Textarea rows={2} placeholder="Observaciones finales" value={formData.observaciones} onChange={(e) => setFormData((prev) => ({ ...prev, observaciones: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <UploadBox label="Foto antes" imageUrl={formData.before_image_url} onSelect={(file) => uploadImage(file, 'before_image_url')} isUploading={isUploading} />
                <UploadBox label="Foto después" imageUrl={formData.after_image_url} onSelect={(file) => uploadImage(file, 'after_image_url')} isUploading={isUploading} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => saveProgress.mutate()} disabled={saveProgress.isPending || isUploading}><Save className="w-4 h-4 mr-2" />Guardar avance</Button>
                <Button className="flex-1 bg-proman-yellow text-proman-navy hover:opacity-90" onClick={() => completeJob.mutate()} disabled={completeJob.isPending || isUploading}><Wrench className="w-4 h-4 mr-2" />Completar trabajo</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadBox({ label, imageUrl, onSelect, isUploading }) {
  return (
    <label className="rounded-2xl border-2 border-dashed border-gray-300 p-3 text-center cursor-pointer hover:border-proman-yellow transition-colors">
      <div className="mb-2 text-sm font-medium text-proman-navy">{label}</div>
      <div className="h-28 overflow-hidden rounded-xl bg-white flex items-center justify-center">
        {imageUrl ? <img src={imageUrl} alt={label} className="h-full w-full object-cover" /> : <Camera className="w-8 h-8 text-gray-400" />}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelect(e.target.files[0])} disabled={isUploading} />
    </label>
  );
}