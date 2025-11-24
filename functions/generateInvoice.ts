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
        doc.rect(10, 8, 50, 20, 'F');
        
        // Logo simulado dentro del cuadro blanco
        doc.setTextColor(...navyColor);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN', 35, 15, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('services', 35, 20, { align: 'center' });
        doc.setFontSize(6);
        doc.setFont(undefined, 'italic');
        const slogan = '"Generando soluciones en tu ambiente de trabajo"';
        doc.text(slogan, 35, 24, { align: 'center' });

        // Información de empresa (centro)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN SERVICES, S.A. DE C.V.', 105, 12, { align: 'center' });
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text('Email: admin@proman.services', 105, 17, { align: 'center' });
        doc.text('Contáctenos: 6053-1213', 105, 21, { align: 'center' });
        doc.text('Dirección: 17Av. Norte #1721, San Salvador', 105, 25, { align: 'center' });

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

        // ======================
        // DATOS DEL CLIENTE
        // ======================
        let yPos = 50;
        
        const clientName = customer?.full_name || inquiry.client_name || 'N/A';
        const clientPhone = customer?.phone || inquiry.phone || 'N/A';
        const direccion = inquiry.location || 'N/A';
        const fechaCreacion = new Date(inquiry.created_date);
        const fechaFormato = fechaCreacion.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        doc.setTextColor(...navyColor);
        doc.setFontSize(9);
        
        // Primera línea
        doc.setFont(undefined, 'bold');
        doc.text('NOMBRE DEL CLIENTE:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(clientName, 62, yPos);
        
        doc.setFont(undefined, 'bold');
        doc.text('DIRECCIÓN:', 135, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(direccion, 162, yPos);
        
        yPos += 7;
        
        // Segunda línea
        doc.setFont(undefined, 'bold');
        doc.text('TELEFONO:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(clientPhone, 45, yPos);
        
        doc.setFont(undefined, 'bold');
        doc.text('FECHA:', 135, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(fechaFormato, 162, yPos);

        // ======================
        // TABLA
        // ======================
        yPos += 12;
        const tableStartY = yPos;
        
        // Encabezado de tabla (azul marino con bordes)
        doc.setFillColor(...navyColor);
        doc.setDrawColor(...navyColor);
        doc.setLineWidth(0.5);
        doc.rect(20, yPos, 25, 8, 'FD');
        doc.rect(45, yPos, 90, 8, 'FD');
        doc.rect(135, yPos, 25, 8, 'FD');
        doc.rect(160, yPos, 30, 8, 'FD');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('CANT.', 32.5, yPos + 5.5, { align: 'center' });
        doc.text('DESCRIPCIÓN', 90, yPos + 5.5, { align: 'center' });
        doc.text('P. UNIT.', 147.5, yPos + 5.5, { align: 'center' });
        doc.text('V. TOTALES', 175, yPos + 5.5, { align: 'center' });

        yPos += 8;

        // Item (con bordes)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        
        const itemHeight = 10;
        doc.rect(20, yPos, 25, itemHeight, 'D');
        doc.rect(45, yPos, 90, itemHeight, 'D');
        doc.rect(135, yPos, 25, itemHeight, 'D');
        doc.rect(160, yPos, 30, itemHeight, 'D');
        
        doc.setTextColor(...navyColor);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        const montoFinal = inquiry.final_amount || inquiry.quote_amount || 0;
        const servicioDescripcion = inquiry.service_type || 'Servicio de reparación';
        
        doc.text('1', 32.5, yPos + 6, { align: 'center' });
        doc.text(servicioDescripcion, 47, yPos + 6);
        doc.text(`$${montoFinal.toFixed(2)}`, 157, yPos + 6, { align: 'right' });
        doc.text(`$${montoFinal.toFixed(2)}`, 187, yPos + 6, { align: 'right' });
        
        yPos += itemHeight;

        // ======================
        // TOTALES (alineados a la derecha)
        // ======================
        yPos += 10;
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...navyColor);
        
        // SUMAS
        doc.text('SUMAS:', 135, yPos);
        doc.text(`$${montoFinal.toFixed(2)}`, 187, yPos, { align: 'right' });
        yPos += 8;
        
        // SUB-TOTAL
        const subtotal = montoFinal / 1.13;
        doc.text('SUB-TOTAL:', 135, yPos);
        doc.text(`$${subtotal.toFixed(2)}`, 187, yPos, { align: 'right' });
        yPos += 15;
        
        // VENTA TOTAL (cuadro amarillo)
        doc.setFillColor(...yellowColor);
        doc.rect(130, yPos - 7, 60, 12, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('VENTA TOTAL:', 135, yPos);
        doc.text(montoFinal.toFixed(2), 187, yPos, { align: 'right' });

        // ======================
        // PIE DE PÁGINA
        // ======================
        yPos = 250;
        
        // Logo con opacidad (simulado con gris claro)
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(26);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN', 105, yPos, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text('services', 105, yPos + 6, { align: 'center' });
        
        yPos += 15;
        
        // Mensaje final
        doc.setTextColor(...navyColor);
        doc.setFontSize(11);
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