import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const MONTH_LABELS = {
  "2026-04": "Abril 2026",
  "2026-05": "Mayo 2026",
  "2026-06": "Junio 2026",
  "2026-07": "Julio 2026"
};

export default function MonthlyAuditSummary({ months, selectedMonth, onSelectMonth }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["monthly-audit-summary", months],
    queryFn: async () => {
      const results = await Promise.all(
        months.map(async (month) => {
          const response = await base44.functions.invoke("findUnreportedSales", { month });
          return {
            month,
            summary: response.data?.summary || {
              totalConversations: 0,
              confirmedInSystemCount: 0,
              probableCount: 0,
              doubtfulCount: 0
            }
          };
        })
      );
      return results;
    },
    initialData: []
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-proman-navy">
          <BarChart3 className="w-5 h-5 text-proman-yellow" />Resumen inicial por mes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">Cargando conteos iniciales...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {data.map((item) => {
              const active = item.month === selectedMonth;
              return (
                <button
                  key={item.month}
                  onClick={() => onSelectMonth(item.month)}
                  className={active
                    ? "rounded-2xl border-2 border-proman-yellow bg-amber-50 p-4 text-left shadow-sm"
                    : "rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300"}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-proman-navy">{MONTH_LABELS[item.month] || item.month}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">{item.summary.totalConversations}</p>
                      <p className="text-xs text-slate-500">conversaciones detectadas</p>
                    </div>
                    <span className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
                      Ver mes
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-slate-500">Confirmadas</p>
                      <p className="font-semibold text-emerald-700">{item.summary.confirmedInSystemCount}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-slate-500">Probables</p>
                      <p className="font-semibold text-blue-700">{item.summary.probableCount}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-slate-500">Dudosos</p>
                      <p className="font-semibold text-amber-700">{item.summary.doubtfulCount}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}