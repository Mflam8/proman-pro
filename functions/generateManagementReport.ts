import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTable from 'npm:jspdf-autotable@3.8.2';
import { format } from 'npm:date-fns@2.30.0';
import { es } from 'npm:date-fns@2.30.0/locale';

// Polyfill for jsPDF in Deno/Node environments
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
        // Ensure end date covers the full day
        end.setHours(23, 59, 59, 999);

        // Fetch Data
        const inquiries = await base44.entities.ClientInquiry.list();
        const payments = await base44.entities.Payment.list();

        // Filter Data by Date Range
        const filteredInquiries = inquiries.filter(i => {
            const date = new Date(i.scheduled_date || i.created_date);
            return date >= start && date <= end;
        });

        const filteredPayments = payments.filter(p => {
            const date = new Date(p.payment_date);
            return date >= start && date <= end;
        });

        // --- CALCULATIONS ---

        // 1. Resumen General
        const totalTrabajos = filteredInquiries.length;
        const trabajosCompletados = filteredInquiries.filter(i => i.status === 'completado').length;
        const pendientesCotizacion = filteredInquiries.filter(i => i.status === 'cotizacion_pendiente').length;
        
        const totalIngresos = filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        // 2. Cuentas por Cobrar (Total acumulado histórico)
        const cuentasPorCobrar = inquiries
            .filter(i => i.status === 'completado' && i.payment_status !== 'pagado')
            .map(i => {
                const total = i.final_amount || i.quote_amount || 0;
                const pagado = payments
                    .filter(p => p.inquiry_id === i.id)
                    .reduce((s, p) => s + (p.amount_paid || 0), 0);
                return { ...i, saldo: total - pagado, pagado, total };
            })
            .filter(i => i.saldo > 0.01); // Filter small floating point diffs
        
        const totalPorCobrar = cuentasPorCobrar.reduce((sum, i) => sum + i.saldo, 0);

        // 3. Desglose Geográfico
        const geoStats = {};
        filteredInquiries.forEach(i => {
            const loc = i.location || 'Sin Especificar';
            if (!geoStats[loc]) geoStats[loc] = { count: 0, revenue: 0 };
            geoStats[loc].count++;
            geoStats[loc].revenue += (i.final_amount || i.quote_amount || 0);
        });

        // 4. Servicios Más Vendidos
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

        // 5. Desglose de Ingresos
        const ingresosPropia = filteredPayments
            .filter(p => p.destination_account_type === 'propia')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const ingresosTerceros = filteredPayments
            .filter(p => p.destination_account_type === 'terceros')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const ingresosEfectivo = filteredPayments
            .filter(p => p.destination_account_type === 'n/a' || !p.destination_account_type)
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        // 6. Dinero en Manos
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
        doc.setFillColor(37, 42, 92); // Proman Navy
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
            ['Total Trabajos', totalTrabajos.toString()],
            ['Completados', trabajosCompletados.toString()],
            ['Pendientes de Cotización', pendientesCotizacion.toString()],
            ['Ingresos Totales (Pagos Recibidos)', `$ ${totalIngresos.toFixed(2)}`],
            ['Total por Cobrar (Global)', `$ ${totalPorCobrar.toFixed(2)}`]
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Métrica', 'Valor']],
            body: summaryData,
            theme: 'grid',
            headStyles: { fillColor: [253, 200, 12], textColor: [37, 42, 92] }, // Proman Yellow
            styles: { fontSize: 10 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // 2. Desglose de Ingresos
        doc.setFontSize(14);
        doc.text("2. Desglose de Ingresos (Flujo de Caja)", 20, yPos);
        yPos += 8;

        const incomeData = [
            ['Cuentas Propias (Empresa)', `$ ${ingresosPropia.toFixed(2)}`],
            ['Cuentas de Terceros', `$ ${ingresosTerceros.toFixed(2)}`],
            ['Efectivo / En Mano', `$ ${ingresosEfectivo.toFixed(2)}`],
            ['TOTAL', `$ ${totalIngresos.toFixed(2)}`]
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Destino / Cuenta', 'Monto']],
            body: incomeData,
            theme: 'striped',
            headStyles: { fillColor: [37, 42, 92] }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // 3. Dinero en Manos
        if (Object.keys(dineroEmpleados).length > 0) {
            doc.text("3. Detalle de Dinero en Manos (Efectivo)", 20, yPos);
            yPos += 8;
            
            const cashData = Object.entries(dineroEmpleados)
                .sort((a, b) => b[1] - a[1])
                .map(([name, amount]) => [name, `$ ${amount.toFixed(2)}`]);

            autoTable(doc, {
                startY: yPos,
                head: [['Responsable / Técnico', 'Monto']],
                body: cashData,
                theme: 'striped',
                headStyles: { fillColor: [220, 38, 38] } // Red color
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // Check page break
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }

        // 4. Top Servicios
        doc.setFontSize(14);
        doc.text("4. Servicios y Generación", 20, yPos);
        yPos += 8;

        const servicesData = topServices.map(([name, stats]) => [
            name, 
            stats.count.toString(), 
            `$ ${stats.revenue.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Servicio', 'Cantidad', 'Generado (Est.)']],
            body: servicesData,
            headStyles: { fillColor: [37, 42, 92] }
        });
        
        yPos = doc.lastAutoTable.finalY + 15;

        // Check page break
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }

        // 5. Desglose Geográfico
        doc.text("5. Actividad por Departamento", 20, yPos);
        yPos += 8;

        const geoData = Object.entries(geoStats)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .map(([loc, stats]) => [loc, stats.count.toString(), `$ ${stats.revenue.toFixed(2)}`]);

        autoTable(doc, {
            startY: yPos,
            head: [['Departamento', 'Trabajos', 'Generado (Est.)']],
            body: geoData,
            headStyles: { fillColor: [37, 42, 92] }
        });

        // 6. Cuentas por Cobrar
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.text("6. Detalle Cuentas por Cobrar (Global)", 20, yPos);
        yPos += 10;

        const cxcData = cuentasPorCobrar
            .sort((a, b) => b.saldo - a.saldo)
            .map(i => [
                i.client_name || 'Cliente',
                i.service_type || 'Servicio',
                i.created_date ? format(new Date(i.created_date), 'dd/MM/yyyy') : '-',
                `$ ${i.total.toFixed(2)}`,
                `$ ${i.saldo.toFixed(2)}`
            ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Cliente', 'Servicio', 'Fecha', 'Total', 'Pendiente']],
            body: cxcData,
            headStyles: { fillColor: [220, 38, 38] }
        });

        // Output
        const pdfBytes = doc.output('arraybuffer');
        
        // Upload
        const fileName = `reporte_gerencial_${Date.now()}.pdf`;
        const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
        
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        
        return Response.json({ success: true, pdf_url: uploadResult.file_url });

    } catch (error) {
        console.error("Error in generateManagementReport:", error);
        return Response.json({ 
            success: false,
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});