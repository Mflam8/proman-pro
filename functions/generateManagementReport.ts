import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper function to format money
const fmtMoney = (amount) => {
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

Deno.serve(async (req) => {
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

        // 1. Fetch Data
        const [inquiries, payments] = await Promise.all([
            base44.entities.ClientInquiry.list(),
            base44.entities.Payment.list()
        ]);

        // 2. Filter Data
        const filteredInquiries = inquiries.filter(i => {
            const date = new Date(i.scheduled_date || i.created_date);
            return date >= start && date <= end;
        });

        const filteredPayments = payments.filter(p => {
            const date = new Date(p.payment_date);
            return date >= start && date <= end;
        });

        // 3. Calculations
        const totalTrabajos = filteredInquiries.length;
        const trabajosCompletados = filteredInquiries.filter(i => i.status === 'completado').length;
        const pendientesCotizacion = filteredInquiries.filter(i => i.status === 'cotizacion_pendiente').length;
        const serviciosNuevos = filteredInquiries.filter(i => i.status === 'nuevo').length;
        
        const totalIngresos = filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        // Ingresos breakdown
        const ingresosPropia = filteredPayments
            .filter(p => p.destination_account_type === 'propia')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const ingresosTerceros = filteredPayments
            .filter(p => p.destination_account_type === 'terceros')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const ingresosEfectivo = filteredPayments
            .filter(p => p.destination_account_type === 'n/a' || !p.destination_account_type)
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        // Cuentas por cobrar (Historical, not just filtered range usually, but keeping consistency)
        // Usually Accounts Receivable is a snapshot of ALL open debts, regardless of when they were created.
        // But let's stick to the requested scope or all active debts if preferred. 
        // Here we calculate ALL pending debts as it's a status report.
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
                    date: i.created_date,
                    saldo: total - pagado 
                };
            })
            .filter(i => i.saldo > 0.01)
            .sort((a, b) => b.saldo - a.saldo);
        
        const totalPorCobrar = cuentasPorCobrar.reduce((sum, i) => sum + i.saldo, 0);

        // Dinero en Manos
        const dineroEmpleados = {};
        filteredPayments
            .filter(p => p.destination_account_type === 'n/a' || !p.destination_account_type)
            .forEach(p => {
                const collector = p.collected_by || 'No especificado';
                if (!dineroEmpleados[collector]) dineroEmpleados[collector] = 0;
                dineroEmpleados[collector] += (p.amount_paid || 0);
            });

        // Top Servicios
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


        // 4. HTML Generation
        const css = `
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; max-width: 1000px; margin: 0 auto; padding: 20px; }
            .header { background-color: #252a5c; color: white; padding: 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .meta { font-size: 12px; opacity: 0.9; text-align: right; }
            .section { margin-top: 30px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .section-title { background-color: #f4f6f8; padding: 12px 20px; font-weight: bold; color: #252a5c; border-bottom: 1px solid #eee; font-size: 16px; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; }
            .kpi-card { background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center; }
            .kpi-value { font-size: 24px; font-weight: bold; color: #252a5c; margin: 5px 0; }
            .kpi-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #f8f9fa; text-align: left; padding: 12px 20px; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #eee; }
            td { padding: 12px 20px; border-bottom: 1px solid #eee; font-size: 14px; }
            tr:last-child td { border-bottom: none; }
            .amount { font-family: 'Courier New', monospace; font-weight: bold; }
            .text-right { text-align: right; }
            .text-red { color: #dc2626; }
            .text-green { color: #16a34a; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            @media print {
                body { padding: 0; max-width: 100%; }
                .section { break-inside: avoid; box-shadow: none; border: 1px solid #ddd; }
            }
        `;

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte Gerencial - ${filterLabel}</title>
            <style>${css}</style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>PROMAN Services</h1>
                    <div style="font-size: 14px; opacity: 0.8; margin-top: 5px;">Reporte Gerencial</div>
                </div>
                <div class="meta">
                    <div>Período: <strong>${filterLabel}</strong></div>
                    <div>Generado: ${new Date().toLocaleString('es-SV')}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">1. Resumen Ejecutivo</div>
                <div class="summary-grid">
                    <div class="kpi-card">
                        <div class="kpi-value text-green">${serviciosNuevos}</div>
                        <div class="kpi-label">Servicios Nuevos</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value text-green">${trabajosCompletados}</div>
                        <div class="kpi-label">Completados</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value" style="color: #f59e0b;">${pendientesCotizacion}</div>
                        <div class="kpi-label">Pendientes Cotización</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value">${totalTrabajos}</div>
                        <div class="kpi-label">Total Trabajos</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value text-green">${fmtMoney(totalIngresos)}</div>
                        <div class="kpi-label">Ingresos Totales</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value text-red">${fmtMoney(totalPorCobrar)}</div>
                        <div class="kpi-label">Por Cobrar (Global)</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">2. Desglose de Ingresos (Flujo de Caja)</div>
                <table>
                    <thead>
                        <tr>
                            <th>Cuenta Destino</th>
                            <th class="text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Cuenta Empresa (Propia)</td>
                            <td class="text-right amount text-green">${fmtMoney(ingresosPropia)}</td>
                        </tr>
                        <tr>
                            <td>Cuenta Terceros</td>
                            <td class="text-right amount">${fmtMoney(ingresosTerceros)}</td>
                        </tr>
                        <tr>
                            <td>Efectivo (En Mano)</td>
                            <td class="text-right amount">${fmtMoney(ingresosEfectivo)}</td>
                        </tr>
                        <tr style="background-color: #f8f9fa; font-weight: bold;">
                            <td>TOTAL INGRESOS</td>
                            <td class="text-right amount">${fmtMoney(totalIngresos)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            ${Object.keys(dineroEmpleados).length > 0 ? `
            <div class="section">
                <div class="section-title">3. Dinero en Manos (Efectivo por Técnico)</div>
                <table>
                    <thead>
                        <tr>
                            <th>Responsable</th>
                            <th class="text-right">Monto a Liquidar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(dineroEmpleados).map(([k, v]) => `
                        <tr>
                            <td>${k}</td>
                            <td class="text-right amount text-red">${fmtMoney(v)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div class="section">
                <div class="section-title">4. Top Servicios (Más Vendidos)</div>
                <table>
                    <thead>
                        <tr>
                            <th>Servicio</th>
                            <th class="text-right">Cantidad</th>
                            <th class="text-right">Generado (Est.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topServices.map(([k, v]) => `
                        <tr>
                            <td>${k}</td>
                            <td class="text-right">${v.count}</td>
                            <td class="text-right amount">${fmtMoney(v.revenue)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            ${cuentasPorCobrar.length > 0 ? `
            <div class="section">
                <div class="section-title">5. Detalle Cuentas por Cobrar (Top 10)</div>
                <table>
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Servicio</th>
                            <th class="text-right">Saldo Pendiente</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cuentasPorCobrar.slice(0, 10).map(i => `
                        <tr>
                            <td>${i.client}</td>
                            <td>${i.service}</td>
                            <td class="text-right amount text-red">${fmtMoney(i.saldo)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div class="footer">
                <p>Reporte generado automáticamente por el sistema PROMAN Services.</p>
            </div>
            
            <script>
                // Auto print when loaded
                window.onload = function() { setTimeout(function() { window.print(); }, 500); }
            </script>
        </body>
        </html>
        `;

        return Response.json({ success: true, html: html });

    } catch (error) {
        console.error("HTML REPORT ERROR:", error);
        return Response.json({ 
            success: false, 
            error: error.message || "Error generico"
        }, { status: 500 });
    }
});