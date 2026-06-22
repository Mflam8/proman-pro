import React from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ErrorSummaryCard from "@/components/admin/error-center/ErrorSummaryCard";
import ErrorRow from "@/components/admin/error-center/ErrorRow";

export default function ErrorCenter() {
  const [user, setUser] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [filter, setFilter] = React.useState("open");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadErrors = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.role !== "admin") {
        setErrors([]);
        return;
      }

      const records = await base44.entities.SystemError.filter({}, "-occurred_at", 100);
      setErrors(records);
    } catch (error) {
      base44.auth.redirectToLogin(window.location.pathname);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadErrors();
    const intervalId = setInterval(() => loadErrors(true), 20000);
    return () => clearInterval(intervalId);
  }, [loadErrors]);

  const visibleErrors = React.useMemo(() => {
    if (filter === "all") return errors;
    return errors.filter((item) => item.status === filter);
  }, [errors, filter]);

  const openCount = errors.filter((item) => item.status !== "resolved").length;
  const criticalCount = errors.filter((item) => item.severity === "critical" && item.status !== "resolved").length;
  const automationCount = errors.filter((item) => item.source_type === "automation" && item.status !== "resolved").length;
  const last24HoursCount = errors.filter((item) => Date.now() - new Date(item.occurred_at).getTime() < 86400000).length;

  const handleResolve = async (id) => {
    await base44.entities.SystemError.update(id, {
      status: "resolved",
      resolved_at: new Date().toISOString()
    });
    setErrors((current) => current.map((item) => item.id === id ? { ...item, status: "resolved", resolved_at: new Date().toISOString() } : item));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-proman-navy"></div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <ShieldAlert className="h-10 w-10 text-red-600" />
              <div>
                <p className="text-xl font-semibold text-slate-900">Acceso solo para admins</p>
                <p className="mt-2 text-sm text-slate-600">Este centro muestra fallos críticos y solo está disponible para administración.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-proman-navy">Centro de errores</h1>
            <p className="mt-2 text-sm text-slate-600">Vista en vivo de fallos críticos capturados por el sistema. Se refresca cada 20 segundos.</p>
          </div>
          <Button onClick={() => loadErrors(true)} className="bg-proman-navy text-white hover:opacity-90">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <ErrorSummaryCard label="Abiertos" value={openCount} tone="danger" />
          <ErrorSummaryCard label="Críticos" value={criticalCount} tone="warning" />
          <ErrorSummaryCard label="Automatizaciones" value={automationCount} tone="info" />
          <ErrorSummaryCard label="Últimas 24h" value={last24HoursCount} tone="neutral" />
        </div>

        <Card className="mb-6 border-amber-200 bg-amber-50/70">
          <CardContent className="flex gap-3 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>Desde aquí puedes detectar cuándo una automatización o función crítica falla, revisar el motivo y marcar el incidente como resuelto.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Incidentes recientes</CardTitle>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "open", label: "Abiertos" },
                { key: "resolved", label: "Resueltos" },
                { key: "all", label: "Todos" }
              ].map((option) => (
                <Button
                  key={option.key}
                  variant={filter === option.key ? "default" : "outline"}
                  className={filter === option.key ? "bg-proman-navy text-white hover:opacity-90" : ""}
                  onClick={() => setFilter(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleErrors.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">
                No hay incidentes en esta vista.
              </div>
            ) : (
              visibleErrors.map((error) => (
                <ErrorRow key={error.id} error={error} onResolve={handleResolve} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}