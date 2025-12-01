import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTable from 'npm:jspdf-autotable@3.8.2';
import { format } from 'npm:date-fns@2.30.0';
import { es } from 'npm:date-fns@2.30.0/locale';

// Polyfill for jsPDF
if (typeof window === 'undefined') {
    globalThis.window = globalThis;
}

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            });
        }

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { startDate, endDate, filterLabel } = body;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Fetch Data
        const inquiries = await base44.entities.ClientInquiry.list();
        const payments = await base44.entities.Payment.list();

        // Filter Data
        const filteredInquiries = inquiries.filter(i => {
            const date = new Date(i.scheduled_date || i.created_date);
            return date >= start && date <= end;
        });

        const filteredPayments = payments.filter(p => {
            const date = new Date(p.payment_date);
            return date >= start && date <= end;
        });

        // --- CALCULATIONS ---
        const totalTrabajos = filteredInquiries.length;
        const trabajosCompletados = filteredInquiries.filter(i => i.status === 'completado').length;
        const pendientesCotizacion = filteredInquiries.filter(i => i.status === 'cotizacion_pendiente').length;
        const serviciosNuevos = filteredInquiries.filter(i => i.status === 'nuevo').length;
        
        const totalIngresos = filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        // Cuentas por cobrar
        const cuentasPorCobrar = inquiries
            .filter(i => i.status === 'completado' && i.payment_status !== 'pagado')
            .map(i => {
                const total = i.final_amount || i.quote_amount || 0;
                const pagado = payments
                    .filter(p => p.inquiry_id === i.id)
                    .reduce((s, p) => s + (p.amount_paid || 0), 0);
                return { ...i, saldo: total - pagado, pagado, total };
            })
            .filter(i => i.saldo > 0.01);
        
        const totalPorCobrar = cuentasPorCobrar.reduce((sum, i) => sum + i.saldo, 0);

        // Stats Geo
        const geoStats = {};
        filteredInquiries.forEach(i => {
            const loc = i.location || 'Sin Especificar';
            if (!geoStats[loc]) geoStats[loc] = { count: 0, revenue: 0 };
            geoStats[loc].count++;
            geoStats[loc].revenue += (i.final_amount || i.quote_amount || 0);
        });

        // Stats Servicios
        const serviceStats = {};
        filteredInquiries.forEach(i => {
            const srv = i.service_type || 'Otros';
            if (!serviceStats[srv]) serviceStats[srv] = { count: 0, revenue: 0 };
            serviceStats[srv].count++;
            serviceStats[srv].revenue += (i.final_amount || i.quote_amount || 0);
        });
        const topServices = Object.entries(serviceStats)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 10);

        // Ingresos stats
        const ingresosPropia = filteredPayments
            .filter(p => p.destination_account_type === 'propia')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const ingresosTerceros = filteredPayments
            .filter(p => p.destination_account_type === 'terceros')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const ingresosEfectivo = filteredPayments
            .filter(p => p.destination_account_type === 'n/a' || !p.destination_account_type)
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        const dineroEmpleados = {};
        filteredPayments
            .filter(p => p.destination_account_type === 'n/a' || !p.destination_account_type)
            .forEach(p => {
                const collector = p.collected_by || 'No especificado';
                if (!dineroEmpleados[collector]) dineroEmpleados[collector] = 0;
                dineroEmpleados[collector] += (p.amount_paid || 0);
            });

        // --- PDF GENERATION ---
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        let yPos = 20;

        // Header
        doc.setFillColor(37, 42, 92);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("Reporte Gerencial", 20, 20);
        doc.setFontSize(12);
        doc.text(`Período: ${filterLabel}`, 20, 30);
        doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 60, 30);

        yPos = 50;

        // 1. Resumen Ejecutivo
        doc.setTextColor(37, 42, 92);
        doc.setFontSize(16);
        doc.text("1. Resumen Ejecutivo", 20, yPos);
        yPos += 10;

        const summaryData = [
            ['Servicios Nuevos', serviciosNuevos.toString()],
            ['Completados', trabajosCompletados.toString()],
            ['Pendientes de Cotización', pendientesCotizacion.toString()],
            ['Total Trabajos', totalTrabajos.toString()],
            ['Ingresos Totales', `$ ${totalIngresos.toFixed(2)}`],
            ['Cuentas por Cobrar', `$ ${totalPorCobrar.toFixed(2)}`]
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Métrica', 'Valor']],
            body: summaryData,
            theme: 'grid',
            headStyles: { fillColor: [253, 200, 12], textColor: [37, 42, 92] },
            styles: { fontSize: 10 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // 2. Ingresos
        doc.setFontSize(14);
        doc.text("2. Desglose de Ingresos", 20, yPos);
        yPos += 8;

        autoTable(doc, {
            startY: yPos,
            head: [['Cuenta', 'Monto']],
            body: [
                ['Empresa', `$ ${ingresosPropia.toFixed(2)}`],
                ['Terceros', `$ ${ingresosTerceros.toFixed(2)}`],
                ['Efectivo', `$ ${ingresosEfectivo.toFixed(2)}`],
                ['TOTAL', `$ ${totalIngresos.toFixed(2)}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [37, 42, 92] }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // 3. Dinero en Manos
        if (Object.keys(dineroEmpleados).length > 0) {
            doc.text("3. Dinero en Manos (Efectivo)", 20, yPos);
            yPos += 8;
            autoTable(doc, {
                startY: yPos,
                head: [['Responsable', 'Monto']],
                body: Object.entries(dineroEmpleados).map(([k, v]) => [k, `$ ${v.toFixed(2)}`]),
                theme: 'striped',
                headStyles: { fillColor: [220, 38, 38] }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // 4. Top Servicios
        if (yPos > 200) { doc.addPage(); yPos = 20; }
        doc.text("4. Top Servicios", 20, yPos);
        yPos += 8;
        autoTable(doc, {
            startY: yPos,
            head: [['Servicio', 'Cant.', 'Generado']],
            body: topServices.map(([k, v]) => [k, v.count, `$ ${v.revenue.toFixed(2)}`]),
            headStyles: { fillColor: [37, 42, 92] }
        });

        // Output as Base64
        const pdfBytes = doc.output('arraybuffer');
        const binaryString = new Uint8Array(pdfBytes).reduce((acc, byte) => acc + String.fromCharCode(byte), '');
        const pdfBase64 = btoa(binaryString);

        return Response.json({ success: true, pdf_base64: pdfBase64 });

    } catch (error) {
        return Response.json({ 
            success: false,
            error: error.message
        }, { status: 500 });
    }
});