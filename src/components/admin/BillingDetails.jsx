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
import { Plus, Edit2, Trash2, DollarSign, Package, Truck, Wrench, FileText, Camera } from "lucide-react";

const tipoItemConfig = {
  servicio: { label: "Servicio", icon: Wrench, color: "bg-blue-100 text-blue-800" },
  material: { label: "Material", icon: Package, color: "bg-green-100 text-green-800" },
  transporte: { label: "Transporte", icon: Truck, color: "bg-purple-100 text-purple-800" },
  mano_de_obra: { label: "Mano de Obra", icon: Wrench, color: "bg-orange-100 text-orange-800" },
  otro: { label: "Otro", icon: FileText, color: "bg-gray-100 text-gray-800" }
};

export default function BillingDetails({ inquiryId, canEdit = true }) {
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['billingItems', inquiryId],
    queryFn: () => base44.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId }),
    enabled: !!inquiryId,
    initialData: [],
  });

  const createItem = useMutation({
    mutationFn: (data) => base44.entities.DetalleFacturaTrabajo.create({
      ...data,
      inquiry_id: inquiryId,
      monto_total_item: data.cantidad * data.precio_unitario
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
      setShowItemModal(false);
      setEditingItem(null);
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DetalleFacturaTrabajo.update(id, {
      ...data,
      monto_total_item: data.cantidad * data.precio_unitario
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
      setShowItemModal(false);
      setEditingItem(null);
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.DetalleFacturaTrabajo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
    },
  });

  const totalAmount = items.reduce((sum, item) => sum + (item.monto_total_item || 0), 0);

  const itemsByType = {
    servicio: items.filter(i => i.tipo_item === 'servicio'),
    material: items.filter(i => i.tipo_item === 'material'),
    transporte: items.filter(i => i.tipo_item === 'transporte'),
    mano_de_obra: items.filter(i => i.tipo_item === 'mano_de_obra'),
    otro: items.filter(i => i.tipo_item === 'otro')
  };

  return (
    <Card className="border-2 border-proman-yellow">
      <CardHeader className="bg-proman-yellow/10">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Detalles de Facturación
          </CardTitle>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setShowItemModal(true);
              }}
              className="bg-proman-yellow text-proman-navy hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="bg-proman-navy text-white rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Monto Total de Facturación:</span>
            <span className="text-3xl font-bold">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 py-4">Cargando detalles...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No hay items de facturación registrados</p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowItemModal(true)}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar primer item
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(itemsByType).map(([tipo, typeItems]) => {
              if (typeItems.length === 0) return null;
              const config = tipoItemConfig[tipo];
              const Icon = config.icon;
              const subtotal = typeItems.reduce((sum, item) => sum + (item.monto_total_item || 0), 0);

              return (
                <div key={tipo} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-proman-navy" />
                      <h4 className="font-semibold text-proman-navy">{config.label}</h4>
                      <Badge variant="outline">{typeItems.length} items</Badge>
                    </div>
                    <span className="font-bold text-proman-navy">${subtotal.toFixed(2)}</span>
                  </div>

                  <div className="space-y-2">
                    {typeItems.map((item) => (
                      <div key={item.id} className="bg-white rounded p-3 border">
                        <div className="flex justify-between items-start gap-3">
                          {item.descripcion && item.descripcion.startsWith('http') && (
                            <img 
                              src={item.descripcion} 
                              alt="Factura" 
                              className="w-20 h-20 object-cover rounded border cursor-pointer"
                              onClick={() => window.open(item.descripcion, '_blank')}
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mt-1">
                              {item.cantidad} x ${item.precio_unitario.toFixed(2)} = 
                              <span className="font-semibold ml-1">${item.monto_total_item.toFixed(2)}</span>
                            </p>
                            {item.descripcion && item.descripcion.startsWith('http') && (
                              <a 
                                href={item.descripcion} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                              >
                                Ver imagen completa
                              </a>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-2 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItem(item);
                                  setShowItemModal(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('¿Eliminar este item de facturación?')) {
                                    deleteItem.mutate(item.id);
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

      {showItemModal && (
        <Dialog open={showItemModal} onOpenChange={() => {
          setShowItemModal(false);
          setEditingItem(null);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Item de Facturación' : 'Agregar Item de Facturación'}
              </DialogTitle>
            </DialogHeader>
            <BillingItemForm
              item={editingItem}
              onSubmit={(data) => {
                if (editingItem) {
                  updateItem.mutate({ id: editingItem.id, data });
                } else {
                  createItem.mutate(data);
                }
              }}
              onCancel={() => {
                setShowItemModal(false);
                setEditingItem(null);
              }}
              isSubmitting={createItem.isPending || updateItem.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function BillingItemForm({ item, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    tipo_item: item?.tipo_item || 'servicio',
    descripcion: item?.descripcion || '',
    cantidad: item?.cantidad || 1,
    precio_unitario: item?.precio_unitario || 0
  });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    const uploadImage = async () => {
      if (!imageFile) return;
      setIsUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        setFormData(prev => ({ ...prev, descripcion: file_url }));
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
    onSubmit(formData);
  };

  const montoTotal = formData.cantidad * formData.precio_unitario;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Tipo de Item *
        </Label>
        <Select
          value={formData.tipo_item}
          onValueChange={(v) => setFormData({ ...formData, tipo_item: v })}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(tipoItemConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Imagen del Item (Factura/Recibo) *
        </Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          {formData.descripcion ? (
            <div className="space-y-2">
              <img 
                src={formData.descripcion} 
                alt="Factura" 
                className="max-h-40 mx-auto rounded border"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFormData({ ...formData, descripcion: '' })}
              >
                Cambiar imagen
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Camera className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">Subir imagen de factura o recibo</p>
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
        <p className="text-xs text-gray-500 mt-1">
          Esta imagen se podrá compartir por WhatsApp con el cliente
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-proman-navy mb-2">
            Cantidad *
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.cantidad}
            onChange={(e) => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div>
          <Label className="block text-sm font-medium text-proman-navy mb-2">
            Precio Unitario ($) *
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
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-900">Monto Total del Item:</span>
          <span className="text-xl font-bold text-blue-900">${montoTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-proman-yellow text-proman-navy hover:opacity-90"
          disabled={isSubmitting || isUploading || !formData.descripcion}
          >
          {isSubmitting || isUploading ? 'Guardando...' : item ? 'Actualizar' : 'Agregar'}
          </Button>
      </div>
    </form>
  );
}