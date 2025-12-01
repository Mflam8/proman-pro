import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTable from 'npm:jspdf-autotable@3.8.2';

// --- CRITICAL ENVIRONMENT POLYFILLS ---
// jsPDF and autoTable require these globals to function in Deno/Node
if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
}
if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { userAgent: 'node' };
}
if (typeof globalThis.document === 'undefined') {
    // Minimal document mock for some libraries
    globalThis.document = {
        createElement: () => ({}),
        createElementNS: () => ({}),
    };
}

Deno.serve(async (req) => {
    // 1. Handle CORS preflight immediately
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    try {
        // 2. Setup Client
        const base44 = createClientFromRequest(req);
        
        // 3. Auth Check
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 4. Parse Body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { startDate, endDate, filterLabel } = body;
        
        // 5. Data Fetching
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Fetch only needed entities
        const [inquiries, payments] = await Promise.all([
            base44.entities.ClientInquiry.list(),
            base44.entities.Payment.list()
        ]);

        // 6. Filtering
        const filteredInquiries = inquiries.filter(i => {
            const date = new Date(i.scheduled_date || i.created_date);
            return date >= start && date <= end;
        });

        const filteredPayments = payments.filter(p => {
            const date = new Date(p.payment_date);
            return date >= start && date <= end;
        });

        // 7. Calculations
        const totalTrabajos = filteredInquiries.length;
        const trabajosCompletados = filteredInquiries.filter(i => i.status === 'completado').length;
        const pendientesCotizacion = filteredInquiries.filter(i => i.status === 'cotizacion_pendiente').length;
        const serviciosNuevos = filteredInquiries.filter(i => i.status === 'nuevo').length;
        const totalIngresos = filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        // Cuentas por cobrar logic
        const cuentasPorCobrar = inquiries
            .filter(i => i.status === 'completado' && i.payment_status !== 'pagado')
            .map(i => {
                const total = i.final_amount || i.quote_amount || 0;
                const pagado = payments
                    .filter(p => p.inquiry_id === i.id)
                    .reduce((s, p) => s + (p.amount_paid || 0), 0);
                return { 
                    client: i.client_name || 'Cliente',
                    service: i.service_type || '-',
                    saldo: total - pagado 
                };
            })
            .filter(i => i.saldo > 0.01);
        
        const totalPorCobrar = cuentasPorCobrar.reduce((sum, i) => sum + i.saldo, 0);

        // Ingresos logic
        const ingresosPropia = filteredPayments
            .filter(p => p.destination_account_type === 'propia')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const ingresosTerceros = filteredPayments
            .filter(p => p.destination_account_type === 'terceros')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const ingresosEfectivo = filteredPayments
            .filter(p => p.destination_account_type === 'n/a' || !p.destination_account_type)
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        // Dinero en manos logic
        const dineroEmpleados = {};
        filteredPayments
            .filter(p => p.destination_account_type === 'n/a' || !p.destination_account_type)
            .forEach(p => {
                const collector = p.collected_by || 'No especificado';
                if (!dineroEmpleados[collector]) dineroEmpleados[collector] = 0;
                dineroEmpleados[collector] += (p.amount_paid || 0);
            });

        // Top Servicios logic
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


        // 8. PDF Generation
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const fmtMoney = (v) => `$ ${v.toFixed(2)}`;

        // Header
        doc.setFillColor(37, 42, 92);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("Reporte Gerencial", 20, 20);
        doc.setFontSize(12);
        doc.text(`Período: ${filterLabel || 'Personalizado'}`, 20, 30);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 60, 30);

        let yPos = 50;

        // Table 1: Resumen
        doc.setTextColor(37, 42, 92);
        doc.setFontSize(14);
        doc.text("1. Resumen Ejecutivo", 20, yPos);
        yPos += 8;

        autoTable(doc, {
            startY: yPos,
            head: [['Indicador', 'Valor']],
            body: [
                ['Servicios Nuevos', servicesNuevos],
                ['Trabajos Completados', trabajosCompletados],
                ['Pendientes de Cotización', pendientesCotizacion],
                ['Total Trabajos (Período)', totalTrabajos],
                ['Ingresos Totales', fmtMoney(totalIngresos)],
                ['Cuentas por Cobrar (Global)', fmtMoney(totalPorCobrar)],
            ],
            theme: 'grid',
            headStyles: { fillColor: [253, 200, 12], textColor: [37, 42, 92] },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // Table 2: Ingresos
        doc.text("2. Desglose de Ingresos", 20, yPos);
        yPos += 8;
        autoTable(doc, {
            startY: yPos,
            head: [['Cuenta Destino', 'Monto']],
            body: [
                ['Empresa (Propia)', fmtMoney(ingresosPropia)],
                ['Terceros', fmtMoney(ingresosTerceros)],
                ['Efectivo (En Mano)', fmtMoney(ingresosEfectivo)],
                ['TOTAL', fmtMoney(totalIngresos)]
            ],
            theme: 'striped',
            headStyles: { fillColor: [37, 42, 92] }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // Table 3: Dinero en Manos
        if (Object.keys(dineroEmpleados).length > 0) {
            doc.text("3. Dinero en Manos (Efectivo)", 20, yPos);
            yPos += 8;
            autoTable(doc, {
                startY: yPos,
                head: [['Responsable', 'Monto']],
                body: Object.entries(dineroEmpleados).map(([k, v]) => [k, fmtMoney(v)]),
                headStyles: { fillColor: [220, 38, 38] }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // Table 4: Top Servicios
        if (yPos > 220) { doc.addPage(); yPos = 20; }
        doc.text("4. Top Servicios (Más Vendidos)", 20, yPos);
        yPos += 8;
        autoTable(doc, {
            startY: yPos,
            head: [['Servicio', 'Cant.', 'Generado']],
            body: topServices.map(([k, v]) => [k, v.count, fmtMoney(v.revenue)]),
            headStyles: { fillColor: [37, 42, 92] }
        });

        // 9. Return Base64
        const pdfBytes = doc.output('arraybuffer');
        const binaryString = new Uint8Array(pdfBytes).reduce((acc, byte) => acc + String.fromCharCode(byte), '');
        const pdfBase64 = btoa(binaryString);

        return Response.json({ success: true, pdf_base64: pdfBase64 });

    } catch (error) {
        // Log error for debugging (server side)
        console.error("REPORT_ERROR:", error);
        return Response.json({ 
            success: false, 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});