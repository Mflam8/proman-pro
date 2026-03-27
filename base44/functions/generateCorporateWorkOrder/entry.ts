import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/135f5bee2_21558763_235265087000605_2527538411050239409_n-Editado.png';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { customerId, fechaInicio, fechaFin, asunto } = await req.json();

        if (!customerId || !fechaInicio || !fechaFin) {
            return Response.json({ error: 'customerId, fechaInicio y fechaFin son requeridos' }, { status: 400 });
        }

        // Obtener cliente
        const customers = await base44.asServiceRole.entities.Customer.filter({ id: customerId });
        if (!customers || customers.length === 0) {
            return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
        }
        const customer = customers[0];

        // Validar que sea cliente corporativo
        if (customer.customer_type !== 'corporativo' && customer.customer_type !== 'contrato') {
            return Response.json({ error: 'Esta función solo está disponible para clientes corporativos' }, { status: 400 });
        }

        // Obtener todos los trabajos completados del cliente en el rango de fechas
        const allInquiries = await base44.asServiceRole.entities.ClientInquiry.filter({ 
            customer_id: customerId,
            status: { $in: ['completado', 'pagado', 'cerrado'] }
        });

        // Filtrar por rango de fechas (usando scheduled_date o created_date)
        const startDate = new Date(fechaInicio);
        const endDate = new Date(fechaFin);
        endDate.setHours(23, 59, 59, 999);

        const filteredInquiries = allInquiries.filter(inquiry => {
            const workDate = new Date(inquiry.scheduled_date || inquiry.created_date);
            return workDate >= startDate && workDate <= endDate;
        }).sort((a, b) => {
            const dateA = new Date(a.scheduled_date || a.created_date);
            const dateB = new Date(b.scheduled_date || b.created_date);
            return dateA - dateB;
        });

        if (filteredInquiries.length === 0) {
            return Response.json({ 
                error: 'No hay trabajos completados para este cliente en el rango de fechas especificado' 
            }, { status: 400 });
        }

        // Generar número correlativo
        const allOrders = await base44.asServiceRole.entities.ClientInquiry.filter({ 
            quote_pdf_url: { $exists: true, $ne: '' } 
        });
        const orderNumber = String(allOrders.length + 1).padStart(4, '0');

        // Generar items HTML
        let itemsHtml = '';
        let subtotal = 0;
        
        filteredInquiries.forEach((inquiry, index) => {
            const precio = inquiry.final_amount || inquiry.quote_amount || 0;
            subtotal += precio;
            
            const fechaServicio = inquiry.scheduled_date 
                ? new Date(inquiry.scheduled_date + 'T12:00:00').toLocaleDateString('es-SV', { day: 'numeric', month: 'numeric', year: 'numeric' })
                : new Date(inquiry.created_date).toLocaleDateString('es-SV', { day: 'numeric', month: 'numeric', year: 'numeric' });
            
            const sucursal = inquiry.location_name || inquiry.location || 'N/A';
            const descripcion = inquiry.message || inquiry.service_type || 'Servicio realizado';

            itemsHtml += `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${sucursal}</td>
                    <td><div style="white-space: pre-line;">${descripcion}</div></td>
                    <td class="text-center">${fechaServicio}</td>
                    <td class="text-right">$ ${precio.toFixed(2)}</td>
                </tr>
            `;
        });

        const iva = subtotal * 0.13;
        const subtotalConIva = subtotal + iva;
        const retencion = subtotal * 0.01;
        const total = subtotalConIva - retencion;

        const fechaDocumento = new Date().toLocaleDateString('es-SV', { day: 'numeric', month: 'numeric', year: 'numeric' });
        const asuntoTexto = asunto || `Trabajos realizados en ${customer.full_name}`;

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Orden de Trabajo - ${customer.full_name}</title>
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
  
  .totals-table { width: 60%; margin-left: auto; font-size: 10pt; }
  .totals-table td { border: 0.5px solid #b4b4b4; padding: 5px 10px; }
  .totals-table .label-cell { font-weight: bold; text-align: right; background-color: #f5f5f5; }
  .totals-table .total-row { background-color: #252a5c; color: white; font-weight: bold; font-size: 11pt; }
  
  .notes { margin-top: 15mm; font-size: 9pt; color: #252a5c; font-weight: bold; }
  
  .bottom-logo-container { position: absolute; bottom: 20mm; left: 0; right: 0; text-align: center; opacity: 0.5; pointer-events: none; }
  .bottom-logo { height: 35px; width: auto; }
  
  .footer { position: absolute; bottom: 10mm; left: 0; right: 0; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #eee; padding-top: 5px; margin: 0 20mm; }

  @media print {
    body { padding: 20mm; width: 100%; height: auto; margin: 0; }
    .header, .main-title, .info-grid, table, .totals-table, .notes { break-inside: avoid; }
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
                <span class="value">${customer.fiscal_name || customer.full_name}</span>
            </div>
            <div class="info-row">
                <span class="label">ASUNTO:</span>
                <span class="value" style="font-weight: bold;">${asuntoTexto}</span>
            </div>
        </div>
        <div class="date-section">
            <div class="info-row">
                <span class="label" style="width: auto; margin-right: 10px;">N°:</span>
                <span class="value">${orderNumber}</span>
            </div>
            <div class="info-row">
                <span class="label" style="width: auto; margin-right: 10px;">Fecha:</span>
                <span class="value">${fechaDocumento}</span>
            </div>
        </div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th width="5%" class="text-center">ITEM</th>
            <th width="20%">SUCURSAL</th>
            <th width="45%">DESCRIPCIÓN</th>
            <th width="15%" class="text-center">FECHA DEL SERVICIO</th>
            <th width="15%" class="text-right">PRECIO S/IVA</th>
        </tr>
    </thead>
    <tbody>
        ${itemsHtml}
    </tbody>
</table>

<table class="totals-table">
    <tr>
        <td class="label-cell">SUB-TOTAL</td>
        <td class="text-right">$ ${subtotal.toFixed(2)}</td>
    </tr>
    <tr>
        <td class="label-cell">IVA 13%</td>
        <td class="text-right">$ ${iva.toFixed(2)}</td>
    </tr>
    <tr>
        <td class="label-cell">SUB-TOTAL</td>
        <td class="text-right">$ ${subtotalConIva.toFixed(2)}</td>
    </tr>
    <tr>
        <td class="label-cell">RETENCIÓN 1%</td>
        <td class="text-right">$ ${retencion.toFixed(2)}</td>
    </tr>
    <tr class="total-row">
        <td class="label-cell">TOTAL</td>
        <td class="text-right">$ ${total.toFixed(2)}</td>
    </tr>
</table>

<div class="notes">
    <p>Agradecemos su continuo interés en nuestros servicios.</p>
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
        const timestamp = Date.now();
        const encoder = new TextEncoder();
        const fileContent = encoder.encode(html);
        
        const file = new File([fileContent], `orden-trabajo-corporativo-${orderNumber}-${timestamp}.html`, { 
            type: 'text/html; charset=utf-8' 
        });
        
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        return Response.json({ 
            success: true, 
            pdf_url: file_url,
            html: html,
            message: 'Orden de trabajo corporativa generada exitosamente',
            trabajos_incluidos: filteredInquiries.length,
            total: total
        });

    } catch (error) {
        console.error('Error generating corporate work order:', error);
        return Response.json({ 
            error: 'Error al generar la orden de trabajo', 
            details: error.message 
        }, { status: 500 });
    }
});