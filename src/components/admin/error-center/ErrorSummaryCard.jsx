import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorSummaryCard({ label, value, tone }) {
  const toneClasses = {
    neutral: "bg-slate-50 text-slate-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700"
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className={`rounded-xl px-4 py-3 ${toneClasses[tone] || toneClasses.neutral}`}>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}