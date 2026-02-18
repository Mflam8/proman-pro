import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TEMPLATE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/a323ac64b_3.png';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { inquiryId, fechaEmision, fechaVencimiento, tipoCertificado, emailDestinatario, cadena, sucursal } = await req.json();

        if (!inquiryId || !fechaEmision || !fechaVencimiento || !tipoCertificado || !emailDestinatario || !cadena || !sucursal) {
            return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        const empresaNombre = cadena === 'mcdonalds' ? 'SERVAMATIC, S.A DE C.V.' : 'ORIENTAL WOK, S.A DE C.V.';
        const cadenaDisplay = cadena === 'mcdonalds' ? "RESTAURANTE McDONALD'S SUCURSAL" : 'RESTAURANTE PANDA SUCURSAL';

        const formatDate = (dateStr) => {
            const [y, m, d] = dateStr.split('-');
            return `${d}-${m}-${y}`;
        };

        const certNum = `CERT-${Date.now().toString().slice(-6)}`;

        // The template image is 1587x1122px (approx A4 landscape at 135dpi)
        // We overlay text using absolute positioning over the background image
        // Content area starts at ~28% from left (after the dark navy/gold left panel)
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Certificado ${certNum}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 297mm;
    height: 210mm;
    overflow: hidden;
    background: white;
  }
  .wrapper {
    position: relative;
    width: 297mm;
    height: 210mm;
  }
  .bg {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
  }
  /* All text content overlaid on top of image */
  .overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* Adjust left padding to account for the dark navy panel (~28% of width) */
    padding-left: 16%;
    padding-right: 3%;
    padding-top: 0;
    padding-bottom: 0;
    justify-content: center;
    text-align: center;
  }

  /* Spacer to push text to match template layout */
  /* Template already has: logo, "services", "otorga el presente", "CERTIFICADO", divider line */
  /* We need to place: service description, company/restaurant name, second divider, dates */
  /* The top ~52% of the cert has the fixed elements (logo, title, first divider) */
  /* We fill the middle blank area with our dynamic text */

  .spacer-top {
    /* Push content down past the "CERTIFICADO" title and first gold divider */
    height: 52%;
    flex-shrink: 0;
  }

  .cert-text {
    font-size: 10.5pt;
    color: #1a2050;
    line-height: 1.65;
    font-family: Arial, Helvetica, sans-serif;
    max-width: 195mm;
  }

  .cert-names {
    font-size: 12pt;
    font-weight: bold;
    color: #1a2050;
    line-height: 1.55;
    margin-top: 4mm;
    font-family: Arial, Helvetica, sans-serif;
    letter-spacing: 0.3px;
  }

  .spacer-bottom {
    /* Push dates to bottom section (past second gold divider in template) */
    flex: 1;
  }

  .dates-row {
    /* Align with the dates area in the template (bottom-left of content area) */
    width: 100%;
    display: flex;
    justify-content: flex-start;
    padding-left: 5mm;
    padding-bottom: 9mm;
  }

  .dates-box {
    text-align: left;
    font-size: 7.5pt;
    font-weight: bold;
    color: #1a2050;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.8;
  }

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
<div class="wrapper">
  <!-- Template background image (full bleed) -->
  <img src="${TEMPLATE_URL}" class="bg" alt="" />

  <!-- Dynamic text overlay -->
  <div class="overlay">
    <div class="spacer-top"></div>

    <div class="cert-text">
      Tras completar los servicios de saneamiento ambiental<br>
      correspondiente a ${tipoCertificado} de
    </div>

    <div class="cert-names">
      ${empresaNombre}<br>
      ${cadenaDisplay}<br>
      ${sucursal.toUpperCase()}
    </div>

    <div class="spacer-bottom"></div>

    <div class="dates-row">
      <div class="dates-box">
        FECHA DE EMISIÓN: ${formatDate(fechaEmision)}<br>
        FECHA DE VENCIMIENTO: ${formatDate(fechaVencimiento)}
      </div>
    </div>
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

        // Upload HTML
        const encoder = new TextEncoder();
        const file = new File([encoder.encode(html)], `certificado-${certNum}.html`, { type: 'text/html; charset=utf-8' });
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: emailDestinatario,
            from_name: 'PROMAN Services',
            subject: `Certificado de Limpieza - ${cadenaDisplay} ${sucursal.toUpperCase()} (${certNum})`,
            body: `Estimados,

Adjuntamos el Certificado de Limpieza por los servicios realizados en sus instalaciones.

Detalles del Certificado:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Empresa: ${empresaNombre}
• Sucursal: ${cadenaDisplay} ${sucursal.toUpperCase()}
• Servicio: ${tipoCertificado}
• Fecha de Emisión: ${formatDate(fechaEmision)}
• Fecha de Vencimiento: ${formatDate(fechaVencimiento)}
• No. Certificado: ${certNum}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ver e imprimir el certificado aquí:
${file_url}

Atentamente,
LICDO. MARIO MORÁN
Gerente de Operaciones
PROMAN Services S.A. de C.V.
Tel: 6053-1213`
        });

        return Response.json({
            success: true,
            cert_url: file_url,
            html: html,
            cert_number: certNum,
            message: `Certificado ${certNum} generado y enviado a ${emailDestinatario}`
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});