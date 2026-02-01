import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Briefcase, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { calculateProjectMetrics } from "@/components/utils/normalizeData";

/**
 * Vista agrupada de trabajos por proyecto
 * Muestra todos los servicios de un cliente consolidados en una sola tarjeta
 */
export default function ProjectGroupView({ customerData, onClick }) {
  const { customer, jobs } = customerData;
  const metrics = calculateProjectMetrics(jobs);
  
  if (!customer) return null;
  
  const displayName = customer.full_name;
  const displayPhone = customer.phone;
  
  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-proman-yellow"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-proman-navy" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="text-xl font-bold text-proman-navy">{displayName}</h3>
                  {metrics.isMultiService && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Briefcase className="w-3 h-3 mr-1" />
                      Múltiples Servicios
                    </Badge>
                  )}
                  {customer.is_vip && (
                    <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>
                  )}
                </div>
                
                {/* Servicios activos */}
                <div className="mb-3">
                  <p className="text-sm text-gray-600 font-medium mb-2">Trabajos Activos:</p>
                  <div className="space-y-1">
                    {jobs.filter(j => j.status !== 'completado' && j.status !== 'cancelado').map((job) => (
                      <div key={job.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {job.rubro}
                        </Badge>
                        <span className="text-gray-700">{job.service_type}</span>
                        <Badge className={
                          job.status === 'en_proceso' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'nuevo' ? 'bg-gray-100 text-gray-800' :
                          'bg-orange-100 text-orange-800'
                        }>
                          {job.progress_percentage || 0}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Rubros únicos */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {metrics.uniqueRubros.map(rubro => (
                    <Badge key={rubro} className="bg-indigo-100 text-indigo-800 text-xs">
                      {rubro}
                    </Badge>
                  ))}
                </div>
                
                {/* Métricas del proyecto */}
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-proman-navy">{metrics.totalJobs}</div>
                    <div className="text-xs text-gray-600">Trabajos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{metrics.completedJobs}</div>
                    <div className="text-xs text-gray-600">Completados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{metrics.activeJobs}</div>
                    <div className="text-xs text-gray-600">Activos</div>
                  </div>
                </div>
                
                {/* Progreso global */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-500">PROGRESO GLOBAL</span>
                    <span className="text-sm font-bold text-proman-navy">{metrics.avgProgress}%</span>
                  </div>
                  <Progress value={metrics.avgProgress} className="w-full h-2" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Columna derecha - Financiero */}
          <div className="flex flex-col items-end gap-2 md:w-48">
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">${metrics.totalAmount.toFixed(2)}</div>
              <div className="text-xs text-gray-500">Monto Total del Proyecto</div>
            </div>
            
            {customerData.totalPaid > 0 && (
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">${customerData.totalPaid.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Pagado</div>
              </div>
            )}
            
            {(metrics.totalAmount - customerData.totalPaid) > 0 && (
              <div className="text-right">
                <div className="text-lg font-bold text-red-600">
                  ${(metrics.totalAmount - customerData.totalPaid).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">Pendiente</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}