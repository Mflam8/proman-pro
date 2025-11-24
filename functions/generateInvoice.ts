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

        // Obtener items de facturación
        const billingItems = await base44.asServiceRole.entities.DetalleFacturaTrabajo.filter({ inquiry_id: inquiryId });

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
        let yPos = 65;
        
        // Encabezado de tabla
        doc.setFillColor(...navyColor);
        doc.rect(20, yPos, 170, 8, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('CANT.', 23, yPos + 5.5);
        doc.text('DESCRIPCIÓN', 40, yPos + 5.5);
        doc.text('P. UNIT.', 125, yPos + 5.5);
        doc.text('V. EXENTAS', 148, yPos + 5.5);
        doc.text('V. AFECTAS', 170, yPos + 5.5);

        yPos += 8;

        // Items
        doc.setTextColor(...navyColor);
        doc.setFont(undefined, 'normal');
        
        let totalExentas = 0;
        let totalAfectas = 0;

        if (billingItems.length > 0) {
            for (const item of billingItems) {
                const esAfecto = item.tipo_item === 'servicio' || item.tipo_item === 'mano_de_obra';
                const precioBase = item.cantidad * item.precio_unitario;
                
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }

                // Cantidad
                doc.text(item.cantidad.toString(), 23, yPos + 5);
                
                // Descripción
                let descripcion = item.descripcion;
                if (descripcion.startsWith('http')) {
                    descripcion = `Material - Ver imagen adjunta`;
                }
                const descLines = doc.splitTextToSize(descripcion, 80);
                doc.text(descLines, 40, yPos + 5);
                
                // Precio unitario
                doc.text(`$${item.precio_unitario.toFixed(2)}`, 125, yPos + 5);
                
                // Ventas exentas o afectas
                if (esAfecto) {
                    doc.text(`$${precioBase.toFixed(2)}`, 170, yPos + 5);
                    totalAfectas += precioBase;
                } else {
                    doc.text(`$${precioBase.toFixed(2)}`, 148, yPos + 5);
                    totalExentas += precioBase;
                }
                
                yPos += Math.max(descLines.length * 5, 8);
                
                // Línea separadora
                doc.setDrawColor(200, 200, 200);
                doc.line(20, yPos, 190, yPos);
                yPos += 2;
            }
        } else {
            // Si no hay items, usar el monto final
            const montoFinal = inquiry.final_amount || inquiry.quote_amount || 0;
            doc.text('1', 23, yPos + 5);
            doc.text(`Servicio de ${inquiry.service_type || 'Reparación'}`, 40, yPos + 5);
            doc.text(`$${montoFinal.toFixed(2)}`, 125, yPos + 5);
            doc.text(`$${(montoFinal / 1.13).toFixed(2)}`, 170, yPos + 5);
            totalAfectas = montoFinal / 1.13;
            yPos += 10;
        }

        // ======================
        // TOTALES
        // ======================
        yPos += 5;
        const totalesX = 130;
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        
        // SUMAS
        const sumas = totalExentas + totalAfectas;
        doc.text('SUMAS:', totalesX, yPos);
        doc.text(`$${sumas.toFixed(2)}`, 185, yPos, { align: 'right' });
        yPos += 6;
        
        // IVA Retenido
        doc.text('(-) IVA RETENIDO:', totalesX, yPos);
        doc.text('$0.00', 185, yPos, { align: 'right' });
        yPos += 6;
        
        // Línea
        doc.setDrawColor(...navyColor);
        doc.setLineWidth(0.5);
        doc.line(totalesX, yPos, 190, yPos);
        yPos += 6;
        
        // SUB-TOTAL
        doc.text('SUB-TOTAL:', totalesX, yPos);
        doc.text(`$${sumas.toFixed(2)}`, 185, yPos, { align: 'right' });
        yPos += 6;
        
        // Ventas exentas
        doc.text('VENTAS EXENTAS:', totalesX, yPos);
        doc.text(`$${totalExentas.toFixed(2)}`, 185, yPos, { align: 'right' });
        yPos += 6;
        
        // Ventas no sujetas
        doc.text('VENTAS NO SUJETAS:', totalesX, yPos);
        doc.text('$0.00', 185, yPos, { align: 'right' });
        yPos += 6;
        
        // IVA (13%)
        const iva = totalAfectas * 0.13;
        doc.text('(+) IVA (13%):', totalesX, yPos);
        doc.text(`$${iva.toFixed(2)}`, 185, yPos, { align: 'right' });
        yPos += 8;
        
        // VENTA TOTAL
        doc.setFillColor(...yellowColor);
        doc.rect(totalesX - 5, yPos - 4, 65, 10, 'F');
        doc.setTextColor(...navyColor);
        doc.setFontSize(12);
        doc.text('VENTA TOTAL:', totalesX, yPos + 3);
        const ventaTotal = sumas + iva;
        doc.text(`$${ventaTotal.toFixed(2)}`, 185, yPos + 3, { align: 'right' });

        // ======================
        // PIE DE PÁGINA
        // ======================
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('LLENAR SI LA OPERACIÓN ES SUPERIOR A $200.00', 20, 275);
        doc.text('Gracias por confiar en PROMAN Services', 105, 285, { align: 'center' });

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