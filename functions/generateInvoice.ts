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

        // Los items de facturación se guardan internamente pero no se muestran en la factura comercial

        const doc = new jsPDF();
        
        // Colores PROMAN
        const navyColor = [37, 42, 92];
        const yellowColor = [253, 200, 12];
        const lightBg = [245, 245, 250];

        // ======================
        // ENCABEZADO
        // ======================
        doc.setFillColor(...navyColor);
        doc.rect(0, 0, 210, 30, 'F');
        
        // Logo y datos empresa
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN SERVICES, S.A. DE C.V.', 15, 10);
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('Email: admin@proman.services', 15, 15);
        doc.text('Contáctenos: 6053-1213', 15, 19);
        doc.text('Dirección: 17Av. Norte #1721, San Salvador', 15, 23);

        // Cuadro de factura
        doc.setFillColor(...yellowColor);
        doc.rect(145, 8, 55, 15, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('FACTURA', 172.5, 13, { align: 'center' });
        doc.text('COMERCIAL', 172.5, 17.5, { align: 'center' });
        doc.setFontSize(9);
        const facturaNum = inquiry.id.substring(0, 8).toUpperCase();
        doc.text(`No. ${facturaNum}`, 172.5, 21.5, { align: 'center' });

        // ======================
        // DATOS DEL CLIENTE
        // ======================
        doc.setTextColor(...navyColor);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        
        const clientName = customer?.full_name || inquiry.client_name || 'N/A';
        const clientPhone = customer?.phone || inquiry.phone || 'N/A';
        const direccion = inquiry.location || 'N/A';
        const fechaCreacion = new Date(inquiry.created_date);
        const fechaFormato = fechaCreacion.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        doc.text('NOMBRE DEL CLIENTE:', 15, 40);
        doc.setFont(undefined, 'normal');
        doc.text(clientName, 60, 40);
        
        doc.setFont(undefined, 'bold');
        doc.text('DIRECCIÓN:', 115, 40);
        doc.setFont(undefined, 'normal');
        doc.text(direccion, 140, 40);
        
        doc.setFont(undefined, 'bold');
        doc.text('TELEFONO:', 15, 47);
        doc.setFont(undefined, 'normal');
        doc.text(clientPhone, 38, 47);
        
        doc.setFont(undefined, 'bold');
        doc.text('FECHA:', 115, 47);
        doc.setFont(undefined, 'normal');
        doc.text(fechaFormato, 132, 47);

        // ======================
        // TABLA DE ITEMS
        // ======================
        let yPos = 58;
        
        // Encabezado de tabla
        doc.setFillColor(...navyColor);
        doc.rect(15, yPos, 180, 8, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('CANT.', 18, yPos + 5.5);
        doc.text('DESCRIPCIÓN', 75, yPos + 5.5, { align: 'center' });
        doc.text('P. UNIT.', 148, yPos + 5.5);
        doc.text('V. TOTALES', 180, yPos + 5.5);

        yPos += 8;

        // Items - Solo se muestra el servicio general, sin desglose de materiales
        doc.setTextColor(...navyColor);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        const montoFinal = inquiry.final_amount || inquiry.quote_amount || 0;
        const servicioDescripcion = inquiry.service_type || 'Servicio de reparación';
        
        doc.text('1', 18, yPos + 5);
        doc.text(servicioDescripcion, 35, yPos + 5);
        doc.text(`$${montoFinal.toFixed(2)}`, 148, yPos + 5);
        doc.text(`$${montoFinal.toFixed(2)}`, 180, yPos + 5);
        
        yPos += 10;

        // ======================
        // TOTALES (sin IVA - factura comercial simple)
        // ======================
        yPos += 10;
        const totalesX = 145;
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        
        // Línea superior
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPos - 5, 195, yPos - 5);
        
        // SUMAS
        doc.text('SUMAS:', totalesX, yPos);
        doc.text(`$${montoFinal.toFixed(2)}`, 190, yPos, { align: 'right' });
        yPos += 7;
        
        // Línea
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(totalesX, yPos - 2, 195, yPos - 2);
        
        // SUB-TOTAL
        doc.text('SUB-TOTAL:', totalesX, yPos);
        doc.text(`$${montoFinal.toFixed(2)}`, 190, yPos, { align: 'right' });
        yPos += 12;
        
        // VENTA TOTAL (destacado en amarillo)
        doc.setFillColor(...yellowColor);
        doc.rect(totalesX - 5, yPos - 6, 55, 11, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(11);
        doc.text('VENTA TOTAL:', totalesX, yPos);
        doc.text(`${montoFinal.toFixed(2)}`, 190, yPos, { align: 'right' });

        // ======================
        // PIE DE PÁGINA
        // ======================
        yPos += 20;
        
        // Logo y mensaje final
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navyColor);
        doc.text('PROMAN', 105, yPos + 55, { align: 'center' });
        
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text('SERVICES', 105, yPos + 60, { align: 'center' });
        doc.text('Generando soluciones en tu ambiente de trabajo', 105, yPos + 64, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navyColor);
        doc.text('¡Gracias por confiar en PROMAN SERVICES!', 105, yPos + 72, { align: 'center' });

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