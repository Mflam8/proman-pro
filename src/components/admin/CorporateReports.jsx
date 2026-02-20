import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, FileText, Building2, MapPin, DollarSign, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import CleaningCertificateModal from "./CleaningCertificateModal";
import NewCorporateJobModal from "./NewCorporateJobModal";

export default function CorporateReports() {
  const [selectedRestaurant, setSelectedRestaurant] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [certificateJob, setCertificateJob] = useState(null);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [sortOrder, setSortOrder] = useState("date_desc");

  const queryClient = useQueryClient();

  const { data: corporateJobs, isLoading } = useQuery({
    queryKey: ['corporate-reports'],
    queryFn: async () => {
      const jobs = await base44.entities.ClientInquiry.filter({
        lead_source: 'corporativo'
      }, '-scheduled_date', 500);
      return jobs.filter(job => job.scheduled_date);
    },
    initialData: [],
  });



  // Get unique restaurants and branches
  const restaurants = useMemo(() => {
    const uniqueRestaurants = [...new Set(corporateJobs.map(j => j.restaurant_name).filter(Boolean))];
    return uniqueRestaurants.sort();
  }, [corporateJobs]);

  const branches = useMemo(() => {
    let jobs = corporateJobs;
    if (selectedRestaurant !== "all") {
      jobs = jobs.filter(j => j.restaurant_name === selectedRestaurant);
    }
    const uniqueBranches = [...new Set(jobs.map(j => j.location_name).filter(Boolean))];
    return uniqueBranches.sort();
  }, [corporateJobs, selectedRestaurant]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    let jobs = [...corporateJobs];

    if (selectedRestaurant !== "all") {
      jobs = jobs.filter(j => j.restaurant_name === selectedRestaurant);
    }

    if (selectedBranch !== "all") {
      jobs = jobs.filter(j => j.location_name === selectedBranch);
    }

    if (dateFrom) {
      jobs = jobs.filter(j => j.scheduled_date >= dateFrom);
    }

    if (dateTo) {
      jobs = jobs.filter(j => j.scheduled_date <= dateTo);
    }

    // Sort always by date
    if (sortOrder === "date_asc") {
      jobs.sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""));
    } else if (sortOrder === "created_desc") {
      jobs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else {
      // default: date_desc
      jobs.sort((a, b) => (b.scheduled_date || "").localeCompare(a.scheduled_date || ""));
    }

    return jobs;
  }, [corporateJobs, selectedRestaurant, selectedBranch, dateFrom, dateTo, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalAmount = filteredJobs.reduce((sum, job) => sum + (job.final_amount || 0), 0);
    const totalJobs = filteredJobs.length;
    const uniqueBranches = [...new Set(filteredJobs.map(j => j.location_name))].length;
    
    return { totalAmount, totalJobs, uniqueBranches };
  }, [filteredJobs]);

  // Group by branch
  const jobsByBranch = useMemo(() => {
    const grouped = {};
    filteredJobs.forEach(job => {
      const branch = job.location_name || "Sin sucursal";
      if (!grouped[branch]) {
        grouped[branch] = [];
      }
      grouped[branch].push(job);
    });
    return grouped;
  }, [filteredJobs]);

  const handleExportCSV = () => {
    const csv = [
      ['Fecha', 'Restaurante', 'Sucursal', 'Descripción', 'Monto', 'Estado'].join(','),
      ...filteredJobs.map(job => [
        job.scheduled_date || '',
        job.restaurant_name || '',
        job.location_name || '',
        `"${(job.message || '').replace(/"/g, '""')}"`,
        job.final_amount || 0,
        job.status || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_corporativo_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes Corporativos</h2>
          <p className="text-gray-600">Historial de servicios para clientes corporativos</p>
        </div>
        <Button
          onClick={() => setShowNewJobModal(true)}
          className="bg-proman-yellow text-proman-navy font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Trabajo Corporativo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Servicios</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalJobs}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sucursales Atendidas</p>
                <p className="text-3xl font-bold text-green-600">{stats.uniqueBranches}</p>
              </div>
              <Building2 className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-3xl font-bold text-purple-600">${stats.totalAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Restaurante</label>
              <Select value={selectedRestaurant} onValueChange={(v) => { setSelectedRestaurant(v); setSelectedBranch("all"); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {restaurants.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sucursal</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Desde</label>
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hasta</label>
              <Input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ordenar por</label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Fecha ↓ (más reciente)</SelectItem>
                  <SelectItem value="date_asc">Fecha ↑ (más antiguo)</SelectItem>
                  <SelectItem value="created_desc">Últimos agregados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results by Branch */}
      <div className="space-y-4">
        {Object.keys(jobsByBranch).sort().map(branch => (
          <Card key={branch}>
            <CardHeader className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{branch}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {jobsByBranch[branch].length} servicio(s) • 
                      ${jobsByBranch[branch].reduce((sum, j) => sum + (j.final_amount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  onClick={() => setCertificateJob(jobsByBranch[branch][0])}
                  className="bg-blue-600"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generar Certificado
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {jobsByBranch[branch].map(job => (
                  <div key={job.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                    <Calendar className="w-4 h-4 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {format(parseISO(job.scheduled_date), "d 'de' MMMM yyyy", { locale: es })}
                        </span>
                        <span className="text-sm text-gray-500">• {job.restaurant_name}</span>
                      </div>
                      <p className="text-sm text-gray-700">{job.message}</p>
                      {job.notes && (
                        <p className="text-xs text-gray-500 mt-1">{job.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${(job.final_amount || 0).toFixed(2)}</p>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reportes...</p>
        </div>
      )}

      {!isLoading && filteredJobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron servicios con los filtros seleccionados</p>
            <Button
              className="mt-4 bg-proman-yellow text-proman-navy"
              onClick={() => setShowNewJobModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primer Trabajo Corporativo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal: Nuevo Trabajo Corporativo */}
      {showNewJobModal && (
        <NewCorporateJobModal
          open={showNewJobModal}
          onClose={() => setShowNewJobModal(false)}
        />
      )}

      {/* Modal: Acreditación de Limpieza */}
      {certificateJob && (
        <CleaningCertificateModal
          inquiry={certificateJob}
          open={!!certificateJob}
          onClose={() => setCertificateJob(null)}
        />
      )}
    </div>
  );
}