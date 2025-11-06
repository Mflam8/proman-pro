import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import JobDetailModal from "./JobDetailModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, MapPin, FileText, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  en_proceso: { label: "En Proceso", color: "bg-indigo-100 text-indigo-800" },
  completado: { label: "Completado", color: "bg-green-100 text-green-800" },
  // ... add other statuses if needed
};

export default function JobList({ user }) {
  const [selectedJob, setSelectedJob] = useState(null);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['assignedJobs', user.email],
    queryFn: () => base44.entities.ClientInquiry.filter({ assigned_to: user.email }, '-created_date'),
    enabled: !!user,
  });

  if (isLoading) return <p>Cargando tus trabajos asignados...</p>;

  return (
    <div>
      <div className="grid gap-6">
        {jobs && jobs.length > 0 ? jobs.map(job => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusConfig[job.status]?.color || 'bg-gray-100'}>{statusConfig[job.status]?.label || job.status}</Badge>
                        <span className="text-xs text-gray-500">Recibido: {format(new Date(job.created_date), "dd MMM yyyy", { locale: es })}</span>
                    </div>
                    <h3 className="text-xl font-bold text-proman-navy mb-3">{job.service_type}</h3>
                    <div className="space-y-2 text-sm">
                        <InfoRow icon={User} text={job.client_name} />
                        <InfoRow icon={Phone} text={job.phone} />
                        <InfoRow icon={MapPin} text={job.location} />
                    </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-500">PROGRESO</span>
                        <span className="text-sm font-bold text-proman-navy">{job.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={job.progress_percentage || 0} className="w-full h-2" />
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                     <Button onClick={() => setSelectedJob(job)}>Actualizar Progreso</Button>
                     <Button variant="outline">Marcar Asistencia</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <p>No tienes trabajos asignados en este momento.</p>
        )}
      </div>

      {selectedJob && (
        <JobDetailModal 
          job={selectedJob} 
          isOpen={!!selectedJob} 
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

const InfoRow = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-2 text-gray-700">
        <Icon className="w-4 h-4 text-proman-yellow flex-shrink-0" />
        <span>{text}</span>
    </div>
);