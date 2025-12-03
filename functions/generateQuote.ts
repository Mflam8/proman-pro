import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/135f5bee2_21558763_235265087000605_2527538411050239409_n-Editado.png';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { inquiryId, quoteDate, asunto } = await req.json();

        if (!inquiryId) {
            return Response.json({ error: 'inquiryId is required' }, { status: 400 });
        }

        // Obtener el trabajo
        const inquiries = await base44.asServiceRole.entities.ClientInquiry.filter({ id: inquiryId });
        const inquiryRaw = inquiries[0];

        if (!inquiryRaw) {
            return Response.json({ error: 'Trabajo no encontrado' }, { status: 404 });
        }
        
        const inquiry = inquiryRaw.data ? { ...inquiryRaw, ...inquiryRaw.data } : inquiryRaw;

        // Obtener cliente
        let customer = null;
        const customerId = inquiry.customer_id;
        if (customerId) {
            const customers = await base44.asServiceRole.entities.Customer.filter({ id: customerId });
            const customerRaw = customers[0];
            customer = customerRaw?.data ? { ...customerRaw, ...customerRaw.data } : customerRaw;
        }

        // Obtener items de cotización
        const allItems = await base44.asServiceRole.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId });
        const quoteItems = allItems.filter(item => {
            const itemData = item.data || item;
            return itemData.es_cotizacion !== false;
        });

        // Agrupar por opción
        const itemsByOption = {};
        quoteItems.forEach(item => {
            const itemData = item.data || item;
            const opcionNum = itemData.opcion_numero || 1;
            if (!itemsByOption[opcionNum]) {
                itemsByOption[opcionNum] = {
                    numero: opcionNum,
                    titulo: itemData.opcion_titulo || `Opción ${opcionNum}`,
                    items: []
                };
            }
            itemsByOption[opcionNum].items.push(itemData);
        });

        const opciones = Object.values(itemsByOption).sort((a, b) => a.numero - b.numero);

        // Generar HTML
        const clientName = customer?.full_name || inquiry.client_name || 'N/A';
        const fechaCotizacion = quoteDate ? new Date(quoteDate + 'T12:00:00') : new Date();
        const fechaFormato = fechaCotizacion.toLocaleDateString('es-SV', { day: 'numeric', month: 'numeric', year: 'numeric' });
        const asuntoTexto = asunto || inquiry.service_type || 'Servicios varios';
        
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
                const descripcion = item.descripcion_detallada || item.descripcion || '';
                const precioUnit = item.precio_unitario || 0;
                const precioTotal = (item.cantidad || 1) * precioUnit;
                subtotalOpcion += precioTotal;
                totalGeneral += precioTotal;

                itemsHtml += `
                    <tr>
                        <td class="text-center">${itemNum}</td>
                        <td><div style="white-space: pre-line;">${descripcion}</div></td>
                        <td class="text-center">${item.cantidad || 1} ${item.unidad_medida || 'unidad'}</td>
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
  body { font-family: 'Arial', sans-serif; color: #252a5c; max-width: 900px; margin: 0 auto; padding: 40px; background: white; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .logo-container { text-align: left; }
  .logo { height: 60px; width: auto; }
  .slogan { font-style: italic; font-size: 11px; color: #666; margin-top: 5px; }
  .divider { border-bottom: 2px solid #252a5c; margin: 20px 0 40px 0; }
  
  .main-title { text-align: center; margin-bottom: 40px; }
  .main-title h1 { font-size: 22px; margin: 0 0 10px 0; font-weight: bold; color: #252a5c; }
  .main-title h2 { font-size: 18px; margin: 0; font-weight: normal; color: #252a5c; }
  
  .info-grid { margin-bottom: 40px; font-size: 14px; line-height: 1.6; }
  .info-row { display: flex; margin-bottom: 5px; }
  .label { font-weight: bold; width: 100px; color: #252a5c; }
  .value { flex: 1; }
  .date-section { margin-left: auto; }
  
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
  th { background-color: #252a5c; color: white; padding: 12px 8px; text-align: left; border: 1px solid #252a5c; font-weight: bold; text-transform: uppercase; }
  td { border: 1px solid #ddd; padding: 12px 8px; vertical-align: top; color: #333; }
  
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  
  .opcion-header { background-color: #f0f0fa; font-weight: bold; color: #252a5c; }
  .opcion-header td { border: 1px solid #252a5c; }
  
  .subtotal-row { background-color: #fff9db; font-weight: bold; }
  
  .total-container { display: flex; justify-content: flex-end; margin-top: 30px; }
  .total-box { background-color: #252a5c; color: white; padding: 15px 25px; border-radius: 4px; display: flex; align-items: center; gap: 30px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .total-label { text-transform: uppercase; }
  .total-amount { font-size: 20px; }
  
  .notes { margin-top: 40px; font-size: 12px; color: #252a5c; font-weight: bold; }
  .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
  .watermark { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); opacity: 0.05; z-index: -1; width: 60%; }

  @media print {
    body { padding: 0; max-width: 100%; }
    .total-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header">
    <div class="logo-container">
        <img src="${LOGO_URL}" alt="PROMAN Logo" class="logo">
        <div class="slogan">"Generando soluciones en tu ambiente de trabajo"</div>
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
                <span class="value">Sr. ${clientName}</span>
            </div>
            <div class="info-row">
                <span class="label">ASUNTO:</span>
                <span class="value" style="font-weight: bold;">${asuntoTexto}</span>
            </div>
        </div>
        <div class="date-section">
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
    <div class="total-box">
        <span class="total-label">Total Cotizado</span>
        <span class="total-amount">$ ${totalGeneral.toFixed(2)}</span>
    </div>
</div>

<div class="notes">
    <p>• Precio NO incluye IVA.</p>
    <p style="font-weight: normal; margin-top: 10px;">Agradecemos su continuo interés en nuestros servicios.</p>
</div>

<img src="${LOGO_URL}" class="watermark">

<div class="footer">
    PROMAN Services - San Salvador, El Salvador - Tel: 6053-1213
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
        const file = new File([html], `cotizacion-${quoteNum}-${timestamp}.html`, { type: 'text/html' });
        
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        // Actualizar el inquiry con la URL
        await base44.asServiceRole.entities.ClientInquiry.update(inquiryId, {
            quote_pdf_url: file_url
        });

        return Response.json({ 
            success: true, 
            pdf_url: file_url,
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