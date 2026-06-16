import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.1';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/135f5bee2_21558763_235265087000605_2527538411050239409_n-Editado.png';

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    return btoa(binary);
}

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

        const { inquiryId, invoiceDate } = await req.json();

        if (!inquiryId) {
            return Response.json({ error: 'inquiryId is required' }, { status: 400 });
        }

        // Obtener el trabajo - los datos pueden venir anidados en .data
        const inquiries = await base44.asServiceRole.entities.ClientInquiry.filter({ id: inquiryId });
        const inquiryRaw = inquiries[0];

        if (!inquiryRaw) {
            return Response.json({ error: 'Trabajo no encontrado' }, { status: 404 });
        }
        
        // Extraer datos - pueden estar en .data o directamente en el objeto
        const inquiry = inquiryRaw.data ? { ...inquiryRaw, ...inquiryRaw.data } : inquiryRaw;
        
        console.log('location_name value:', inquiry.location_name);
        console.log('location value:', inquiry.location);

        // Obtener cliente
        let customer = null;
        const customerId = inquiry.customer_id;
        if (customerId) {
            const customers = await base44.asServiceRole.entities.Customer.filter({ id: customerId });
            const customerRaw = customers[0];
            customer = customerRaw?.data ? { ...customerRaw, ...customerRaw.data } : customerRaw;
        }

        // Obtener items de facturación (solo servicios y mano de obra)
        const allBillingItems = await base44.asServiceRole.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId });
        const billingItems = allBillingItems
            .map((item) => item.data ? { ...item, ...item.data } : item)
            .filter((item) => item.tipo_item === 'servicio' || item.tipo_item === 'mano_de_obra')
            .sort((a, b) => {
                const opcionDiff = Number(a.opcion_numero || 0) - Number(b.opcion_numero || 0);
                if (opcionDiff !== 0) return opcionDiff;
                return Number(a.orden || 0) - Number(b.orden || 0);
            });

        // Cargar logo
        const logoBase64 = await loadImageAsBase64(LOGO_URL);

        const doc = new jsPDF();
        
        // Colores
        const navyColor = [37, 42, 92];
        const yellowColor = [253, 200, 12];

        // ======================
        // ENCABEZADO AZUL
        // ======================
        doc.setFillColor(...navyColor);
        doc.rect(0, 0, 210, 35, 'F');
        
        // Cuadro blanco para logo (izquierda)
        doc.setFillColor(255, 255, 255);
        doc.rect(10, 5, 55, 25, 'F');
        
        // Logo real
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 12, 6, 51, 23);
        }

        // Información de empresa (centro)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN SERVICES, S.A. DE C.V.', 115, 12, { align: 'center' });
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text('Email: admin@proman.services', 115, 17, { align: 'center' });
        doc.text('Contáctenos: 6053-1213', 115, 21, { align: 'center' });
        doc.text('Dirección: 17Av. Norte #1721, San Salvador', 115, 25, { align: 'center' });

        // Cuadro amarillo de factura (derecha)
        doc.setFillColor(...yellowColor);
        doc.rect(155, 8, 45, 20, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('FACTURA', 177.5, 13, { align: 'center' });
        doc.text('COMERCIAL', 177.5, 18, { align: 'center' });
        doc.setFontSize(10);
        const facturaNum = inquiry.id.substring(0, 8).toUpperCase();
        doc.text(`No. ${facturaNum}`, 177.5, 23, { align: 'center' });

        doc.setTextColor(...navyColor);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('FACTURA COMERCIAL', 105, 43, { align: 'center' });

        // ======================
        // DATOS DEL CLIENTE
        // ======================
        let yPos = 55;
        
        const clientName = customer?.full_name || inquiry.client_name || 'N/A';
        const clientPhone = customer?.phone || inquiry.phone || 'N/A';
        const primaryAddress = customer?.addresses?.find((address) => address?.is_primary) || customer?.addresses?.[0] || null;
        const inquiryAddress = inquiry.address || inquiry.location_name || '';
        const inquiryDepartment = inquiry.location || '';
        const addressText = inquiryAddress || primaryAddress?.address || primaryAddress?.label || 'N/A';
        const departamento = inquiryDepartment || primaryAddress?.location || '';
        const direccion = departamento && addressText !== 'N/A'
            ? `${addressText}, ${departamento}`
            : (addressText !== 'N/A' ? addressText : (departamento || 'N/A'));
        // Usar fecha seleccionada o fecha actual si no se proporciona
        const fechaFactura = invoiceDate ? new Date(invoiceDate + 'T12:00:00') : new Date();
        const fechaFormato = fechaFactura.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        doc.setTextColor(...navyColor);
        doc.setFontSize(9);
        
        // Fecha a la derecha
        doc.setFont(undefined, 'bold');
        doc.text('FECHA:', 135, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(fechaFormato, 155, yPos);
        
        // Nombre del cliente
        doc.setFont(undefined, 'bold');
        doc.text('Nombre del cliente:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(clientName, 58, yPos);
        
        yPos += 7;
        
        // Teléfono
        doc.setFont(undefined, 'bold');
        doc.text('Teléfono:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(clientPhone, 44, yPos);
        
        yPos += 7;
        
        // Dirección
        doc.setFont(undefined, 'bold');
        doc.text('Dirección:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(direccion, 46, yPos);

        // ======================
        // TABLA
        // ======================
        yPos += 12;
        
        // Encabezado de tabla (azul marino con bordes)
        doc.setFillColor(...navyColor);
        doc.setDrawColor(...navyColor);
        doc.setLineWidth(0.5);
        doc.rect(20, yPos, 90, 8, 'FD');
        doc.rect(110, yPos, 25, 8, 'FD');
        doc.rect(135, yPos, 25, 8, 'FD');
        doc.rect(160, yPos, 30, 8, 'FD');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('DESCRIPCIÓN', 65, yPos + 5.5, { align: 'center' });
        doc.text('CANT.', 122.5, yPos + 5.5, { align: 'center' });
        doc.text('P. UNIT.', 147.5, yPos + 5.5, { align: 'center' });
        doc.text('V. TOTALES', 175, yPos + 5.5, { align: 'center' });

        yPos += 8;

        // Items (con bordes)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        
        const baseLineHeight = 5;
        const drawTableHeader = (positionY) => {
            doc.setFillColor(...navyColor);
            doc.setDrawColor(...navyColor);
            doc.setLineWidth(0.5);
            doc.rect(20, positionY, 90, 8, 'FD');
            doc.rect(110, positionY, 25, 8, 'FD');
            doc.rect(135, positionY, 25, 8, 'FD');
            doc.rect(160, positionY, 30, 8, 'FD');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text('DESCRIPCIÓN', 65, positionY + 5.5, { align: 'center' });
            doc.text('CANT.', 122.5, positionY + 5.5, { align: 'center' });
            doc.text('P. UNIT.', 147.5, positionY + 5.5, { align: 'center' });
            doc.text('V. TOTALES', 175, positionY + 5.5, { align: 'center' });
        };
        const ensureRowSpace = (rowHeight) => {
            if (yPos + rowHeight <= 250) return;
            doc.addPage();
            yPos = 20;
            drawTableHeader(yPos);
            yPos += 8;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
        };
        let totalFactura = 0;

        // Si hay items de facturación, usarlos
        if (billingItems.length > 0) {
            for (const itemData of billingItems) {
                const cantidad = Number(itemData.cantidad || 1);
                const precioUnit = Number(itemData.precio_unitario || 0);
                const montoItem = Number(itemData.monto_total_item || (cantidad * precioUnit));
                const descripcionCompleta = [itemData.descripcion, itemData.descripcion_detallada]
                    .filter(Boolean)
                    .join('\n');
                const descripcionLineas = doc.splitTextToSize(descripcionCompleta || 'Servicio', 84);
                const rowHeight = Math.max(10, (descripcionLineas.length * baseLineHeight) + 4);
                ensureRowSpace(rowHeight);

                doc.rect(20, yPos, 90, rowHeight, 'D');
                doc.rect(110, yPos, 25, rowHeight, 'D');
                doc.rect(135, yPos, 25, rowHeight, 'D');
                doc.rect(160, yPos, 30, rowHeight, 'D');
                
                doc.setTextColor(...navyColor);
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                
                totalFactura += montoItem;
                
                doc.text(descripcionLineas, 22, yPos + 5.5);
                doc.text(cantidad.toString(), 122.5, yPos + 6, { align: 'center' });
                doc.text(`$${precioUnit.toFixed(2)}`, 157, yPos + 6, { align: 'right' });
                doc.text(`$${montoItem.toFixed(2)}`, 187, yPos + 6, { align: 'right' });
                
                yPos += rowHeight;
            }
        } else {
            // Fallback: usar datos del inquiry
            const montoFinal = Number(inquiry.final_amount || inquiry.quote_amount || 0);
            const servicioDescripcion = inquiry.service_type || inquiry.message || 'Servicio de reparación';
            const descripcionLineas = doc.splitTextToSize(servicioDescripcion, 84);
            const rowHeight = Math.max(10, (descripcionLineas.length * baseLineHeight) + 4);
            ensureRowSpace(rowHeight);

            doc.rect(20, yPos, 90, rowHeight, 'D');
            doc.rect(110, yPos, 25, rowHeight, 'D');
            doc.rect(135, yPos, 25, rowHeight, 'D');
            doc.rect(160, yPos, 30, rowHeight, 'D');
            
            doc.setTextColor(...navyColor);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            
            totalFactura = montoFinal;
            
            doc.text(descripcionLineas, 22, yPos + 5.5);
            doc.text('1', 122.5, yPos + 6, { align: 'center' });
            doc.text(`$${montoFinal.toFixed(2)}`, 157, yPos + 6, { align: 'right' });
            doc.text(`$${montoFinal.toFixed(2)}`, 187, yPos + 6, { align: 'right' });
            
            yPos += rowHeight;
        }

        // ======================
        // TOTALES
        // ======================
        yPos += 15;
        
        // TOTAL (cuadro amarillo)
        doc.setFillColor(...yellowColor);
        doc.rect(130, yPos - 7, 60, 12, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL:', 135, yPos);
        doc.text(`$${totalFactura.toFixed(2)}`, 187, yPos, { align: 'right' });

        // ======================
        // PIE DE PÁGINA CON LOGO
        // ======================
        if (logoBase64) {
            // Logo con opacidad en el centro inferior
            doc.setGState(new doc.GState({ opacity: 0.6 }));
            doc.addImage(logoBase64, 'PNG', 65, 235, 80, 35);
            doc.setGState(new doc.GState({ opacity: 1 }));
        }
        
        // Mensaje final
        doc.setTextColor(...navyColor);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('¡Gracias por confiar en PROMAN SERVICES!', 105, 278, { align: 'center' });

        const pdfBytes = doc.output('arraybuffer');
        const pdfBase64 = arrayBufferToBase64(pdfBytes);

        return Response.json({ 
            success: true,
            pdf_base64: pdfBase64,
            filename: `factura-${facturaNum}.pdf`,
            message: 'Factura generada exitosamente'
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        return Response.json({ 
            error: 'Error al generar la factura', 
            details: error.message 
        }, { status: 500 });
    }
});