import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Save, Phone, MapPin, FileText, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function JobDetailModal({ job, isOpen, onClose }) {
    const [formData, setFormData] = useState({
        progress_percentage: job.progress_percentage || 0,
        work_notes_done: job.work_notes_done || '',
        work_notes_pending: job.work_notes_pending || '',
        before_image_url: job.before_image_url || '',
        after_image_url: job.after_image_url || '',
    });
    const [beforeImageFile, setBeforeImageFile] = useState(null);
    const [afterImageFile, setAfterImageFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        setFormData({
            progress_percentage: job.progress_percentage || 0,
            work_notes_done: job.work_notes_done || '',
            work_notes_pending: job.work_notes_pending || '',
            before_image_url: job.before_image_url || '',
            after_image_url: job.after_image_url || '',
        });
    }, [job]);

    const updateJob = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ClientInquiry.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignedJobs'] });
            alert('✅ Trabajo actualizado correctamente');
            onClose();
        },
    });

    const handleImageUpload = async (file, fieldName) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData(prev => ({ ...prev, [fieldName]: file_url }));
        } catch (error) {
            console.error("Image upload failed", error);
            alert('❌ Error al subir imagen');
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        if (beforeImageFile) handleImageUpload(beforeImageFile, 'before_image_url');
    }, [beforeImageFile]);

    useEffect(() => {
        if (afterImageFile) handleImageUpload(afterImageFile, 'after_image_url');
    }, [afterImageFile]);

    const handleSubmit = (e) => {
        e.preventDefault();
        updateJob.mutate({ id: job.id, data: formData });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Actualizar Progreso del Trabajo</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Información del Cliente */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Información del Cliente</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-proman-yellow" />
                                        <span className="text-gray-600">Nombre:</span>
                                        <span className="font-semibold">{job.client_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-proman-yellow" />
                                        <span className="text-gray-600">Teléfono:</span>
                                        <span className="font-semibold">{job.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-proman-yellow" />
                                        <span className="text-gray-600">Ubicación:</span>
                                        <span className="font-semibold">{job.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-proman-yellow" />
                                        <span className="text-gray-600">Servicio:</span>
                                        <span className="font-semibold">{job.service_type}</span>
                                    </div>
                                    {job.scheduled_date && (
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-proman-yellow" />
                                            <span className="text-gray-600">Programado:</span>
                                            <span className="font-semibold">
                                                {format(new Date(job.scheduled_date), "dd MMM yyyy", { locale: es })}
                                                {job.scheduled_start_time && ` a las ${job.scheduled_start_time}`}
                                            </span>
                                        </div>
                                    )}
                                    {job.message && (
                                        <div className="pt-3 border-t">
                                            <span className="text-gray-600 block mb-1">Descripción del cliente:</span>
                                            <p className="text-gray-700 italic">"{job.message}"</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Fotografías del Trabajo</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <ImageUploader 
                                        label="Antes" 
                                        imageUrl={formData.before_image_url} 
                                        onFileSelect={setBeforeImageFile} 
                                        isUploading={isUploading} 
                                    />
                                    <ImageUploader 
                                        label="Después" 
                                        imageUrl={formData.after_image_url} 
                                        onFileSelect={setAfterImageFile} 
                                        isUploading={isUploading} 
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Reporte de Progreso */}
                        <div className="space-y-6">
                            <Card className="border-2 border-proman-yellow">
                                <CardHeader>
                                    <CardTitle>Reporte de Progreso</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-proman-navy mb-2">
                                            Porcentaje de Avance: {formData.progress_percentage}%
                                        </label>
                                        <Slider
                                            value={[formData.progress_percentage]}
                                            onValueChange={(val) => setFormData(prev => ({...prev, progress_percentage: val[0]}))}
                                            max={100}
                                            step={10}
                                            className="mb-2"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>0%</span>
                                            <span>50%</span>
                                            <span>100%</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-proman-navy mb-2">
                                            ¿Qué trabajos realizaste? <span className="text-red-500">*</span>
                                        </label>
                                        <Textarea
                                            value={formData.work_notes_done}
                                            onChange={(e) => setFormData(prev => ({...prev, work_notes_done: e.target.value}))}
                                            rows={4}
                                            placeholder="Describe los trabajos que ya completaste..."
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-proman-navy mb-2">
                                            ¿Qué falta por hacer?
                                        </label>
                                        <Textarea
                                            value={formData.work_notes_pending}
                                            onChange={(e) => setFormData(prev => ({...prev, work_notes_pending: e.target.value}))}
                                            rows={3}
                                            placeholder="Describe lo que aún falta por completar..."
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-xs text-blue-800">
                                            <strong>💡 Importante:</strong> Sube las fotos antes/después y describe detalladamente el trabajo realizado. Esto ayuda a mantener un registro completo del servicio.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-proman-yellow text-proman-navy hover:opacity-90"
                            disabled={updateJob.isPending || isUploading}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {updateJob.isPending || isUploading ? "Guardando..." : "Guardar Progreso"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const ImageUploader = ({ label, imageUrl, onFileSelect, isUploading }) => {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-proman-navy">{label}</label>
            <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative overflow-hidden hover:border-proman-yellow transition-colors">
                {imageUrl ? (
                    <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <Camera className="w-10 h-10 text-gray-400" />
                )}
                <Input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={(e) => onFileSelect(e.target.files[0])}
                    disabled={isUploading}
                />
                {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-proman-navy mx-auto mb-2"></div>
                            <p className="text-xs text-gray-600">Subiendo...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};