import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/135f5bee2_21558763_235265087000605_2527538411050239409_n-Editado.png';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { inquiryId, quoteDate, asunto, descuento } = await req.json();

        if (!inquiryId) {
            return Response.json({ error: 'inquiryId is required' }, { status: 400 });
        }

        const descuentoMonto = parseFloat(descuento) || 0;

        // Obtener el trabajo
        const inquiries = await base44.asServiceRole.entities.ClientInquiry.filter({ id: inquiryId });
        if (!inquiries || inquiries.length === 0) {
            return Response.json({ error: 'Trabajo no encontrado' }, { status: 404 });
        }
        const inquiry = inquiries[0];

        // Obtener cliente
        let customer = null;
        const customerId = inquiry.customer_id;
        if (customerId) {
            const customers = await base44.asServiceRole.entities.Customer.filter({ id: customerId });
            if (customers && customers.length > 0) {
                customer = customers[0];
            }
        }

        // Obtener items de cotización y ordenar
        const allItems = await base44.asServiceRole.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId });
        const quoteItems = (allItems || [])
            .filter(item => item.es_cotizacion !== false)
            .sort((a, b) => (a.orden || 0) - (b.orden || 0));

        if (quoteItems.length === 0) {
            return Response.json({ 
                error: 'No hay items de cotización para este trabajo. Agrega items primero.' 
            }, { status: 400 });
        }

        // Agrupar por opción
        const itemsByOption = {};
        quoteItems.forEach(item => {
            const opcionNum = item.opcion_numero || 1;
            if (!itemsByOption[opcionNum]) {
                itemsByOption[opcionNum] = {
                    numero: opcionNum,
                    titulo: item.opcion_titulo || `Opción ${opcionNum}`,
                    items: []
                };
            }
            itemsByOption[opcionNum].items.push(item);
        });

        const opciones = Object.values(itemsByOption).sort((a, b) => a.numero - b.numero);

        // Generar número correlativo
        const allQuotes = await base44.asServiceRole.entities.ClientInquiry.filter({ 
            quote_pdf_url: { $exists: true, $ne: '' } 
        });
        const quoteNumber = String(allQuotes.length + 1).padStart(4, '0');
        
        // Generar HTML
        const clientName = customer?.full_name || inquiry.client_name || 'Cliente';
        const fechaCotizacion = quoteDate ? new Date(quoteDate + 'T12:00:00') : new Date();
        const fechaFormato = fechaCotizacion.toLocaleDateString('es-SV', { day: 'numeric', month: 'numeric', year: 'numeric' });
        const asuntoTexto = asunto || inquiry.service_type || inquiry.rubro || 'Servicios varios';
        
        let totalGeneral = 0;
        let itemsHtml = '';
        let itemNum = 1;
        const hayMultiplesOpciones = opciones.length > 1;

        for (const opcion of opciones) {
            if (hayMultiplesOpciones) {
                itemsHtml += `
                    <tr class="opcion-header">
                        <td colspan="5">OPCIÓN ${opcion.numero}: ${opcion.titulo}</td>
                    </tr>
                `;
            }

            let subtotalOpcion = 0;
            
            for (const item of opcion.items) {
                const descripcion = item.descripcion_detallada || item.descripcion || 'Servicio';
                const cantidad = parseFloat(item.cantidad) || 1;
                const precioUnit = parseFloat(item.precio_unitario) || 0;
                const precioTotal = cantidad * precioUnit;
                subtotalOpcion += precioTotal;
                totalGeneral += precioTotal;

                itemsHtml += `
                    <tr>
                        <td class="text-center">${itemNum}</td>
                        <td><div style="white-space: pre-line;">${descripcion}</div></td>
                        <td class="text-center">${cantidad} ${item.unidad_medida || 'unidad'}</td>
                        <td class="text-right">$ ${precioUnit.toFixed(2)}</td>
                        <td class="text-right">$ ${precioTotal.toFixed(2)}</td>
                    </tr>
                `;
                itemNum++;
                }

            if (hayMultiplesOpciones) {
                itemsHtml += `
                    <tr class="subtotal-row">
                        <td colspan="4" class="text-right">SUBTOTAL OPCIÓN ${opcion.numero}:</td>
                        <td class="text-right">$ ${subtotalOpcion.toFixed(2)}</td>
                    </tr>
                `;
            }
        }

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotización - ${clientName}</title>
<style>
  @page { size: A4; margin: 0; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; color: #252a5c; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm; background: white; box-sizing: border-box; position: relative; }
  
  .header { display: flex; justify-content: flex-start; align-items: center; margin-bottom: 10px; }
  .logo-container { text-align: left; }
  .logo { height: 22mm; width: auto; }
  .divider { border-bottom: 1px solid #252a5c; margin: 10mm 0 10mm 0; }
  
  .main-title { text-align: center; margin-bottom: 15mm; }
  .main-title h1 { font-size: 14pt; margin: 0 0 5px 0; font-weight: bold; color: #252a5c; }
  .main-title h2 { font-size: 12pt; margin: 0; font-weight: normal; color: #252a5c; }
  
  .info-grid { margin-bottom: 10mm; font-size: 10pt; line-height: 1.5; }
  .info-row { display: flex; margin-bottom: 3px; }
  .label { font-weight: bold; width: 80px; color: #252a5c; }
  .value { flex: 1; }
  .date-section { margin-left: auto; }
  
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 10mm; }
  th { background-color: #252a5c; color: white; padding: 8px 5px; text-align: left; border: 0.5px solid #252a5c; font-weight: bold; text-transform: uppercase; font-size: 8pt; }
  td { border: 0.5px solid #b4b4b4; padding: 8px 5px; vertical-align: top; color: #252a5c; }
  
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  
  .opcion-header { background-color: #f0f0fa; font-weight: bold; color: #252a5c; }
  .opcion-header td { border: 0.5px solid #252a5c; }
  
  .subtotal-row { background-color: #fff9db; font-weight: bold; }
  
  .total-container { display: flex; justify-content: flex-end; margin-top: 10mm; }
  .total-box { background-color: #252a5c; color: white; padding: 10px 20px; display: flex; align-items: center; gap: 20px; font-size: 12pt; font-weight: bold; min-width: 200px; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .total-label { text-transform: uppercase; }
  .total-amount { font-size: 14pt; }
  
  .notes { margin-top: 15mm; font-size: 9pt; color: #252a5c; font-weight: bold; }
  
  /* Logo de pie de página estilo marca de agua */
  .bottom-logo-container { position: absolute; bottom: 20mm; left: 0; right: 0; text-align: center; opacity: 0.5; pointer-events: none; }
  .bottom-logo { height: 35px; width: auto; }
  
  .footer { position: absolute; bottom: 10mm; left: 0; right: 0; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #eee; padding-top: 5px; margin: 0 20mm; }

  @media print {
    body { padding: 20mm; width: 100%; height: auto; margin: 0; }
    .header, .main-title, .info-grid, table, .total-container, .notes { break-inside: avoid; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>

<div class="header">
    <div class="logo-container">
        <img src="${LOGO_URL}" alt="PROMAN Logo" class="logo">
    </div>
</div>

<div class="divider"></div>

<div class="main-title">
    <h1>SERVICIOS DE CONSTRUCCIÓN Y ACABADOS</h1>
    <h2>OFERTA ECONÓMICA</h2>
</div>

<div class="info-grid">
    <div style="display: flex; justify-content: space-between;">
        <div style="flex: 1;">
            <div class="info-row">
                <span class="label">ATENCIÓN:</span>
                <span class="value">${clientName}</span>
            </div>
            <div class="info-row">
                <span class="label">ASUNTO:</span>
                <span class="value" style="font-weight: bold;">${asuntoTexto}</span>
            </div>
        </div>
        <div class="date-section">
            <div class="info-row">
                <span class="label" style="width: auto; margin-right: 10px;">No.:</span>
                <span class="value">${quoteNumber}</span>
            </div>
            <div class="info-row">
                <span class="label" style="width: auto; margin-right: 10px;">FECHA:</span>
                <span class="value">${fechaFormato}</span>
            </div>
        </div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th width="5%" class="text-center">ITEM</th>
            <th width="50%">DETALLE DE LA OBRA</th>
            <th width="15%" class="text-center">CANTIDAD</th>
            <th width="15%" class="text-right">PRECIO U.</th>
            <th width="15%" class="text-right">TOTAL</th>
        </tr>
    </thead>
    <tbody>
        ${itemsHtml}
        </tbody>
        </table>

        <div class="total-container">
        ${descuentoMonto > 0 ? `
        <div style="text-align: right; margin-bottom: 10px; font-size: 11pt;">
        <div style="margin-bottom: 5px;">
            <span style="color: #252a5c;">Subtotal:</span>
            <span style="font-weight: bold; margin-left: 20px;">$ ${totalGeneral.toFixed(2)}</span>
        </div>
        <div style="margin-bottom: 5px;">
            <span style="color: #dc2626;">Descuento:</span>
            <span style="font-weight: bold; color: #dc2626; margin-left: 20px;">- $ ${descuentoMonto.toFixed(2)}</span>
        </div>
        </div>
        ` : ''}
        <div class="total-box">
        <span class="total-label">Total Cotizado</span>
        <span class="total-amount">$ ${(totalGeneral - descuentoMonto).toFixed(2)}</span>
        </div>
        </div>

<div class="notes">
    <p>• Precio NO incluye IVA.</p>
    <p style="font-weight: normal; margin-top: 10px;">Agradecemos su continuo interés en nuestros servicios.</p>
</div>

<div class="bottom-logo-container">
    <img src="${LOGO_URL}" class="bottom-logo">
</div>

<div class="footer">
    PROMAN Services S.A. de C.V. - San Salvador, El Salvador - Tel: 6053-1213
</div>

<script>
    window.onload = function() { window.print(); }
</script>

</body>
</html>
        `;

        // Crear archivo HTML
        const quoteNum = inquiry.id.substring(0, 8).toUpperCase();
        const timestamp = Date.now();
        
        // Convertir string a Uint8Array para Deno
        const encoder = new TextEncoder();
        const fileContent = encoder.encode(html);
        
        // Crear File usando el constructor de Deno
        const file = new File([fileContent], `cotizacion-${quoteNum}-${timestamp}.html`, { 
            type: 'text/html; charset=utf-8' 
        });
        
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        // Actualizar el inquiry con la URL
        await base44.asServiceRole.entities.ClientInquiry.update(inquiryId, {
            quote_pdf_url: file_url
        });

        return Response.json({ 
            success: true, 
            pdf_url: file_url,
            html: html,
            message: 'Cotización generada exitosamente'
        });

    } catch (error) {
        console.error('Error generating quote:', error);
        return Response.json({ 
            error: 'Error al generar la cotización', 
            details: error.message 
        }, { status: 500 });
    }
});