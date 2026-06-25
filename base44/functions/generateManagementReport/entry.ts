import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const fmtMoney = (amount) => new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD'
}).format(Number(amount || 0));

const fmtNumber = (value) => new Intl.NumberFormat('es-SV').format(Number(value || 0));

const formatMonthLabel = (date) => new Intl.DateTimeFormat('es-SV', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
}).format(date);

const formatShortDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value));
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getInquiryDate = (inquiry) => inquiry?.scheduled_date || inquiry?.created_date;

const getInquiryAmount = (inquiry) => {
  const candidates = [
    inquiry?.final_amount,
    inquiry?.subtotal_amount,
    inquiry?.quote_amount,
    inquiry?.precio_sin_iva
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);

  return candidates[0] || 0;
};

const getCustomerKey = (inquiry) => {
  return inquiry?.customer_id || inquiry?.normalized_phone || inquiry?.phone || inquiry?.client_name || inquiry?.source_conversation_id || inquiry?.id;
};

const getCustomerName = (inquiry, customerMap) => {
  if (inquiry?.customer_id && customerMap.has(inquiry.customer_id)) {
    return customerMap.get(inquiry.customer_id)?.full_name || inquiry.client_name || 'Cliente sin nombre';
  }
  return inquiry?.client_name || inquiry?.phone || 'Cliente sin nombre';
};

