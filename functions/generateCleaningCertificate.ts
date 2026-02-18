import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/135f5bee2_21558763_235265087000605_2527538411050239409_n-Editado.png';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { inquiryId, fechaInicio, fechaFin, tipoCertificado, emailDestinatario } = await req.json();

        if (!inquiryId || !fechaInicio || !fechaFin || !tipoCertificado || !emailDestinatario) {
            return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        // Obtener el trabajo
        const inquiries = await base44.asServiceRole.entities.ClientInquiry.filter({ id: inquiryId });
        if (!inquiries || inquiries.length === 0) {
            return Response.json({ error: 'Trabajo no encontrado' }, { status: 404 });
        }
        const inquiry = inquiries[0];

        // Obtener cliente para nombre del restaurante
        let customer = null;
        if (inquiry.customer_id) {
            const customers = await base44.asServiceRole.entities.Customer.filter({ id: inquiry.customer_id });
            if (customers && customers.length > 0) customer = customers[0];
        }

        const restaurantName = inquiry.restaurant_name || customer?.full_name || 'Restaurante';

        // Formatear fechas
        const formatDate = (dateStr) => {
            const d = new Date(dateStr + 'T12:00:00');
            return d.toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });
        };

        const fechaInicioFmt = formatDate(fechaInicio);
        const fechaFinFmt = formatDate(fechaFin);
        const fechaEmision = new Date().toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });

        // Generar número de certificado
        const certNum = `CERT-${Date.now().toString().slice(-6)}`;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Certificado de Limpieza - ${restaurantName}</title>
