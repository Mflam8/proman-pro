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
        
        // Primera línea - Nombre y Fecha
        doc.setFont(undefined, 'bold');
        doc.text('NOMBRE DEL CLIENTE:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(clientName, 62, yPos);
        
        doc.setFont(undefined, 'bold');
        doc.text('FECHA:', 135, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(fechaFormato, 155, yPos);
        
        yPos += 7;
        
        // Segunda línea - Teléfono
        doc.setFont(undefined, 'bold');
        doc.text('TELEFONO:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(clientPhone, 45, yPos);
        
        yPos += 7;
        
        // Tercera línea - Dirección
        doc.setFont(undefined, 'bold');
        doc.text('DIRECCIÓN:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(direccion, 48, yPos);

        // ======================
        // TABLA
        // ======================
        yPos += 12;
        
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
        doc.text(`$${montoFinal.toFixed(2)}`, 187, yPos, { align: 'right' });

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