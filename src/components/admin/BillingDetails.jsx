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
import { Plus, Edit2, Trash2, DollarSign, Wrench, FileText, FileDown, CheckCircle, Layers, ChevronUp, ChevronDown, Award } from "lucide-react";
import CleaningCertificateModal from "./CleaningCertificateModal";
import { unwrapRecords } from "@/utils/entityRecord";
import { openPdfFromBase64 } from "@/utils/openPdfFromBase64";

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
  const [showCorporateWorkOrder, setShowCorporateWorkOrder] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const queryClient = useQueryClient();

  const { data: allItems, isLoading } = useQuery({
    queryKey: ['billingItems', inquiryId],
    queryFn: () => base44.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId }).then(unwrapRecords),
    enabled: !!inquiryId,
    initialData: [],
  });

  // Filtrar solo servicios y mano de obra, y agregar el id al objeto
  const items = allItems.filter(i => {
    const itemData = i.data || i;
    return itemData.tipo_item === 'servicio' || itemData.tipo_item === 'mano_de_obra';
  }).map(i => {
    const itemData = i.data || i;
    return { ...itemData, _recordId: i.id };
  });

  const createItem = useMutation({
    mutationFn: async (data) => {
      const precioBase = data.cantidad * data.precio_unitario;
      // Calcular el siguiente orden dentro de la opción
      const itemsInOpcion = items.filter(i => i.opcion_numero === data.opcion_numero);
      const maxOrden = itemsInOpcion.length > 0 ? Math.max(...itemsInOpcion.map(i => i.orden || 0)) : -1;
      
      return base44.entities.DetalleFacturaTrabajo.create({
        ...data,
        inquiry_id: inquiryId,
        monto_total_item: precioBase,
        orden: maxOrden + 1
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

  const moveItem = useMutation({
    mutationFn: async ({ itemId, direction, opcionNumero }) => {
      const opcion = opciones.find(o => o.numero === opcionNumero);
      if (!opcion) return;

      const currentIndex = opcion.items.findIndex(i => i._recordId === itemId);
      if (currentIndex === -1) return;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= opcion.items.length) return;

      // Reordenar array
      const reorderedItems = [...opcion.items];
      const [movedItem] = reorderedItems.splice(currentIndex, 1);
      reorderedItems.splice(newIndex, 0, movedItem);

      // Actualizar todos los órdenes
      for (let i = 0; i < reorderedItems.length; i++) {
        const item = reorderedItems[i];
        if (item._recordId) {
          await base44.entities.DetalleFacturaTrabajo.update(item._recordId, { orden: i });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingItems', inquiryId] });
    },
  });

  // Agrupar por opción y ordenar items
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

  // Ordenar items dentro de cada opción
  Object.values(itemsByOption).forEach(opcion => {
    opcion.items.sort((a, b) => (a.orden || 0) - (b.orden || 0));
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
      const defaultSubject = (localStorage.getItem('defaultQuoteSubject') || 'Cotización PROMAN').trim();
      const asuntoToSend = (quoteAsunto && quoteAsunto.trim()) || defaultSubject;
      const response = await base44.functions.invoke('generateQuote', {
        inquiryId: inquiry.id,
        quoteDate: selectedDate,
        asunto: asuntoToSend,
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
    const previewWindow = window.open('', '_blank');
    
    if (previewWindow) {
      previewWindow.document.write('<html><body style="font-family: sans-serif; padding: 24px;">Generando factura...</body></html>');
      previewWindow.document.close();
    }
    
    try {
      const response = await base44.functions.invoke('generateInvoice', {
        inquiryId: inquiry.id,
        invoiceDate: selectedDate
      });

      if (response.success || response.data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
        const pdfBase64 = response.pdf_base64 || response.data?.pdf_base64;
        const pdfUrl = response.pdf_url || response.data?.pdf_url;
        const filename = response.filename || response.data?.filename;

        if (pdfBase64) {
          openPdfFromBase64(pdfBase64, filename, previewWindow);
        } else if (pdfUrl) {
          if (previewWindow && !previewWindow.closed) {
            previewWindow.location.href = pdfUrl;
          } else {
            window.open(pdfUrl, '_blank');
          }
        } else {
          if (previewWindow && !previewWindow.closed) previewWindow.close();
          alert('No se pudo abrir la factura generada');
        }
      } else {
        if (previewWindow && !previewWindow.closed) previewWindow.close();
        alert(response.data?.details || response.data?.error || 'Error al generar factura');
      }
    } catch (err) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      console.error('Error generating invoice:', err);
      const errorMessage = err?.response?.data?.details || err?.response?.data?.error || err.message;
      alert('Error al generar factura: ' + errorMessage);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleGenerateCorporateWorkOrder = async () => {
    if (!inquiry) return;
    
    if (!fechaInicio || !fechaFin) {
      alert('Por favor selecciona el rango de fechas');
      return;
    }

    setIsGeneratingQuote(true);
    
    try {
      const response = await base44.functions.invoke('generateCorporateWorkOrder', {
        customerId: inquiry.customer_id,
        fechaInicio,
        fechaFin,
        asunto: quoteAsunto
      });

      if (response.success || response.data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
        const html = response.html || response.data?.html;
        if (html) {
          const win = window.open('', '_blank');
          win.document.write(html);
          win.document.close();
        }
        alert(`Orden generada con ${response.trabajos_incluidos || response.data?.trabajos_incluidos} trabajos`);
      }
    } catch (err) {
      console.error('Error generating corporate work order:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsGeneratingQuote(false);
      setShowCorporateWorkOrder(false);
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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {canEdit && inquiry?.customer_id && (
              <Button
                size="sm"
                onClick={() => setShowCorporateWorkOrder(true)}
                disabled={isGeneratingQuote || isGeneratingInvoice}
                className="bg-blue-600 text-white hover:opacity-90"
              >
                <FileText className="w-4 h-4 mr-1" />
                Orden Corporativa
              </Button>
            )}
            {canEdit && inquiry && (inquiry.rubro === 'Restaurantes' || inquiry.lead_source === 'corporativo') && (
              <Button
                size="sm"
                onClick={() => setShowCertificateModal(true)}
                className="bg-green-600 text-white hover:opacity-90"
              >
                <Award className="w-4 h-4 mr-1" />
                Acreditación
              </Button>
            )}
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
      <CardContent className="pt-4 overflow-x-hidden">
        {/* Resumen de totales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                      return (
                        <div key={item._recordId || idx} className="bg-white rounded p-3 border">
                          <div className="flex justify-between items-start gap-3">
                            {canEdit && (
                              <div className="flex flex-col gap-1 pt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveItem.mutate({ 
                                    itemId: item._recordId, 
                                    direction: 'up',
                                    opcionNumero: opcion.numero 
                                  })}
                                  disabled={idx === 0 || moveItem.isPending}
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveItem.mutate({ 
                                    itemId: item._recordId, 
                                    direction: 'down',
                                    opcionNumero: opcion.numero 
                                  })}
                                  disabled={idx === opcion.items.length - 1 || moveItem.isPending}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 mb-1">{item.descripcion}</p>
                              {item.descripcion_detallada && (
                                <p className="text-sm text-gray-600 whitespace-pre-line mb-2">
                                  {item.descripcion_detallada}
                                </p>
                              )}
                              <div className="text-sm text-gray-600">
                                {item.precio_normal && item.descuento_porcentaje ? (
                                  <>
                                    <p className="text-xs text-green-600 font-medium mb-1">
                                      🎯 Precio Especial: {item.descuento_porcentaje}% OFF
                                      {item.motivo_descuento && ` (${item.motivo_descuento})`}
                                    </p>
                                    <p>
                                      {item.cantidad} {unidadMedidaConfig[item.unidad_medida] || item.unidad_medida} x{' '}
                                      <span className="line-through text-gray-400">${item.precio_normal?.toFixed(2)}</span>{' '}
                                      <span className="text-green-600 font-semibold">${item.precio_unitario?.toFixed(2)}</span>
                                      {' = '}
                                      <span className="font-semibold">${item.monto_total_item?.toFixed(2)}</span>
                                    </p>
                                  </>
                                ) : (
                                  <p>
                                    {item.cantidad} {unidadMedidaConfig[item.unidad_medida] || item.unidad_medida} x ${item.precio_unitario?.toFixed(2)}
                                    {' = '}
                                    <span className="font-semibold">${item.monto_total_item?.toFixed(2)}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex gap-2 ml-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingItem({ ...item, id: item._recordId });
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
                                      deleteItem.mutate(item._recordId);
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
                    : "Documento final de cobro por servicios realizados: Factura Comercial."}
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
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">Si lo dejas vacío usaremos tu predeterminado (por defecto: "Cotización PROMAN").</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const current = (quoteAsunto && quoteAsunto.trim()) || '';
                      const preset = localStorage.getItem('defaultQuoteSubject') || 'Cotización PROMAN';
                      const toSave = current || prompt('Asunto predeterminado', preset) || '';
                      if (toSave.trim()) {
                        localStorage.setItem('defaultQuoteSubject', toSave.trim());
                        alert(`Predeterminado guardado: ${toSave.trim()}`);
                      }
                    }}
                  >
                    Guardar como predeterminado
                  </Button>
                </div>
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

      {/* Modal de Acreditación de Limpieza */}
      {showCertificateModal && inquiry && (
        <CleaningCertificateModal
          inquiry={inquiry}
          customer={null}
          open={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
        />
      )}

      {/* Modal para Orden de Trabajo Corporativa */}
      {showCorporateWorkOrder && (
        <Dialog open={showCorporateWorkOrder} onOpenChange={() => setShowCorporateWorkOrder(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generar Orden de Trabajo Corporativa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  Este documento genera un listado de todos los trabajos completados para el cliente corporativo en el rango de fechas especificado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="block text-sm font-medium mb-2">Fecha Inicio</Label>
                  <Input 
                    type="date" 
                    value={fechaInicio} 
                    onChange={(e) => setFechaInicio(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-2">Fecha Fin</Label>
                  <Input 
                    type="date" 
                    value={fechaFin} 
                    onChange={(e) => setFechaFin(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Asunto del Documento (Opcional)
                </Label>
                <Textarea
                  value={quoteAsunto}
                  onChange={(e) => setQuoteAsunto(e.target.value)}
                  placeholder="Ej: Trabajos realizados en restaurantes McDonald's"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCorporateWorkOrder(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleGenerateCorporateWorkOrder}
                  disabled={isGeneratingQuote || !fechaInicio || !fechaFin}
                  className="bg-blue-600 text-white"
                >
                  {isGeneratingQuote ? 'Generando...' : 'Generar Orden'}
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
    precio_normal: item?.precio_normal || 0,
    descuento_porcentaje: item?.descuento_porcentaje || 0,
    motivo_descuento: item?.motivo_descuento || '',
    incluir_iva: item?.incluir_iva || false,
    es_cotizacion: item?.es_cotizacion !== false
  });
  
  const [isNewOption, setIsNewOption] = useState(false);
  const [useCustomTitle, setUseCustomTitle] = useState(!!item?.descripcion);
  const [aplicarDescuento, setAplicarDescuento] = useState(!!(item?.precio_normal && item?.descuento_porcentaje));

  // Fetch services from catalog
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.filter({ is_active: true }).then(unwrapRecords),
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
              const svc = services.find(s => s.service_name === v);
              setFormData(prev => ({
                ...prev,
                descripcion: v,
                descripcion_detallada: (prev.descripcion_detallada && prev.descripcion_detallada.trim().length > 0)
                  ? prev.descripcion_detallada
                  : (svc?.description || '')
              }));
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

      {/* Precio con descuento especial */}
      <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium text-proman-navy">
            ¿Aplicar precio especial para cliente?
          </Label>
          <Button
            type="button"
            size="sm"
            variant={aplicarDescuento ? "default" : "outline"}
            onClick={() => {
              setAplicarDescuento(!aplicarDescuento);
              if (!aplicarDescuento) {
                setFormData({
                  ...formData,
                  precio_normal: formData.precio_unitario || 0,
                  descuento_porcentaje: 0
                });
              } else {
                setFormData({
                  ...formData,
                  precio_normal: 0,
                  descuento_porcentaje: 0,
                  motivo_descuento: ''
                });
              }
            }}
          >
            {aplicarDescuento ? '✓ Activado' : 'Activar'}
          </Button>
        </div>

        {aplicarDescuento ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-proman-navy mb-2">
                  Precio Normal ($)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.precio_normal}
                  onChange={(e) => {
                    const precioNormal = parseFloat(e.target.value) || 0;
                    const descuento = formData.descuento_porcentaje || 0;
                    const precioConDescuento = precioNormal * (1 - descuento / 100);
                    setFormData({
                      ...formData,
                      precio_normal: precioNormal,
                      precio_unitario: precioConDescuento
                    });
                  }}
                  required
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-proman-navy mb-2">
                  Descuento (%)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.descuento_porcentaje}
                  onChange={(e) => {
                    const descuento = parseFloat(e.target.value) || 0;
                    const precioNormal = formData.precio_normal || 0;
                    const precioConDescuento = precioNormal * (1 - descuento / 100);
                    setFormData({
                      ...formData,
                      descuento_porcentaje: descuento,
                      precio_unitario: precioConDescuento
                    });
                  }}
                  required
                />
              </div>
            </div>
            
            <div className="bg-green-100 border border-green-300 rounded p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">Precio Final con Descuento:</span>
                <span className="text-xl font-bold text-green-700">${formData.precio_unitario.toFixed(2)}</span>
              </div>
              {formData.precio_normal > 0 && formData.descuento_porcentaje > 0 && (
                <p className="text-xs text-green-700 mt-1">
                  Ahorro: ${(formData.precio_normal - formData.precio_unitario).toFixed(2)} por unidad
                </p>
              )}
            </div>

            <div>
              <Label className="block text-sm font-medium text-proman-navy mb-2">
                Motivo del Descuento
              </Label>
              <Textarea
                value={formData.motivo_descuento}
                onChange={(e) => setFormData({ ...formData, motivo_descuento: e.target.value })}
                placeholder="Ej: Cliente corporativo con contrato anual, volumen de trabajo garantizado"
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div>
            <Label className="block text-sm font-medium text-proman-navy mb-2">
              Precio Unitario ($) *
            </Label>
            <Input
              type="number"
              step="0.01"
              value={formData.precio_unitario}
              onChange={(e) => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
        )}
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