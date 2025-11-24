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
import { Plus, Edit2, Trash2, DollarSign, Wrench, FileText, FileDown } from "lucide-react";

const tipoItemConfig = {
  servicio: { label: "Servicio", icon: Wrench, color: "bg-blue-100 text-blue-800" },
  mano_de_obra: { label: "Mano de Obra", icon: Wrench, color: "bg-orange-100 text-orange-800" }
};

export default function BillingDetails({ inquiryId, canEdit = true, inquiry = null }) {
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: allItems, isLoading } = useQuery({
    queryKey: ['billingItems', inquiryId],
    queryFn: () => base44.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId }),
    enabled: !!inquiryId,
    initialData: [],
  });

  // Filtrar solo servicios y mano de obra (excluir materiales, transporte, etc.)
  const items = allItems.filter(i => i.tipo_item === 'servicio' || i.tipo_item === 'mano_de_obra');

  const createItem = useMutation({
    mutationFn: (data) => {
      const precioBase = data.cantidad * data.precio_unitario;
      const aplicarInteres = (data.tipo_item === 'servicio' || data.tipo_item === 'mano_de_obra') && data.incluir_iva;
      const montoTotal = aplicarInteres ? precioBase * 1.13 : precioBase;
      
      return base44.entities.DetalleFacturaTrabajo.create({
        ...data,
        inquiry_id: inquiryId,
        monto_total_item: montoTotal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
      setShowItemModal(false);
      setEditingItem(null);
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => {
      const precioBase = data.cantidad * data.precio_unitario;
      const aplicarInteres = (data.tipo_item === 'servicio' || data.tipo_item === 'mano_de_obra') && data.incluir_iva;
      const montoTotal = aplicarInteres ? precioBase * 1.13 : precioBase;
      
      return base44.entities.DetalleFacturaTrabajo.update(id, {
        ...data,
        monto_total_item: montoTotal
      });
    },
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
    mano_de_obra: items.filter(i => i.tipo_item === 'mano_de_obra')
  };

  const handleGenerateInvoice = async () => {
    if (!inquiry) return;
    setIsGenerating(true);
    
    try {
      const response = await base44.functions.invoke('generateInvoice', {
        inquiryId: inquiry.id
      });

      if (response.data.success) {
        await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
        await queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });
        
        window.open(response.data.pdf_url, '_blank');
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
      alert('Error al generar factura: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-2 border-proman-yellow">
      <CardHeader className="bg-proman-yellow/10">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Facturación al Cliente
          </CardTitle>
          <div className="flex gap-2">
            {canEdit && items.length > 0 && (
              <Button
                size="sm"
                onClick={handleGenerateInvoice}
                disabled={isGenerating}
                className="bg-proman-navy text-white hover:opacity-90"
              >
                <FileDown className="w-4 h-4 mr-1" />
                {isGenerating ? 'Generando...' : 'Factura PDF'}
              </Button>
            )}
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
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="bg-proman-navy text-white rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total a Cobrar al Cliente:</span>
            <span className="text-3xl font-bold">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 py-4">Cargando detalles...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No hay servicios facturables registrados</p>
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
                            {!item.descripcion.startsWith('http') && (
                              <p className="font-medium text-gray-900 mb-1">{item.descripcion}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              {item.cantidad} x ${item.precio_unitario.toFixed(2)}
                              {(item.tipo_item === 'servicio' || item.tipo_item === 'mano_de_obra') && item.incluir_iva && (
                                <span className="text-xs text-blue-600 ml-1">(+13% IVA)</span>
                              )}
                              {' = '}
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
    precio_unitario: item?.precio_unitario || 0,
    service_id: item?.service_id || '',
    incluir_iva: item?.incluir_iva !== undefined ? item.incluir_iva : true
  });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch services for servicio type
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list(),
    enabled: formData.tipo_item === 'servicio',
    initialData: [],
  });

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

  // Para servicios, agregar 13% solo si se selecciona incluir IVA
  const aplicarInteres = (formData.tipo_item === 'servicio' || formData.tipo_item === 'mano_de_obra') && formData.incluir_iva;
  const precioBase = formData.cantidad * formData.precio_unitario;
  const montoTotal = aplicarInteres ? precioBase * 1.13 : precioBase;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Tipo de Item *
        </Label>
        <Select
          value={formData.tipo_item}
          onValueChange={(v) => setFormData({ ...formData, tipo_item: v, descripcion: '', precio_unitario: 0, service_id: '' })}
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

      {formData.tipo_item === 'servicio' ? (
        <div>
          <Label className="block text-sm font-medium text-proman-navy mb-2">
            Seleccionar Servicio del Catálogo *
          </Label>
          <Select
            value={formData.service_id}
            onValueChange={(serviceId) => {
              const service = services.find(s => s.id === serviceId);
              if (service) {
                setFormData(prev => ({
                  ...prev,
                  service_id: serviceId,
                  descripcion: service.service_name,
                  precio_unitario: service.base_price || 0
                }));
              }
            }}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar servicio" />
            </SelectTrigger>
            <SelectContent>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.service_name} - ${service.base_price || 0}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.descripcion && (
            <p className="text-sm text-gray-600 mt-2">
              <strong>Servicio seleccionado:</strong> {formData.descripcion}
            </p>
          )}
        </div>
      ) : (
        <div>
          <Label className="block text-sm font-medium text-proman-navy mb-2">
            Descripción de Mano de Obra *
          </Label>
          <Textarea
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Ej: Instalación especializada, Trabajo nocturno, etc."
            rows={3}
            required
          />
        </div>
      )}

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

      {(formData.tipo_item === 'servicio' || formData.tipo_item === 'mano_de_obra') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.incluir_iva}
              onChange={(e) => setFormData({ ...formData, incluir_iva: e.target.checked })}
              className="w-4 h-4 text-proman-navy focus:ring-proman-yellow rounded"
            />
            <div>
              <span className="text-sm font-medium text-blue-900">Incluir IVA (13%)</span>
              <p className="text-xs text-blue-700 mt-0.5">
                Marca esta opción si deseas agregar el 13% de IVA al precio
              </p>
            </div>
          </label>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Subtotal:</span>
            <span className="font-medium">${precioBase.toFixed(2)}</span>
          </div>
          {aplicarInteres && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700">IVA (13%):</span>
              <span className="font-medium text-blue-600">+${(precioBase * 0.13).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm font-medium text-proman-navy">Monto Total del Item:</span>
            <span className="text-xl font-bold text-proman-navy">${montoTotal.toFixed(2)}</span>
          </div>
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