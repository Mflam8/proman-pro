import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Package, Truck, Wrench, FileText, Camera, Receipt } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const tipoGastoConfig = {
  material: { label: "Material", icon: Package, color: "bg-green-100 text-green-800" },
  transporte: { label: "Transporte", icon: Truck, color: "bg-purple-100 text-purple-800" },
  herramienta: { label: "Herramienta", icon: Wrench, color: "bg-orange-100 text-orange-800" },
  otro: { label: "Otro", icon: FileText, color: "bg-gray-100 text-gray-800" }
};

export default function WorkExpenses({ inquiryId, canEdit = true }) {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: gastos, isLoading } = useQuery({
    queryKey: ['workExpenses', inquiryId],
    queryFn: () => base44.entities.GastoTrabajo.filter({ inquiry_id: inquiryId }),
    enabled: !!inquiryId,
    initialData: [],
  });

  const createGasto = useMutation({
    mutationFn: (data) => {
      const montoTotal = data.cantidad * data.precio_unitario;
      return base44.entities.GastoTrabajo.create({
        ...data,
        inquiry_id: inquiryId,
        monto_total: montoTotal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workExpenses', inquiryId] });
      setShowModal(false);
      setEditingItem(null);
    },
  });

  const updateGasto = useMutation({
    mutationFn: ({ id, data }) => {
      const montoTotal = data.cantidad * data.precio_unitario;
      return base44.entities.GastoTrabajo.update(id, {
        ...data,
        monto_total: montoTotal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workExpenses', inquiryId] });
      setShowModal(false);
      setEditingItem(null);
    },
  });

  const deleteGasto = useMutation({
    mutationFn: (id) => base44.entities.GastoTrabajo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workExpenses', inquiryId] });
    },
  });

  const totalGastos = gastos.reduce((sum, g) => sum + (g.monto_total || 0), 0);

  const gastosByType = {
    material: gastos.filter(g => g.tipo_gasto === 'material'),
    transporte: gastos.filter(g => g.tipo_gasto === 'transporte'),
    herramienta: gastos.filter(g => g.tipo_gasto === 'herramienta'),
    otro: gastos.filter(g => g.tipo_gasto === 'otro')
  };

  return (
    <Card className="border-2 border-orange-400">
      <CardHeader className="bg-orange-50">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Registro de Gastos del Trabajo
          </CardTitle>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setShowModal(true);
              }}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar Gasto
            </Button>
          )}
        </div>
        <p className="text-xs text-orange-700 mt-1">
          ⚠️ Estos gastos son solo para control interno, NO se incluyen en la factura al cliente
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="bg-orange-500 text-white rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total de Gastos (Interno):</span>
            <span className="text-3xl font-bold">${totalGastos.toFixed(2)}</span>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 py-4">Cargando gastos...</p>
        ) : gastos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No hay gastos registrados</p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowModal(true)}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar primer gasto
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(gastosByType).map(([tipo, typeGastos]) => {
              if (typeGastos.length === 0) return null;
              const config = tipoGastoConfig[tipo];
              const Icon = config.icon;
              const subtotal = typeGastos.reduce((sum, g) => sum + (g.monto_total || 0), 0);

              return (
                <div key={tipo} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-orange-600" />
                      <h4 className="font-semibold text-gray-800">{config.label}</h4>
                      <Badge variant="outline">{typeGastos.length} items</Badge>
                    </div>
                    <span className="font-bold text-orange-600">${subtotal.toFixed(2)}</span>
                  </div>

                  <div className="space-y-2">
                    {typeGastos.map((gasto) => (
                      <div key={gasto.id} className="bg-white rounded p-3 border">
                        <div className="flex justify-between items-start gap-3">
                          {gasto.imagen_factura_url && (
                            <img 
                              src={gasto.imagen_factura_url} 
                              alt="Factura" 
                              className="w-16 h-16 object-cover rounded border cursor-pointer"
                              onClick={() => window.open(gasto.imagen_factura_url, '_blank')}
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 mb-1">{gasto.descripcion}</p>
                            {gasto.proveedor && (
                              <p className="text-xs text-gray-500 mb-1">Proveedor: {gasto.proveedor}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              {gasto.cantidad} x ${gasto.precio_unitario.toFixed(2)}
                              {' = '}
                              <span className="font-semibold">${gasto.monto_total.toFixed(2)}</span>
                            </p>
                            {gasto.fecha_gasto && (
                              <p className="text-xs text-gray-500 mt-1">
                                📅 {format(new Date(gasto.fecha_gasto), "dd MMM yyyy", { locale: es })}
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-2 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItem(gasto);
                                  setShowModal(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('¿Eliminar este gasto?')) {
                                    deleteGasto.mutate(gasto.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {showModal && (
        <Dialog open={showModal} onOpenChange={() => {
          setShowModal(false);
          setEditingItem(null);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Gasto' : 'Agregar Gasto del Trabajo'}
              </DialogTitle>
            </DialogHeader>
            <ExpenseForm
              item={editingItem}
              onSubmit={(data) => {
                if (editingItem) {
                  updateGasto.mutate({ id: editingItem.id, data });
                } else {
                  createGasto.mutate(data);
                }
              }}
              onCancel={() => {
                setShowModal(false);
                setEditingItem(null);
              }}
              isSubmitting={createGasto.isPending || updateGasto.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function ExpenseForm({ item, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    tipo_gasto: item?.tipo_gasto || 'material',
    descripcion: item?.proveedor || item?.descripcion || '',
    cantidad: 1,
    precio_unitario: item?.precio_unitario || 0,
    proveedor: item?.proveedor || '',
    fecha_gasto: item?.fecha_gasto || new Date().toISOString().split('T')[0],
    imagen_factura_url: item?.imagen_factura_url || ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    const uploadImage = async () => {
      if (!imageFile) return;
      setIsUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        setFormData(prev => ({ ...prev, imagen_factura_url: file_url }));
      } catch (error) {
        console.error("Error uploading image", error);
      } finally {
        setIsUploading(false);
      }
    };
    uploadImage();
  }, [imageFile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Usar proveedor como descripción si no hay descripción
    const submitData = {
      ...formData,
      descripcion: formData.proveedor || formData.tipo_gasto,
      cantidad: 1
    };
    onSubmit(submitData);
  };

  const montoTotal = formData.precio_unitario;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Gasto *
        </Label>
        <Select
          value={formData.tipo_gasto}
          onValueChange={(v) => setFormData({ ...formData, tipo_gasto: v })}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(tipoGastoConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Proveedor / Tienda
        </Label>
        <Input
          value={formData.proveedor}
          onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
          placeholder="Ej: Ferretería El Martillo, EPA, etc."
        />
      </div>

      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Fecha del Gasto
        </Label>
        <Input
          type="date"
          value={formData.fecha_gasto}
          onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
        />
      </div>

      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Imagen de Factura/Recibo (opcional)
        </Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          {formData.imagen_factura_url ? (
            <div className="space-y-2">
              <img 
                src={formData.imagen_factura_url} 
                alt="Factura" 
                className="max-h-32 mx-auto rounded border"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFormData({ ...formData, imagen_factura_url: '' })}
              >
                Cambiar imagen
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Camera className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">Subir imagen de factura</p>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                disabled={isUploading}
                className="cursor-pointer"
              />
              {isUploading && <p className="text-xs text-blue-600">Subiendo...</p>}
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Monto ($) *
        </Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.precio_unitario}
          onChange={(e) => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) || 0 })}
          required
        />
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-orange-800">Monto Total:</span>
          <span className="text-xl font-bold text-orange-600">${montoTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-orange-500 text-white hover:bg-orange-600"
          disabled={isSubmitting || isUploading || !formData.descripcion}
        >
          {isSubmitting || isUploading ? 'Guardando...' : item ? 'Actualizar' : 'Agregar'}
        </Button>
      </div>
    </form>
  );
}