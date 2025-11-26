import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/135f5bee2_21558763_235265087000605_2527538411050239409_n-Editado.png';

async function loadImageAsBase64(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        return `data:image/png;base64,${base64}`;
    } catch (error) {
        console.error('Error loading image:', error);
        return null;
    }
}

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

        // Cargar logo
        const logoBase64 = await loadImageAsBase64(LOGO_URL);

        const doc = new jsPDF();
        
        // Colores
        const navyColor = [37, 42, 92];
        const yellowColor = [253, 200, 12];

        // ======================
        // ENCABEZADO CON LOGO
        // ======================
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 15, 10, 50, 22);
        }
        
        // Slogan
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('"Generando soluciones en tu ambiente de trabajo"', 15, 35);

        // Línea divisora
        doc.setDrawColor(...navyColor);
        doc.setLineWidth(1);
        doc.line(15, 40, 195, 40);

        // ======================
        // TÍTULO Y DATOS
        // ======================
        let yPos = 50;
        
        doc.setTextColor(...navyColor);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('SERVICIOS DE CONSTRUCCIÓN Y ACABADOS', 105, yPos, { align: 'center' });
        
        yPos += 8;
        doc.setFontSize(12);
        doc.text('OFERTA ECONÓMICA', 105, yPos, { align: 'center' });
        
        yPos += 12;
        
        const clientName = customer?.full_name || inquiry.client_name || 'N/A';
        const fechaCotizacion = quoteDate ? new Date(quoteDate + 'T12:00:00') : new Date();
        const fechaFormato = fechaCotizacion.toLocaleDateString('es-SV', { day: 'numeric', month: 'numeric', year: 'numeric' });
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('ATENCIÓN:', 15, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(`Sr. ${clientName}`, 42, yPos);
        
        doc.setFont(undefined, 'bold');
        doc.text('Fecha:', 145, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(fechaFormato, 162, yPos);
        
        yPos += 7;
        
        const asuntoTexto = asunto || inquiry.service_type || 'Servicios varios';
        doc.setFont(undefined, 'bold');
        doc.text('ASUNTO:', 15, yPos);
        doc.setFont(undefined, 'normal');
        
        // Manejar asunto largo
        const maxAsuntoWidth = 140;
        const asuntoLines = doc.splitTextToSize(asuntoTexto, maxAsuntoWidth);
        doc.text(asuntoLines, 38, yPos);
        yPos += (asuntoLines.length * 5) + 5;

        // ======================
        // TABLA DE COTIZACIÓN
        // ======================
        yPos += 5;
        
        // Encabezado de tabla
        doc.setFillColor(...navyColor);
        doc.setDrawColor(...navyColor);
        doc.setLineWidth(0.5);
        
        const colWidths = { item: 15, detalle: 95, cantidad: 25, precioU: 25, precioT: 25 };
        const startX = 15;
        
        doc.rect(startX, yPos, colWidths.item, 10, 'FD');
        doc.rect(startX + colWidths.item, yPos, colWidths.detalle, 10, 'FD');
        doc.rect(startX + colWidths.item + colWidths.detalle, yPos, colWidths.cantidad, 10, 'FD');
        doc.rect(startX + colWidths.item + colWidths.detalle + colWidths.cantidad, yPos, colWidths.precioU, 10, 'FD');
        doc.rect(startX + colWidths.item + colWidths.detalle + colWidths.cantidad + colWidths.precioU, yPos, colWidths.precioT, 10, 'FD');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text('ITEM', startX + colWidths.item / 2, yPos + 6.5, { align: 'center' });
        doc.text('DETALLE DE LA OBRA', startX + colWidths.item + colWidths.detalle / 2, yPos + 6.5, { align: 'center' });
        doc.text('CANTIDAD', startX + colWidths.item + colWidths.detalle + colWidths.cantidad / 2, yPos + 6.5, { align: 'center' });
        doc.text('PRECIO U.', startX + colWidths.item + colWidths.detalle + colWidths.cantidad + colWidths.precioU / 2, yPos + 6.5, { align: 'center' });
        doc.text('PRECIO TOTAL', startX + colWidths.item + colWidths.detalle + colWidths.cantidad + colWidths.precioU + colWidths.precioT / 2, yPos + 6.5, { align: 'center' });

        yPos += 10;

        // Renderizar opciones
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        
        let totalGeneral = 0;
        let itemNum = 1;
        const hayMultiplesOpciones = opciones.length > 1;

        for (const opcion of opciones) {
            // Calcular altura necesaria para esta opción
            let opcionHeight = hayMultiplesOpciones ? 25 : 15; // Más espacio si hay título de opción
            
            for (const item of opcion.items) {
                const descripcionDetallada = item.descripcion_detallada || item.descripcion || '';
                const lines = doc.splitTextToSize(descripcionDetallada, colWidths.detalle - 6);
                opcionHeight += Math.max(lines.length * 4 + 10, 20);
            }
            opcionHeight += 12; // Espacio para subtotal
            
            // Nueva página si no cabe
            if (yPos + opcionHeight > 260) {
                doc.addPage();
                yPos = 20;
            }

            // Título de la opción (solo si hay múltiples opciones)
            if (hayMultiplesOpciones) {
                doc.setFillColor(240, 240, 250);
                doc.rect(startX, yPos, 185, 10, 'FD');
                doc.setTextColor(...navyColor);
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text(`OPCIÓN ${opcion.numero}: ${opcion.titulo}`, startX + 3, yPos + 7);
                yPos += 12;
            }

            let subtotalOpcion = 0;

            for (const item of opcion.items) {
                const descripcionDetallada = item.descripcion_detallada || item.descripcion || '';
                const lines = doc.splitTextToSize(descripcionDetallada, colWidths.detalle - 6);
                const rowHeight = Math.max(lines.length * 4 + 10, 20);
                
                // Dibujar celdas
                doc.setFillColor(255, 255, 255);
                doc.rect(startX, yPos, colWidths.item, rowHeight, 'D');
                doc.rect(startX + colWidths.item, yPos, colWidths.detalle, rowHeight, 'D');
                doc.rect(startX + colWidths.item + colWidths.detalle, yPos, colWidths.cantidad, rowHeight, 'D');
                doc.rect(startX + colWidths.item + colWidths.detalle + colWidths.cantidad, yPos, colWidths.precioU, rowHeight, 'D');
                doc.rect(startX + colWidths.item + colWidths.detalle + colWidths.cantidad + colWidths.precioU, yPos, colWidths.precioT, rowHeight, 'D');
                
                doc.setTextColor(...navyColor);
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                
                // Número de item
                doc.text(itemNum.toString(), startX + colWidths.item / 2, yPos + 6, { align: 'center' });
                
                // Descripción detallada
                doc.setFontSize(8);
                let textY = yPos + 5;
                for (const line of lines) {
                    doc.text(line, startX + colWidths.item + 3, textY);
                    textY += 4;
                }
                
                // Cantidad con unidad
                const unidad = item.unidad_medida || 'unidad';
                const cantidadTexto = `${item.cantidad || 1}`;
                doc.setFontSize(9);
                doc.text(cantidadTexto, startX + colWidths.item + colWidths.detalle + colWidths.cantidad / 2, yPos + rowHeight / 2, { align: 'center' });
                
                // Precio unitario
                const precioUnit = item.precio_unitario || 0;
                doc.text(`$ ${precioUnit.toFixed(2)}`, startX + colWidths.item + colWidths.detalle + colWidths.cantidad + colWidths.precioU - 3, yPos + rowHeight / 2, { align: 'right' });
                
                // Precio total
                const precioTotal = (item.cantidad || 1) * precioUnit;
                subtotalOpcion += precioTotal;
                totalGeneral += precioTotal;
                doc.text(`$ ${precioTotal.toFixed(2)}`, startX + colWidths.item + colWidths.detalle + colWidths.cantidad + colWidths.precioU + colWidths.precioT - 3, yPos + rowHeight / 2, { align: 'right' });
                
                yPos += rowHeight;
                itemNum++;
            }

            // Subtotal de la opción (solo si hay múltiples opciones)
            if (hayMultiplesOpciones) {
                doc.setFillColor(...yellowColor);
                doc.rect(startX + colWidths.item + colWidths.detalle, yPos, colWidths.cantidad + colWidths.precioU + colWidths.precioT, 8, 'FD');
                doc.setTextColor(...navyColor);
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.text(`SUBTOTAL OPCIÓN ${opcion.numero}:`, startX + colWidths.item + colWidths.detalle + 3, yPos + 5.5);
                doc.text(`$ ${subtotalOpcion.toFixed(2)}`, startX + colWidths.item + colWidths.detalle + colWidths.cantidad + colWidths.precioU + colWidths.precioT - 3, yPos + 5.5, { align: 'right' });
                yPos += 15;
            }
        }

        // ======================
        // NOTA DE IVA
        // ======================
        yPos += 10;
        doc.setTextColor(...navyColor);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Precio NO incluye IVA.', 15, yPos);
        
        yPos += 8;
        doc.setFont(undefined, 'normal');
        doc.text('Agradecemos su continuo interés en nuestros servicios.', 15, yPos);

        // ======================
        // PIE DE PÁGINA
        // ======================
        if (logoBase64) {
            doc.setGState(new doc.GState({ opacity: 0.5 }));
            doc.addImage(logoBase64, 'PNG', 65, 250, 80, 35);
            doc.setGState(new doc.GState({ opacity: 1 }));
        }

        // Convertir a buffer y subir
        const pdfBytes = doc.output('arraybuffer');
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const quoteNum = inquiry.id.substring(0, 8).toUpperCase();
        const file = new File([blob], `cotizacion-${quoteNum}.pdf`, { type: 'application/pdf' });
        
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        // Actualizar el inquiry con la URL de cotización
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