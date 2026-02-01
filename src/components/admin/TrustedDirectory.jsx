import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Plus, Trash2, Save, Users, AlertCircle } from "lucide-react";

export default function TrustedDirectory() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", 
    phone_number: "", 
    role: "technician", 
    active: true,
    related_id: "" 
  });

  const { data: numbers, isLoading } = useQuery({
    queryKey: ['trustedNumbers'],
    queryFn: () => base44.entities.TrustedDirectory.list('-created_date'),
    initialData: []
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const createNumber = useMutation({
    mutationFn: (data) => base44.entities.TrustedDirectory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustedNumbers'] });
      setIsOpen(false);
      setFormData({ name: "", phone_number: "", role: "technician", active: true, related_id: "" });
      alert("✅ Número agregado correctamente");
    },
    onError: (error) => alert("❌ Error al guardar: " + error.message)
  });

  const deleteNumber = useMutation({
    mutationFn: (id) => base44.entities.TrustedDirectory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustedNumbers'] });
      alert("✅ Número eliminado");
    }
  });

  const updateNumber = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrustedDirectory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustedNumbers'] });
      alert("✅ Número actualizado");
    }
  });

  const handleSubmit = () => {
    if (!formData.phone_number.startsWith('+')) {
      alert("❌ El teléfono debe incluir código de país (ej: +503...)");
      return;
    }
    const cleanData = { 
      ...formData, 
      phone_number: formData.phone_number.trim(),
      related_id: formData.related_id || null
    };
    createNumber.mutate(cleanData);
  };

  const roleConfig = {
    ceo: { label: '👑 CEO', color: 'bg-purple-100 text-purple-800' },
    technician: { label: '👷 Técnico', color: 'bg-orange-100 text-orange-800' },
    corporate: { label: '🏢 Corporativo', color: 'bg-blue-100 text-blue-800' },
    admin: { label: '🛡️ Admin', color: 'bg-red-100 text-red-800' }
  };

  const stats = {
    total: numbers.length,
    technicians: numbers.filter(n => n.role === 'technician').length,
    corporate: numbers.filter(n => n.role === 'corporate').length,
    admin: numbers.filter(n => n.role === 'admin' || n.role === 'ceo').length
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-2 border-green-500 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-800 mb-1">🤖 Directorio de Confianza del Bot</h3>
              <p className="text-sm text-green-700">
                Los números aquí registrados son reconocidos automáticamente por el bot de WhatsApp. 
                Cada rol tiene permisos y flujos específicos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-proman-navy">{stats.total}</div>
            <div className="text-xs text-gray-600">Total Registrados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.technicians}</div>
            <div className="text-xs text-gray-600">Técnicos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.corporate}</div>
            <div className="text-xs text-gray-600">Corporativos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.admin}</div>
            <div className="text-xs text-gray-600">Administradores</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" /> Números Autorizados
            </CardTitle>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-proman-yellow text-proman-navy hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" /> Nuevo Registro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Agregar Número Autorizado</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-proman-navy mb-2 block">Nombre Completo</label>
                    <Input 
                      placeholder="Ej: Juan Pérez García" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-proman-navy mb-2 block">WhatsApp (con +503)</label>
                    <Input 
                      placeholder="+50370000000" 
                      value={formData.phone_number} 
                      onChange={e => setFormData({...formData, phone_number: e.target.value})} 
                    />
                    <p className="text-xs text-gray-500 mt-1">Formato: +503 seguido de 8 dígitos</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-proman-navy mb-2 block">Rol</label>
                    <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">👷 Técnico (Reporta y recibe Agenda)</SelectItem>
                        <SelectItem value="corporate">🏢 Corporativo (Solo registro de mensajes)</SelectItem>
                        <SelectItem value="ceo">👑 CEO (Control total)</SelectItem>
                        <SelectItem value="admin">🛡️ Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(formData.role === 'technician' || formData.role === 'admin') && (
                    <div>
                      <label className="text-sm font-medium text-proman-navy mb-2 block">Vincular a Empleado</label>
                      <Select value={formData.related_id} onValueChange={v => setFormData({...formData, related_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Sin vincular</SelectItem>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.email}>
                              {emp.employee_name || emp.full_name} ({emp.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Vincula con el email del empleado para acceso a agenda
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createNumber.isPending || !formData.name || !formData.phone_number} 
                    className="w-full bg-proman-navy text-white hover:opacity-90 mt-4"
                  >
                    <Save className="w-4 h-4 mr-2"/> Guardar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Vinculado a</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">Cargando...</TableCell></TableRow>
                ) : numbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      No hay números registrados. Agrega el primer número autorizado.
                    </TableCell>
                  </TableRow>
                ) : (
                  numbers.map((num) => (
                    <TableRow key={num.id}>
                      <TableCell className="font-medium">{num.name}</TableCell>
                      <TableCell className="font-mono text-sm">{num.phone_number}</TableCell>
                      <TableCell>
                        <Badge className={roleConfig[num.role]?.color || 'bg-gray-100 text-gray-800'}>
                          {roleConfig[num.role]?.label || num.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {num.related_id || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={num.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          onClick={() => updateNumber.mutate({ 
                            id: num.id, 
                            data: { ...num, active: !num.active } 
                          })}
                          style={{ cursor: 'pointer' }}
                        >
                          {num.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            if (window.confirm(`¿Eliminar a ${num.name}?`)) {
                              deleteNumber.mutate(num.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Guía de Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📖 Guía de Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Badge className="bg-orange-100 text-orange-800">👷 TÉCNICO</Badge>
            <p className="text-gray-600">Recibe agenda diaria, reporta avances, envía fotos del trabajo.</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge className="bg-blue-100 text-blue-800">🏢 CORPORATIVO</Badge>
            <p className="text-gray-600">Sus mensajes se registran automáticamente en CorporateLog para revisión.</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge className="bg-purple-100 text-purple-800">👑 CEO</Badge>
            <p className="text-gray-600">Acceso total, puede consultar reportes y dar órdenes al sistema.</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge className="bg-red-100 text-red-800">🛡️ ADMIN</Badge>
            <p className="text-gray-600">Similar a CEO, para gestión administrativa.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}