<style>
  @page { size: A4; margin: 0; }
  body { 
    font-family: 'Arial', sans-serif; 
    color: #252a5c; 
    width: 210mm; 
    min-height: 297mm; 
    margin: 0 auto; 
    padding: 18mm 20mm; 
    background: white; 
    box-sizing: border-box;
    position: relative;
  }
  
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8mm; }
  .logo { height: 20mm; width: auto; }
  .cert-num { font-size: 9pt; color: #666; text-align: right; }
  
  .divider-top { border: none; border-top: 3px solid #252a5c; margin: 0 0 6mm 0; }
  .divider-yellow { border: none; border-top: 4px solid #fdc80c; margin: 0 0 10mm 0; }
  
  .badge-container { text-align: center; margin-bottom: 8mm; }
  .badge { 
    display: inline-block;
    background-color: #252a5c; 
    color: #fdc80c; 
    font-size: 10pt; 
    font-weight: bold;
    letter-spacing: 3px;
    padding: 6px 24px;
    text-transform: uppercase;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .title-section { text-align: center; margin-bottom: 10mm; }
  .main-title { 
    font-size: 22pt; 
    font-weight: bold; 
    color: #252a5c; 
    text-transform: uppercase; 
    letter-spacing: 2px;
    margin: 0 0 4px 0;
  }
  .sub-title { 
    font-size: 13pt; 
    color: #555; 
    margin: 0;
    font-style: italic;
  }

  .cert-body { 
    background-color: #f9f9fc; 
    border: 1px solid #dde; 
    border-radius: 4px;
    padding: 10mm; 
    margin-bottom: 10mm; 
    font-size: 11pt;
    line-height: 1.8;
  }
  
  .cert-body p { margin: 0 0 6px 0; }
  .highlight { font-weight: bold; color: #252a5c; }
  .restaurant { font-size: 14pt; font-weight: bold; color: #252a5c; text-transform: uppercase; }
  
  .dates-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 8mm 0; 
  }
  .dates-table td { 
    width: 50%; 
    text-align: center; 
    padding: 6px; 
    background: #252a5c; 
    color: white; 
    font-size: 10pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .dates-table .date-value { 
    font-size: 12pt; 
    font-weight: bold; 
    display: block; 
    color: #fdc80c;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .dates-table .date-label { 
    font-size: 8pt; 
    text-transform: uppercase; 
    letter-spacing: 1px; 
    color: #ccc;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .tipo-cert { 
    background: #fdc80c; 
    color: #252a5c; 
    text-align: center; 
    font-weight: bold; 
    font-size: 12pt; 
    padding: 8px; 
    margin: 6mm 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .signature-section { 
    display: flex; 
    justify-content: space-between; 
    margin-top: 14mm; 
    gap: 20mm;
  }
  .signature-block { 
    flex: 1; 
    text-align: center; 
  }
  .signature-line { 
    border-top: 1px solid #252a5c; 
    margin-bottom: 4px; 
    padding-top: 4px; 
  }
  .signature-name { font-weight: bold; font-size: 9pt; }
  .signature-role { font-size: 8pt; color: #666; }

  .footer { 
    position: absolute; 
    bottom: 10mm; 
    left: 20mm; 
    right: 20mm; 
    text-align: center; 
    font-size: 8pt; 
    color: #888; 
    border-top: 1px solid #ddd; 
    padding-top: 4px; 
  }

  @media print {
    body { padding: 18mm 20mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>

<div class="header">
  <img src="${LOGO_URL}" alt="PROMAN Logo" class="logo">
  <div class="cert-num">
    <div style="font-size: 8pt; color: #999; text-transform: uppercase; letter-spacing: 1px;">No. Certificado</div>
    <div style="font-size: 11pt; font-weight: bold; color: #252a5c;">${certNum}</div>
    <div style="font-size: 8pt; color: #999; margin-top: 2px;">Emitido: ${fechaEmision}</div>
  </div>
</div>

<hr class="divider-top">
<hr class="divider-yellow">

<div class="badge-container">
  <span class="badge">PROMAN Services</span>
</div>

<div class="title-section">
  <h1 class="main-title">Certificado de Limpieza</h1>
  <p class="sub-title">Constancia de Servicios Profesionales de Higiene</p>
</div>

<div class="cert-body">
  <p>Por medio del presente documento, <span class="highlight">PROMAN Services S.A. de C.V.</span> hace constar que se han llevado a cabo los servicios de limpieza y mantenimiento descritos a continuación en las instalaciones de:</p>
  
  <p style="text-align: center; margin: 6mm 0; font-size: 15pt; font-weight: bold; color: #252a5c; text-transform: uppercase; letter-spacing: 1px;">${restaurantName}</p>

  <div class="tipo-cert">${tipoCertificado}</div>

  <table class="dates-table">
    <tr>
      <td>
        <span class="date-label">Fecha de Inicio</span>
        <span class="date-value">${fechaInicioFmt}</span>
      </td>
      <td>
        <span class="date-label">Fecha de Finalización</span>
        <span class="date-value">${fechaFinFmt}</span>
      </td>
    </tr>
  </table>

  <p style="margin-top: 6mm;">Los servicios fueron ejecutados bajo los estándares de calidad e higiene requeridos, cumpliendo con todos los protocolos establecidos por la empresa cliente.</p>
  <p>Este certificado valida que los trabajos han sido completados de manera satisfactoria y conforme a los lineamientos acordados.</p>
</div>

<div class="signature-section">
  <div class="signature-block">
    <div style="height: 15mm;"></div>
    <div class="signature-line"></div>
    <div class="signature-name">PROMAN Services S.A. de C.V.</div>
    <div class="signature-role">Empresa Ejecutora</div>
  </div>
  <div class="signature-block">
    <div style="height: 15mm;"></div>
    <div class="signature-line"></div>
    <div class="signature-name">${restaurantName}</div>
    <div class="signature-role">Cliente / Empresa Receptora</div>
  </div>
</div>

<div class="footer">
  PROMAN Services S.A. de C.V. &nbsp;|&nbsp; San Salvador, El Salvador &nbsp;|&nbsp; Tel: 6053-1213 &nbsp;|&nbsp; Este documento certifica la realización de los servicios indicados.
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

        // Subir el HTML como archivo
        const encoder = new TextEncoder();
        const file = new File([encoder.encode(html)], `certificado-limpieza-${certNum}.html`, { type: 'text/html; charset=utf-8' });
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        // Enviar email al restaurante
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: emailDestinatario,
            from_name: 'PROMAN Services',
            subject: `Certificado de Limpieza - ${restaurantName} (${certNum})`,
            body: `Estimados,

Adjuntamos el Certificado de Limpieza correspondiente a los servicios realizados en sus instalaciones.

Detalles:
- Restaurante: ${restaurantName}
- Tipo de certificado: ${tipoCertificado}
- Fecha de inicio: ${fechaInicioFmt}
- Fecha de finalización: ${fechaFinFmt}
- No. Certificado: ${certNum}

Puede ver e imprimir el certificado en el siguiente enlace:
${file_url}

Quedamos a sus órdenes para cualquier consulta.

Atentamente,
PROMAN Services S.A. de C.V.
Tel: 6053-1213`
        });

        return Response.json({
            success: true,
            cert_url: file_url,
            html: html,
            cert_number: certNum,
            message: `Certificado generado y enviado a ${emailDestinatario}`
        });

    } catch (error) {
        console.error('Error generating certificate:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});