const groupCount = (items, extractor) => {
  const counts = {};
  items.forEach((item) => {
    const key = extractor(item) || 'Sin especificar';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const groupRevenue = (items, keyExtractor, amountExtractor) => {
  const stats = {};
  items.forEach((item) => {
    const key = keyExtractor(item) || 'Sin especificar';
    if (!stats[key]) stats[key] = { count: 0, revenue: 0 };
    stats[key].count += 1;
    stats[key].revenue += amountExtractor(item);
  });
  return Object.entries(stats)
    .map(([name, value]) => ({ name, count: value.count, revenue: value.revenue }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue);
};

const listAll = async (entityApi, sort = '-created_date', batchSize = 500) => {
  const results = [];
  let skip = 0;

  while (true) {
    const batch = await entityApi.list(sort, batchSize, skip);
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < batchSize) break;
    skip += batch.length;
    if (skip >= 5000) break;
  }

  return results;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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

    if (!startDate || !endDate) {
      return Response.json({ success: false, error: 'startDate y endDate son requeridos' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const today = new Date();
    const reportEnd = end > today ? today : end;

    const [inquiries, payments, customers] = await Promise.all([
      listAll(base44.entities.ClientInquiry, '-created_date'),
      listAll(base44.entities.Payment, '-created_date'),
      listAll(base44.entities.Customer, '-created_date')
    ]);

    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    const filteredInquiries = inquiries.filter((inquiry) => {
      const rawDate = getInquiryDate(inquiry);
      if (!rawDate) return false;
      const date = new Date(rawDate);
      return date >= start && date <= end;
    });

    const filteredPayments = payments.filter((payment) => {
      if (!payment?.payment_date) return false;
      const date = new Date(payment.payment_date);
      return date >= start && date <= end;
    });

    const monthCursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const monthEndBoundary = new Date(Date.UTC(reportEnd.getUTCFullYear(), reportEnd.getUTCMonth(), 1));
    const monthlyBreakdown = [];

    while (monthCursor <= monthEndBoundary) {
      const monthStart = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0, 23, 59, 59, 999));

      const monthInquiries = filteredInquiries.filter((inquiry) => {
        const date = new Date(getInquiryDate(inquiry));
        return date >= monthStart && date <= monthEnd;
      });

      const monthPayments = filteredPayments.filter((payment) => {
        const date = new Date(payment.payment_date);
        return date >= monthStart && date <= monthEnd;
      });

      const uniqueCustomers = new Set(monthInquiries.map(getCustomerKey).filter(Boolean));
      const generated = monthPayments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
      const operationalRevenue = monthInquiries.reduce((sum, inquiry) => sum + getInquiryAmount(inquiry), 0);

      monthlyBreakdown.push({
        label: formatMonthLabel(monthStart),
        clients: uniqueCustomers.size,
        jobs: monthInquiries.length,
        generated,
        operationalRevenue,
        estimatedClientValue: uniqueCustomers.size * 40,
        referenceTicket: monthInquiries.length * 155
      });

      monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
    }

    const monthsCount = monthlyBreakdown.length || 1;
    const totalGenerated = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
    const totalOperationalRevenue = filteredInquiries.reduce((sum, inquiry) => sum + getInquiryAmount(inquiry), 0);
    const totalClients = monthlyBreakdown.reduce((sum, month) => sum + month.clients, 0);
    const avgMonthlyGenerated = totalGenerated / monthsCount;
    const avgMonthlyClients = totalClients / monthsCount;

    const servicesRanking = groupRevenue(
      filteredInquiries,
      (inquiry) => inquiry.service_type || 'Sin especificar',
      (inquiry) => getInquiryAmount(inquiry)
    ).slice(0, 10);

    const departmentDistribution = groupCount(filteredInquiries, (inquiry) => inquiry.location || 'Sin especificar');
    const rubroDistribution = groupCount(filteredInquiries, (inquiry) => inquiry.rubro || 'Sin especificar');

    const latestTenClients = [];
    const seenClients = new Set();
    const recentSorted = [...filteredInquiries].sort((a, b) => new Date(getInquiryDate(b)).getTime() - new Date(getInquiryDate(a)).getTime());

    recentSorted.forEach((inquiry) => {
      const customerKey = getCustomerKey(inquiry);
      if (!customerKey || seenClients.has(customerKey) || latestTenClients.length >= 10) return;
      seenClients.add(customerKey);
      latestTenClients.push({
        name: getCustomerName(inquiry, customerMap),
        department: inquiry.location || 'Sin especificar',
        rubro: inquiry.rubro || 'Sin especificar',
        service: inquiry.service_type || 'Sin especificar',
        amount: getInquiryAmount(inquiry),
        date: getInquiryDate(inquiry)
      });
    });

    const css = `
      body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; max-width: 1120px; margin: 0 auto; padding: 24px; background: #f8fafc; }
      .header { background: #252a5c; color: white; padding: 24px; border-radius: 16px; }
      .header h1 { margin: 0 0 6px; font-size: 28px; }
      .subtitle { opacity: 0.88; font-size: 14px; }
      .meta { margin-top: 12px; font-size: 13px; opacity: 0.92; }
      .section { margin-top: 24px; background: white; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; }
      .section-title { background: #f3f4f6; color: #252a5c; padding: 14px 18px; font-weight: 700; font-size: 16px; border-bottom: 1px solid #e5e7eb; }
      .section-body { padding: 18px; }
      .note { background: #fff8dc; border: 1px solid #f5d76e; color: #6b4f00; padding: 14px 16px; border-radius: 12px; line-height: 1.5; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
      .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; background: #ffffff; }
      .card-label { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
      .card-value { margin-top: 8px; font-size: 26px; font-weight: 700; color: #252a5c; }
      .card-sub { margin-top: 6px; font-size: 12px; color: #6b7280; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; background: #f9fafb; color: #6b7280; font-size: 12px; text-transform: uppercase; padding: 12px 14px; border-bottom: 1px solid #e5e7eb; }
      td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; font-size: 14px; vertical-align: top; }
      tr:last-child td { border-bottom: none; }
      .amount { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .small { font-size: 12px; color: #6b7280; }
      .footer { margin-top: 24px; color: #6b7280; font-size: 12px; text-align: center; }
      @media print {
        body { background: white; padding: 0; }
        .section, .header { break-inside: avoid; }
      }
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Reporte Anual Bancario - ${escapeHtml(filterLabel || 'Reporte')}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="header">
          <h1>PROMAN Services</h1>
          <div class="subtitle">Reporte anual ampliado para presentación bancaria</div>
          <div class="meta">
            Período analizado: <strong>${escapeHtml(filterLabel || 'Personalizado')}</strong><br/>
            Cobertura: ${escapeHtml(formatShortDate(start))} al ${escapeHtml(formatShortDate(reportEnd))}<br/>
            Generado: ${escapeHtml(new Intl.DateTimeFormat('es-SV', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' }).format(new Date()))}
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. Criterios y referencias usadas en este reporte</div>
          <div class="section-body">
            <div class="note">
              Para fines bancarios, este reporte incorpora dos referencias de negocio indicadas por la empresa: <strong>valor promedio por cliente de USD 40</strong> y <strong>ticket promedio de USD 155</strong>.
              La base operativa usa clientes identificados por customer_id, teléfono normalizado, nombre o conversación cuando no existe un identificador único perfecto.
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. Resumen ejecutivo anual</div>
          <div class="section-body">
            <div class="grid">
              <div class="card">
                <div class="card-label">Ingresos generados</div>
                <div class="card-value">${escapeHtml(fmtMoney(totalGenerated))}</div>
                <div class="card-sub">Cobrado en el período</div>
              </div>
              <div class="card">
                <div class="card-label">Promedio mensual generado</div>
                <div class="card-value">${escapeHtml(fmtMoney(avgMonthlyGenerated))}</div>
                <div class="card-sub">Desde inicio del año</div>
              </div>
              <div class="card">
                <div class="card-label">Clientes por mes</div>
                <div class="card-value">${escapeHtml(avgMonthlyClients.toFixed(1))}</div>
                <div class="card-sub">Promedio mensual</div>
              </div>
              <div class="card">
                <div class="card-label">Servicios registrados</div>
                <div class="card-value">${escapeHtml(fmtNumber(filteredInquiries.length))}</div>
                <div class="card-sub">Trabajos en el período</div>
              </div>
              <div class="card">
                <div class="card-label">Valor promedio por cliente</div>
                <div class="card-value">${escapeHtml(fmtMoney(40))}</div>
                <div class="card-sub">Referencia de negocio</div>
              </div>
              <div class="card">
                <div class="card-label">Ticket promedio</div>
                <div class="card-value">${escapeHtml(fmtMoney(155))}</div>
                <div class="card-sub">Referencia de negocio</div>
              </div>
              <div class="card">
                <div class="card-label">Valor operativo estimado</div>
                <div class="card-value">${escapeHtml(fmtMoney(totalOperationalRevenue))}</div>
                <div class="card-sub">Según montos de trabajos</div>
              </div>
              <div class="card">
                <div class="card-label">Valor por clientes estimado</div>
                <div class="card-value">${escapeHtml(fmtMoney(totalClients * 40))}</div>
                <div class="card-sub">Clientes mensuales acumulados × USD 40</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. Clientes e ingresos por mes</div>
          <div class="section-body">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Clientes</th>
                  <th>Servicios</th>
                  <th class="amount">Ingresos cobrados</th>
                  <th class="amount">Valor clientes (USD 40)</th>
                  <th class="amount">Ticket ref. (USD 155)</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyBreakdown.map((row) => `
                  <tr>
                    <td>${escapeHtml(row.label)}</td>
                    <td>${escapeHtml(fmtNumber(row.clients))}</td>
                    <td>${escapeHtml(fmtNumber(row.jobs))}</td>
                    <td class="amount">${escapeHtml(fmtMoney(row.generated))}</td>
                    <td class="amount">${escapeHtml(fmtMoney(row.estimatedClientValue))}</td>
                    <td class="amount">${escapeHtml(fmtMoney(row.referenceTicket))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <div class="section-title">4. Servicios más vendidos</div>
          <div class="section-body">
            <table>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Cantidad</th>
                  <th class="amount">Valor asociado</th>
                </tr>
              </thead>
              <tbody>
                ${servicesRanking.map((item) => `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(fmtNumber(item.count))}</td>
                    <td class="amount">${escapeHtml(fmtMoney(item.revenue))}</td>
                  </tr>
                `).join('') || '<tr><td colspan="3">Sin datos</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <div class="section-title">5. Distribución geográfica y por rubro</div>
          <div class="section-body two-col">
            <div>
              <h3 style="margin-top:0;color:#252a5c;">Por departamento</h3>
              <table>
                <thead>
                  <tr>
                    <th>Departamento</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${departmentDistribution.map((item) => `
                    <tr>
                      <td>${escapeHtml(item.name)}</td>
                      <td>${escapeHtml(fmtNumber(item.value))}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="2">Sin datos</td></tr>'}
                </tbody>
              </table>
            </div>
            <div>
              <h3 style="margin-top:0;color:#252a5c;">Por rubro</h3>
              <table>
                <thead>
                  <tr>
                    <th>Rubro</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${rubroDistribution.map((item) => `
                    <tr>
                      <td>${escapeHtml(item.name)}</td>
                      <td>${escapeHtml(fmtNumber(item.value))}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="2">Sin datos</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">6. Ejemplos de los últimos 10 clientes</div>
          <div class="section-body">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Departamento</th>
                  <th>Rubro</th>
                  <th>Servicio</th>
                  <th class="amount">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${latestTenClients.map((item) => `
                  <tr>
                    <td>${escapeHtml(formatShortDate(item.date))}</td>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.department)}</td>
                    <td>${escapeHtml(item.rubro)}</td>
                    <td>${escapeHtml(item.service)}</td>
                    <td class="amount">${escapeHtml(fmtMoney(item.amount))}</td>
                  </tr>
                `).join('') || '<tr><td colspan="6">Sin datos</td></tr>'}
              </tbody>
            </table>
            <p class="small" style="margin-top:12px;">Estos registros se muestran como muestra operativa reciente para respaldo del comportamiento comercial.</p>
          </div>
        </div>

        <div class="footer">
          Reporte generado automáticamente por PROMAN Services para uso administrativo y bancario.
        </div>

        <script>
          window.onload = function () {
            setTimeout(function () { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    return Response.json({
      success: true,
      html,
      summary: {
        totalGenerated,
        avgMonthlyGenerated,
        avgMonthlyClients,
        totalServices: filteredInquiries.length
      }
    });
  } catch (error) {
    console.error('MANAGEMENT REPORT ERROR:', error);
    return Response.json({ success: false, error: error.message || 'Error generico' }, { status: 500 });
  }
});