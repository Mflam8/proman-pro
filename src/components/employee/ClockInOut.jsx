import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, LogIn, LogOut, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ClockInOut({ user }) {
  const [extraHours, setExtraHours] = useState("");
  const queryClient = useQueryClient();

  const { data: todayEntries } = useQuery({
    queryKey: ['timeEntries', user.email],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const entries = await base44.entities.TimeEntry.filter({ employee_email: user.email }, '-timestamp');
      return entries.filter(e => e.timestamp.startsWith(today));
    },
    enabled: !!user,
  });

  const lastEntry = todayEntries?.[0];
  const canClockIn = !lastEntry || lastEntry.entry_type === 'salida';
  const canClockOut = lastEntry?.entry_type === 'entrada';

  const clockMutation = useMutation({
    mutationFn: (type) => base44.entities.TimeEntry.create({
      employee_email: user.email,
      entry_type: type,
      timestamp: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });

  const extraHoursMutation = useMutation({
    mutationFn: (hours) => base44.entities.TimeEntry.create({
      employee_email: user.email,
      entry_type: 'hora_extra',
      timestamp: new Date().toISOString(),
      notes: `${hours} horas extras`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setExtraHours("");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-proman-yellow" />
          Marcaje de Horas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-proman-navy">
            {format(new Date(), "HH:mm:ss")}
          </div>
          <div className="text-sm text-gray-600">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </div>
        </div>

        {lastEntry && (
          <div className="text-sm text-gray-600 text-center">
            Último registro: <span className="font-semibold">{lastEntry.entry_type}</span> a las {format(new Date(lastEntry.timestamp), "HH:mm")}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => clockMutation.mutate('entrada')}
            disabled={!canClockIn || clockMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Entrada
          </Button>
          <Button
            onClick={() => clockMutation.mutate('salida')}
            disabled={!canClockOut || clockMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salida
          </Button>
        </div>

        <div className="pt-4 border-t">
          <label className="block text-sm font-medium text-proman-navy mb-2">
            Registrar Horas Extras
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.5"
              placeholder="Ej: 2.5"
              value={extraHours}
              onChange={(e) => setExtraHours(e.target.value)}
            />
            <Button
              onClick={() => extraHoursMutation.mutate(extraHours)}
              disabled={!extraHours || extraHoursMutation.isPending}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Registrar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}