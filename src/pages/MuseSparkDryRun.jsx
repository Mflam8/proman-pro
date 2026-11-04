import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldAlert } from "lucide-react";

export default function MuseSparkDryRun() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Prueba puntual de Muse Spark
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Badge variant="outline">Detenida antes del envío</Badge>
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              El preview de la interfaz llama al backend live de PROMAN. Esa función omitió la solicitud por el último evento de la conversación; no envió mensajes a Meta ni escribió datos.
            </p>
            <p className="flex gap-2 rounded-md border border-slate-200 bg-white p-3 text-slate-700">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              Para continuar de forma segura se necesita un backend de prueba aislado, o una modificación deliberada y revisada de la función live. No hay ningún botón activo en esta pantalla.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
