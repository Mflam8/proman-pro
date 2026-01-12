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
import { Plus, Edit2, Trash2, DollarSign, Wrench, FileText, FileDown, CheckCircle, Layers } from "lucide-react";

const tipoItemConfig = {
  servicio: { label: "Servicio/Trabajo", icon: Wrench, color: "bg-blue-100 text-blue-800" },
  mano_de_obra: { label: "Mano de Obra", icon: Wrench, color: "bg-orange-100 text-orange-800" }
};

const unidadMedidaConfig = {
  unidad: "unidad",
  m2: "m²",
  ml: "ml",
  hora: "hora",
  dia: "día",
  global: "global"
};

export default function BillingDetails({ inquiryId, canEdit = true, inquiry = null }) {
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [quoteAsunto, setQuoteAsunto] = useState("");
  const [showQuoteOptions, setShowQuoteOptions] = useState(false);
  const [documentType, setDocumentType] = useState("cotizacion"); // "cotizacion" o "factura"
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [descuento, setDescuento] = useState(0);
  const queryClient = useQueryClient();

  const { data: allItems, isLoading } = useQuery({
    queryKey: ['billingItems', inquiryId],
    queryFn: () => base44.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId }),
    enabled: !!inquiryId,
    initialData: [],
  });

  // Filtrar solo servicios y mano de obra
  const items = allItems.filter(i => {
    const itemData = i.data || i;
    return itemData.tipo_item === 'servicio' || itemData.tipo_item === 'mano_de_obra';
  }).map(i => i.data || i);

  const createItem = useMutation({
    mutationFn: (data) => {
      const precioBase = data.cantidad * data.precio_unitario;
      return base44.entities.DetalleFacturaTrabajo.create({
        ...data,
        inquiry_id: inquiryId,
        monto_total_item: precioBase
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
      setShowItemModal(false);
      setEditingItem(null);
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => {
      const precioBase = data.cantidad * data.precio_unitario;
      return base44.entities.DetalleFacturaTrabajo.update(id, {
        ...data,
        monto_total_item: precioBase
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
      setShowItemModal(false);
      setEditingItem(null);
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.DetalleFacturaTrabajo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
    },
  });

  const toggleOpcionSeleccionada = useMutation({
    mutationFn: async ({ itemId, selected }) => {
      const item = allItems.find(i => (i.id || i.data?.id) === itemId);
      const itemData = item?.data || item;
      const opcionNum = itemData?.opcion_numero || 1;
      
      // Actualizar todos los items de esta opción
      const itemsToUpdate = allItems.filter(i => {
        const data = i.data || i;
        return data.opcion_numero === opcionNum;
      });
      
      for (const i of itemsToUpdate) {
        await base44.entities.DetalleFacturaTrabajo.update(i.id, {
          opcion_seleccionada: selected
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
    },
  });

  // Agrupar por opción
  const itemsByOption = {};
  items.forEach(item => {
    const opcionNum = item.opcion_numero || 1;
    if (!itemsByOption[opcionNum]) {
      itemsByOption[opcionNum] = {
        numero: opcionNum,
        titulo: item.opcion_titulo || `Opción ${opcionNum}`,
        items: [],
        seleccionada: item.opcion_seleccionada || false
      };
    }
    itemsByOption[opcionNum].items.push(item);
    if (item.opcion_seleccionada) {
      itemsByOption[opcionNum].seleccionada = true;
    }
  });

  const opciones = Object.values(itemsByOption).sort((a, b) => a.numero - b.numero);
  
  // Total solo de opciones seleccionadas
  const totalSeleccionado = opciones
    .filter(op => op.seleccionada)
    .reduce((sum, op) => sum + op.items.reduce((s, i) => s + (i.monto_total_item || 0), 0), 0);

  // Total general (todas las opciones)
  const totalGeneral = items.reduce((sum, item) => sum + (item.monto_total_item || 0), 0);

  const handleGenerateQuote = async () => {
    if (!inquiry) return;
    setIsGeneratingQuote(true);
    
    try {
      const response = await base44.functions.invoke('generateQuote', {
        inquiryId: inquiry.id,
        quoteDate: selectedDate,
        asunto: quoteAsunto || inquiry.service_type,
        descuento: descuento
      });

      if (response.data.success) {
        await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
        if (response.data.html) {
          const win = window.open('', '_blank');
          win.document.write(response.data.html);
          win.document.close();
        } else {
          window.open(response.data.pdf_url, '_blank');
        }
      }
    } catch (err) {
      console.error('Error generating quote:', err);
      alert('Error al generar cotización: ' + err.message);
    } finally {
      setIsGeneratingQuote(false);
      setShowQuoteOptions(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!inquiry) return;
    setIsGeneratingInvoice(true);
    
    try {
      const response = await base44.functions.invoke('generateInvoice', {
        inquiryId: inquiry.id,
        invoiceDate: selectedDate
      });

      if (response.data.success) {
        await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
        window.open(response.data.pdf_url, '_blank');
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
      alert('Error al generar factura: ' + err.message);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  return (
    <Card className="border-2 border-proman-yellow">
      <CardHeader className="bg-proman-yellow/10">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cotización / Facturación
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {canEdit && items.length > 0 && (
              <Button
                size="sm"
                onClick={() => setShowQuoteOptions(true)}
                disabled={isGeneratingQuote || isGeneratingInvoice}
                className="bg-proman-navy text-white hover:opacity-90"
              >
                <FileDown className="w-4 h-4 mr-1" />
                {(isGeneratingQuote || isGeneratingInvoice) ? 'Generando...' : 'Generar PDF'}
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
        {/* Resumen de totales */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-100 rounded-lg p-4">
            <span className="text-sm text-gray-600">Total Cotizado:</span>
            <p className="text-2xl font-bold text-proman-navy">${totalGeneral.toFixed(2)}</p>
          </div>
          <div className="bg-proman-navy text-white rounded-lg p-4">
            <span className="text-sm text-gray-200">Total Aprobado:</span>
            <p className="text-2xl font-bold">${totalSeleccionado.toFixed(2)}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 py-4">Cargando detalles...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No hay items de cotización registrados</p>
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
            {opciones.map((opcion) => {
              const opcionTotal = opcion.items.reduce((sum, i) => sum + (i.monto_total_item || 0), 0);
              
              return (
                <div 
                  key={opcion.numero} 
                  className={`border-2 rounded-lg overflow-hidden ${
                    opcion.seleccionada ? 'border-green-500 bg-green-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className={`p-3 flex justify-between items-center ${
                    opcion.seleccionada ? 'bg-green-500 text-white' : 'bg-gray-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      <Badge className={opcion.seleccionada ? 'bg-white text-green-700' : 'bg-proman-navy text-white'}>
                        <Layers className="w-3 h-3 mr-1" />
                        Opción {opcion.numero}
                      </Badge>
                      <span className="font-semibold">{opcion.titulo}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">${opcionTotal.toFixed(2)}</span>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant={opcion.seleccionada ? "secondary" : "outline"}
                          onClick={() => {
                            const firstItem = opcion.items[0];
                            const itemId = allItems.find(i => {
                              const data = i.data || i;
                              return data.opcion_numero === opcion.numero;
                            })?.id;
                            if (itemId) {
                              toggleOpcionSeleccionada.mutate({ 
                                itemId, 
                                selected: !opcion.seleccionada 
                              });
                            }
                          }}
                          className={opcion.seleccionada ? 'bg-white text-green-700 hover:bg-gray-100' : ''}
                        >
                          <CheckCircle className={`w-4 h-4 mr-1 ${opcion.seleccionada ? 'text-green-600' : ''}`} />
                          {opcion.seleccionada ? 'Aprobada' : 'Aprobar'}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    {opcion.items.map((item, idx) => {
                      const itemRecord = allItems.find(i => {
                        const data = i.data || i;
                        return data.descripcion === item.descripcion && data.opcion_numero === item.opcion_numero;
                      });
                      
                      return (
                        <div key={idx} className="bg-white rounded p-3 border">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 mb-1">{item.descripcion}</p>
                              {item.descripcion_detallada && (
                                <p className="text-sm text-gray-600 whitespace-pre-line mb-2">
                                  {item.descripcion_detallada}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                {item.cantidad} {unidadMedidaConfig[item.unidad_medida] || item.unidad_medida} x ${item.precio_unitario?.toFixed(2)}
                                {' = '}
                                <span className="font-semibold">${item.monto_total_item?.toFixed(2)}</span>
                              </p>
                            </div>
                            {canEdit && (
                              <div className="flex gap-2 ml-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingItem({ ...item, id: itemRecord?.id });
                                    setShowItemModal(true);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('¿Eliminar este item?')) {
                                      deleteItem.mutate(itemRecord?.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal para agregar/editar item */}
      {showItemModal && (
        <Dialog open={showItemModal} onOpenChange={() => {
          setShowItemModal(false);
          setEditingItem(null);
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Item de Cotización' : 'Agregar Item de Cotización'}
              </DialogTitle>
            </DialogHeader>
            <BillingItemForm
              item={editingItem}
              existingOptions={opciones}
              onSubmit={(data) => {
                if (editingItem?.id) {
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

      {/* Modal para opciones de documento */}
      {showQuoteOptions && (
        <Dialog open={showQuoteOptions} onOpenChange={() => setShowQuoteOptions(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generar Documento PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Selector de tipo de documento */}
              <div>
                <Label className="block text-sm font-medium mb-2">Tipo de Documento</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cotizacion">📋 Cotización</SelectItem>
                    <SelectItem value="factura">🧾 Factura Comercial</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {documentType === "cotizacion" 
                    ? "Propuesta de precios para aprobación del cliente (sin IVA incluido)." 
                    : "Documento final de cobro por servicios realizados (incluye IVA)."}
                </p>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">Fecha del Documento</Label>
                <Input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                />
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Asunto {documentType === "cotizacion" ? "de la Cotización" : "de la Factura"}
                </Label>
                <Textarea
                  value={quoteAsunto}
                  onChange={(e) => setQuoteAsunto(e.target.value)}
                  placeholder="Ej: Impermeabilizado y reparaciones en cisterna de agua potable"
                  rows={3}
                />
              </div>

              {documentType === "cotizacion" && (
                <div>
                  <Label className="block text-sm font-medium mb-2">
                    Descuento ($) - Opcional
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={descuento}
                    onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ej: Si el cliente pagó visita técnica que se descuenta del total
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowQuoteOptions(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (documentType === "cotizacion") {
                      handleGenerateQuote();
                    } else {
                      handleGenerateInvoice();
                    }
                  }}
                  disabled={isGeneratingQuote || isGeneratingInvoice}
                  className="bg-proman-yellow text-proman-navy"
                >
                  {(isGeneratingQuote || isGeneratingInvoice) ? 'Generando...' : `Generar ${documentType === "cotizacion" ? "Cotización" : "Factura"}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function BillingItemForm({ item, existingOptions, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    tipo_item: item?.tipo_item || 'servicio',
    opcion_numero: item?.opcion_numero || (existingOptions.length > 0 ? existingOptions[existingOptions.length - 1].numero : 1),
    opcion_titulo: item?.opcion_titulo || '',
    descripcion: item?.descripcion || '',
    descripcion_detallada: item?.descripcion_detallada || '',
    cantidad: item?.cantidad || 1,
    unidad_medida: item?.unidad_medida || 'unidad',
    precio_unitario: item?.precio_unitario || 0,
    incluir_iva: item?.incluir_iva || false,
    es_cotizacion: item?.es_cotizacion !== false
  });
  
  const [isNewOption, setIsNewOption] = useState(false);
  const [useCustomTitle, setUseCustomTitle] = useState(!!item?.descripcion);

  // Fetch services from catalog
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.filter({ is_active: true }),
    initialData: [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const precioTotal = formData.cantidad * formData.precio_unitario;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      {/* Selección de Opción */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <Label className="block text-sm font-medium text-blue-900 mb-2">
          <Layers className="w-4 h-4 inline mr-1" />
          Agrupar en Opción
        </Label>
        
        {!isNewOption ? (
          <div className="space-y-2">
            <Select
              value={formData.opcion_numero.toString()}
              onValueChange={(v) => {
                if (v === 'new') {
                  setIsNewOption(true);
                  setFormData({
                    ...formData,
                    opcion_numero: existingOptions.length + 1,
                    opcion_titulo: ''
                  });
                } else {
                  const opcion = existingOptions.find(o => o.numero.toString() === v);
                  setFormData({
                    ...formData,
                    opcion_numero: parseInt(v),
                    opcion_titulo: opcion?.titulo || `Opción ${v}`
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {existingOptions.map(op => (
                  <SelectItem key={op.numero} value={op.numero.toString()}>
                    Opción {op.numero}: {op.titulo}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Crear nueva opción</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={`Opción ${formData.opcion_numero}`}
                disabled
                className="w-24"
              />
              <Input
                value={formData.opcion_titulo}
                onChange={(e) => setFormData({ ...formData, opcion_titulo: e.target.value })}
                placeholder="Título de la opción (ej: Impermeabilizado completo)"
                className="flex-1"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsNewOption(false)}
            >
              Cancelar nueva opción
            </Button>
          </div>
        )}
      </div>

      {/* Título del Item - Dropdown o personalizado */}
      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Título del Item *
        </Label>
        <Select
          value={useCustomTitle ? "_custom" : (formData.descripcion || "_empty")}
          onValueChange={(v) => {
            if (v === "_custom") {
              setUseCustomTitle(true);
              setFormData({ ...formData, descripcion: '' });
            } else if (v === "_empty") {
              setUseCustomTitle(false);
              setFormData({ ...formData, descripcion: '' });
            } else {
              setUseCustomTitle(false);
              setFormData({ ...formData, descripcion: v });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar servicio..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_empty">-- Sin título (vacío) --</SelectItem>
            {services.map(service => (
              <SelectItem key={service.id} value={service.service_name}>
                {service.service_name}
              </SelectItem>
            ))}
            <SelectItem value="_custom">✏️ Escribir título personalizado...</SelectItem>
          </SelectContent>
        </Select>
        
        {useCustomTitle && (
          <Input
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Ej: Impermeabilizado completo de cisterna"
            className="mt-2"
          />
        )}
      </div>

      {/* Descripción detallada */}
      <div>
        <Label className="block text-sm font-medium text-proman-navy mb-2">
          Descripción Detallada del Trabajo
        </Label>
        <Textarea
          value={formData.descripcion_detallada}
          onChange={(e) => setFormData({ ...formData, descripcion_detallada: e.target.value })}
          placeholder="El trabajo consiste en:
- Escarificación de 39 m2 para remover pintura existente...
- Suministro y aplicación de SikaMonotop Seal 107..."
          rows={5}
        />
        <p className="text-xs text-gray-500 mt-1">
          Esta descripción aparecerá en la cotización PDF
        </p>
      </div>

      {/* Cantidad y Unidad */}
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
            Unidad de Medida
          </Label>
          <Select
            value={formData.unidad_medida}
            onValueChange={(v) => setFormData({ ...formData, unidad_medida: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(unidadMedidaConfig).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Precio Unitario */}
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

      {/* Total */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-proman-navy">Precio Total del Item:</span>
          <span className="text-xl font-bold text-proman-navy">${precioTotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Nota: El IVA se calcula al generar la factura final, no en la cotización.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-proman-yellow text-proman-navy hover:opacity-90"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : item ? 'Actualizar' : 'Agregar'}
        </Button>
      </div>
    </form>
  );
}