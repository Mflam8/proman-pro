import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { inquiryId } = await req.json();

        if (!inquiryId) {
            return Response.json({ error: 'inquiryId is required' }, { status: 400 });
        }

        // Obtener el trabajo
        const inquiries = await base44.asServiceRole.entities.ClientInquiry.filter({ id: inquiryId });
        const inquiry = inquiries[0];

        if (!inquiry) {
            return Response.json({ error: 'Trabajo no encontrado' }, { status: 404 });
        }

        // Obtener cliente
        let customer = null;
        if (inquiry.customer_id) {
            const customers = await base44.asServiceRole.entities.Customer.filter({ id: inquiry.customer_id });
            customer = customers[0];
        }

        const doc = new jsPDF();
        
        // Colores PROMAN
        const navyColor = [37, 42, 92];
        const yellowColor = [253, 200, 12];

        // ======================
        // ENCABEZADO AZUL MARINO
        // ======================
        doc.setFillColor(...navyColor);
        doc.rect(0, 0, 210, 35, 'F');
        
        // Logo en la izquierda (simulado con texto blanco)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN', 15, 15);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('services', 15, 20);

        // Información de empresa
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN SERVICES, S.A. DE C.V.', 60, 12);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text('Email: admin@proman.services', 60, 17);
        doc.text('Contáctenos: 6053-1213', 60, 21);
        doc.text('Dirección: 17Av. Norte #1721, San Salvador', 60, 25);

        // Cuadro amarillo de factura (derecha)
        doc.setFillColor(...yellowColor);
        doc.rect(150, 10, 50, 15, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('FACTURA', 175, 15, { align: 'center' });
        doc.text('COMERCIAL', 175, 19, { align: 'center' });
        const facturaNum = inquiry.id.substring(0, 8).toUpperCase();
        doc.text(`No. ${facturaNum}`, 175, 23, { align: 'center' });

        // ======================
        // DATOS DEL CLIENTE (fondo blanco)
        // ======================
        let yPos = 45;
        
        const clientName = customer?.full_name || inquiry.client_name || 'N/A';
        const clientPhone = customer?.phone || inquiry.phone || 'N/A';
        const direccion = inquiry.location || 'N/A';
        const fechaCreacion = new Date(inquiry.created_date);
        const fechaFormato = fechaCreacion.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        doc.setTextColor(...navyColor);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        
        // Primera línea
        doc.text('NOMBRE DEL CLIENTE:', 15, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(clientName, 60, yPos);
        
        doc.setFont(undefined, 'bold');
        doc.text('DIRECCIÓN:', 120, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(direccion, 150, yPos);
        
        yPos += 6;
        
        // Segunda línea
        doc.setFont(undefined, 'bold');
        doc.text('TELEFONO:', 15, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(clientPhone, 38, yPos);
        
        doc.setFont(undefined, 'bold');
        doc.text('FECHA:', 120, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(fechaFormato, 150, yPos);

        // ======================
        // TABLA
        // ======================
        yPos += 12;
        
        // Encabezado de tabla (azul marino)
        doc.setFillColor(...navyColor);
        doc.rect(15, yPos, 180, 8, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('CANT.', 20, yPos + 5.5);
        doc.text('DESCRIPCIÓN', 75, yPos + 5.5, { align: 'center' });
        doc.text('P. UNIT.', 150, yPos + 5.5);
        doc.text('V. TOTALES', 180, yPos + 5.5);

        yPos += 10;

        // Items - Solo el servicio general
        doc.setTextColor(...navyColor);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        const montoFinal = inquiry.final_amount || inquiry.quote_amount || 0;
        const servicioDescripcion = inquiry.service_type || 'Servicio de reparación';
        
        doc.text('1', 20, yPos);
        doc.text(servicioDescripcion, 35, yPos);
        doc.text(`$${montoFinal.toFixed(2)}`, 150, yPos);
        doc.text(`$${montoFinal.toFixed(2)}`, 180, yPos);
        
        yPos += 8;

        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(15, yPos, 195, yPos);

        // ======================
        // TOTALES
        // ======================
        yPos += 10;
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...navyColor);
        
        // SUMAS
        doc.text('SUMAS:', 150, yPos);
        doc.text(`$${montoFinal.toFixed(2)}`, 190, yPos, { align: 'right' });
        yPos += 8;
        
        // Línea
        doc.setDrawColor(200, 200, 200);
        doc.line(150, yPos - 2, 195, yPos - 2);
        
        // SUB-TOTAL
        const subtotal = montoFinal / 1.13;
        doc.text('SUB-TOTAL:', 150, yPos);
        doc.text(`$${subtotal.toFixed(2)}`, 190, yPos, { align: 'right' });
        yPos += 15;
        
        // VENTA TOTAL (cuadro amarillo)
        doc.setFillColor(...yellowColor);
        doc.rect(145, yPos - 6, 50, 10, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('VENTA TOTAL:', 150, yPos);
        doc.text(montoFinal.toFixed(2), 190, yPos, { align: 'right' });

        // ======================
        // PIE DE PÁGINA
        // ======================
        yPos = 260;
        
        // Logo con opacidad (simulado con color gris)
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN', 105, yPos, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('services', 105, yPos + 5, { align: 'center' });
        
        yPos += 12;
        
        // Mensaje final
        doc.setTextColor(...navyColor);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('¡Gracias por confiar en PROMAN SERVICES!', 105, yPos, { align: 'center' });

        // Convertir a buffer y subir
        const pdfBytes = doc.output('arraybuffer');
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const file = new File([blob], `factura-${facturaNum}.pdf`, { type: 'application/pdf' });
        
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        // Actualizar el inquiry
        await base44.asServiceRole.entities.ClientInquiry.update(inquiryId, {
            quote_pdf_url: file_url
        });

        return Response.json({ 
            success: true, 
            pdf_url: file_url,
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