import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const severityClasses = {
  warning: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
  critical: "bg-red-200 text-red-900"
};

export default function ErrorRow({ error, onResolve }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{error.source_name}</p>
            <Badge className={severityClasses[error.severity] || severityClasses.error}>{error.severity || "error"}</Badge>
            <Badge variant="outline">{error.status || "open"}</Badge>
          </div>
          <p className="text-sm font-medium text-slate-800">{error.message}</p>
          {error.details && <p className="text-sm text-slate-600">{error.details}</p>}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span>{new Date(error.occurred_at).toLocaleString("es-SV")}</span>
            {error.related_entity_id && <span>{error.related_entity}: {error.related_entity_id}</span>}
          </div>
        </div>
        {error.status !== "resolved" && (
          <Button variant="outline" onClick={() => onResolve(error.id)}>
            Marcar resuelto
          </Button>
        )}
      </div>
    </div>
  );
}