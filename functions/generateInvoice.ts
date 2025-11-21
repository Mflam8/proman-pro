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

        // Obtener cliente si existe
        let customer = null;
        if (inquiry.customer_id) {
            const customers = await base44.asServiceRole.entities.Customer.filter({ id: inquiry.customer_id });
            customer = customers[0];
        }

        const doc = new jsPDF();
        
        // Colores PROMAN
        const navyColor = [37, 42, 92];
        const yellowColor = [253, 200, 12];

        // Logo y header
        doc.setFillColor(...navyColor);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN SERVICES', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('Generando soluciones en tu ambiente de trabajo', 105, 28, { align: 'center' });

        // Badge CANCELADO
        doc.setFillColor(...yellowColor);
        doc.rect(150, 50, 50, 15, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('CANCELADO', 175, 59, { align: 'center' });

        // Título FACTURA
        doc.setTextColor(...navyColor);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('FACTURA', 20, 60);

        // Información de la factura
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`No. Trabajo: ${inquiry.id.substring(0, 8).toUpperCase()}`, 20, 70);
        const fechaCreacion = new Date(inquiry.created_date);
        doc.text(`Fecha: ${fechaCreacion.toLocaleDateString('es-SV')}`, 20, 76);

        // Información del cliente
        doc.setFillColor(240, 240, 240);
        doc.rect(20, 85, 170, 35, 'F');
        
        doc.setTextColor(...navyColor);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('DATOS DEL CLIENTE', 25, 93);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const clientName = customer?.full_name || inquiry.client_name || 'N/A';
        const clientPhone = customer?.phone || inquiry.phone || 'N/A';
        const clientEmail = customer?.email || 'N/A';
        const clientLocation = inquiry.location || 'N/A';

        doc.text(`Nombre: ${clientName}`, 25, 101);
        doc.text(`Teléfono: ${clientPhone}`, 25, 107);
        if (customer?.email) {
            doc.text(`Email: ${clientEmail}`, 25, 113);
        }

        // Detalles del servicio
        doc.setFillColor(240, 240, 240);
        doc.rect(20, 130, 170, 60, 'F');
        
        doc.setTextColor(...navyColor);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('DETALLES DEL SERVICIO', 25, 138);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Ubicación: ${clientLocation}`, 25, 148);
        doc.text(`Rubro: ${inquiry.rubro || 'N/A'}`, 25, 154);
        doc.text(`Servicio: ${inquiry.service_type || 'N/A'}`, 25, 160);
        
        if (inquiry.scheduled_date) {
            const fechaTrabajo = new Date(inquiry.scheduled_date);
            doc.text(`Fecha de realización: ${fechaTrabajo.toLocaleDateString('es-SV')}`, 25, 166);
        }

        if (inquiry.work_notes_done) {
            doc.text('Trabajo realizado:', 25, 172);
            const splitText = doc.splitTextToSize(inquiry.work_notes_done, 160);
            doc.text(splitText, 25, 178);
        }

        // Total
        const montoFinal = inquiry.final_amount || inquiry.quote_amount || 0;
        const yPosition = inquiry.work_notes_done ? 200 : 200;
        
        doc.setFillColor(...navyColor);
        doc.rect(120, yPosition, 70, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL CANCELADO', 155, yPosition + 8, { align: 'center' });
        
        doc.setFontSize(18);
        doc.text(`$${montoFinal.toFixed(2)}`, 155, yPosition + 18, { align: 'center' });

        // Pie de página
        doc.setTextColor(...navyColor);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('PROMAN Services', 105, 260, { align: 'center' });
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text('17 Avenida Norte #1721, Urbanización Elisa, San Salvador', 105, 266, { align: 'center' });
        doc.text('Tel: 6053-1213 | www.promanservices.com', 105, 271, { align: 'center' });
        
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('Gracias por confiar en PROMAN Services', 105, 280, { align: 'center' });

        // Convertir a buffer
        const pdfBytes = doc.output('arraybuffer');

        // Crear un Blob y subirlo
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const file = new File([blob], `factura-${inquiry.id.substring(0, 8)}.pdf`, { type: 'application/pdf' });
        
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        // Actualizar el inquiry con el PDF
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