import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/135f5bee2_21558763_235265087000605_2527538411050239409_n-Editado.png';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { inquiryId, fechaEmision, fechaVencimiento, tipoCertificado, emailDestinatario, cadena, sucursal } = await req.json();

        if (!inquiryId || !fechaEmision || !fechaVencimiento || !tipoCertificado || !emailDestinatario || !cadena || !sucursal) {
            return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        // Empresa legal según cadena
        const empresaNombre = cadena === 'mcdonalds' ? 'SERVAMATIC, S.A DE C.V.' : 'ORIENTAL WOK, S.A DE C.V.';
        const cadenaDisplay = cadena === 'mcdonalds' ? "RESTAURANTE McDONALD'S SUCURSAL" : 'RESTAURANTE PANDA SUCURSAL';

        // Formatear fechas DD-MM-YYYY
        const formatDate = (dateStr) => {
            const [y, m, d] = dateStr.split('-');
            return `${d}-${m}-${y}`;
        };

        const certNum = `CERT-${Date.now().toString().slice(-6)}`;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Certificado - ${cadenaDisplay} ${sucursal}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    width: 297mm; height: 210mm; 
    overflow: hidden; 
    position: relative; 
    background: white;
    font-family: 'Georgia', 'Times New Roman', serif;
  }
  .content {
    position: absolute;
    left: 48mm;
    right: 8mm;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 6mm 0;
    gap: 0;
  }
  .logo { height: 20mm; width: auto; }
  .services-text {
    font-size: 9pt;
    letter-spacing: 5px;
    color: #252a5c;
    margin-top: 1mm;
    font-family: Arial, sans-serif;
  }
  .otorga {
    font-size: 10pt;
    font-style: italic;
    color: #252a5c;
    margin-top: 3mm;
    font-family: Arial, sans-serif;
  }
  .certificado-title {
    font-size: 44pt;
    font-weight: bold;
    color: #1a2050;
    letter-spacing: 3px;
    line-height: 1;
    margin-top: 1mm;
    font-family: 'Times New Roman', serif;
    text-transform: uppercase;
  }
  .gold-divider {
    width: 85%;
    height: 1.5px;
    background: linear-gradient(to right, transparent 0%, #c9a84c 20%, #f0d060 50%, #c9a84c 80%, transparent 100%);
    margin: 3mm 0;
  }
  .cert-text {
    font-size: 10.5pt;
    color: #252a5c;
    line-height: 1.7;
    max-width: 175mm;
    font-family: Arial, sans-serif;
  }
  .cert-names {
    font-size: 11.5pt;
    font-weight: bold;
    color: #1a2050;
    line-height: 1.5;
    margin-top: 2mm;
    font-family: Arial, sans-serif;
    letter-spacing: 0.3px;
  }
  .bottom-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 90%;
    margin-top: 3mm;
    gap: 5mm;
  }
  .dates-box {
    text-align: left;
    font-size: 7.5pt;
    font-weight: bold;
    color: #1a2050;
    font-family: Arial, sans-serif;
    min-width: 50mm;
  }
  .dates-box div { margin-bottom: 1.5mm; }
  .dates-underline {
    width: 45mm;
    height: 1px;
    background: #c9a84c;
    margin: 2mm 0;
  }
  .seal-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }
  .signature-box {
    text-align: center;
    min-width: 55mm;
  }
  .signature-text {
    font-size: 18pt;
    font-style: italic;
    color: #1a2050;
    font-family: 'Times New Roman', serif;
    letter-spacing: -1px;
  }
  .signature-logo { height: 10mm; width: auto; margin: 1mm 0; }
  .signature-name {
    font-size: 7.5pt;
    font-weight: bold;
    color: #1a2050;
    font-family: Arial, sans-serif;
  }
  .signature-role {
    font-size: 7pt;
    color: #1a2050;
    font-family: Arial, sans-serif;
    margin-top: 0.5mm;
  }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>

<!-- Decorative SVG Background -->
<svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;" 
     viewBox="0 0 297 210" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs>
    <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10163a"/>
      <stop offset="100%" stop-color="#1e2560"/>
    </linearGradient>
    <linearGradient id="goldWave1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8a6a20"/>
      <stop offset="30%" stop-color="#d4a820"/>
      <stop offset="60%" stop-color="#f5d060"/>
      <stop offset="100%" stop-color="#b08020"/>
    </linearGradient>
    <linearGradient id="goldWave2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8a6a20"/>
      <stop offset="30%" stop-color="#d4a820"/>
      <stop offset="60%" stop-color="#f5d060"/>
      <stop offset="100%" stop-color="#b08020"/>
    </linearGradient>
  </defs>
  
  <!-- Dark left navy panel -->
  <rect x="0" y="0" width="40" height="210" fill="url(#navyGrad)"/>
  
  <!-- Upper gold wave shape -->
  <path d="M 0 0 L 40 0 C 85 8, 95 35, 68 68 C 52 88, 22 88, 0 100 Z" 
        fill="url(#goldWave1)" opacity="0.95"/>
  
  <!-- Upper gold wave inner highlight -->
  <path d="M 0 0 L 32 0 C 70 6, 78 28, 55 55 C 42 70, 18 72, 0 80 Z" 
        fill="#f0c830" opacity="0.25"/>

  <!-- Lower gold wave shape -->
  <path d="M 0 210 L 40 210 C 85 202, 95 175, 68 142 C 52 122, 22 122, 0 110 Z" 
        fill="url(#goldWave2)" opacity="0.95"/>
  
  <!-- Lower gold wave inner highlight -->
  <path d="M 0 210 L 32 210 C 70 204, 78 182, 55 155 C 42 140, 18 138, 0 130 Z" 
        fill="#f0c830" opacity="0.25"/>

  <!-- Subtle background texture curves on white area -->
  <path d="M 55 0 Q 160 105 55 210" stroke="#ede8d0" stroke-width="0.6" fill="none"/>
  <path d="M 70 0 Q 185 105 70 210" stroke="#ede8d0" stroke-width="0.4" fill="none"/>
  <path d="M 90 0 Q 215 105 90 210" stroke="#ede8d0" stroke-width="0.25" fill="none"/>
  <path d="M 115 0 Q 250 105 115 210" stroke="#ede8d0" stroke-width="0.15" fill="none"/>
  
  <!-- Right side subtle curves -->
  <path d="M 297 20 Q 255 105 297 190" stroke="#ede8d0" stroke-width="0.5" fill="none"/>
  <path d="M 297 10 Q 245 105 297 200" stroke="#ede8d0" stroke-width="0.3" fill="none"/>
  <path d="M 297 5 Q 235 105 297 205" stroke="#ede8d0" stroke-width="0.2" fill="none"/>
</svg>

<!-- Certificate Content -->
<div class="content">

  <!-- Logo -->
  <img src="${LOGO_URL}" class="logo" alt="PROMAN" />
  <div class="services-text">s &nbsp; e &nbsp; r &nbsp; v &nbsp; i &nbsp; c &nbsp; e &nbsp; s</div>
  <div class="otorga">otorga el presente</div>
  <div class="certificado-title">CERTIFICADO</div>
  
  <div class="gold-divider"></div>
  
  <div class="cert-text">
    Tras completar los servicios de saneamiento ambiental<br>
    correspondiente a ${tipoCertificado} de
  </div>
  
  <div class="cert-names">
    ${empresaNombre}<br>
    ${cadenaDisplay}<br>
    ${sucursal.toUpperCase()}
  </div>
  
  <div class="gold-divider"></div>
  
  <!-- Bottom: Dates | Seal | Signature -->
  <div class="bottom-section">
    
    <!-- Left: Dates -->
    <div class="dates-box">
      <div>FECHA DE EMISIÓN: ${formatDate(fechaEmision)}</div>
      <div class="dates-underline"></div>
      <div>FECHA DE VENCIMIENTO: ${formatDate(fechaVencimiento)}</div>
    </div>
    
    <!-- Center: Gold Seal -->
    <div class="seal-container">
      <svg width="45" height="45" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sealGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stop-color="#f5e070"/>
            <stop offset="30%" stop-color="#d4a820"/>
            <stop offset="60%" stop-color="#a07820"/>
            <stop offset="100%" stop-color="#7a5810"/>
          </radialGradient>
          <radialGradient id="sealInner" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#fdf0a0"/>
            <stop offset="40%" stop-color="#e0c040"/>
            <stop offset="100%" stop-color="#c09020"/>
          </radialGradient>
        </defs>
        <!-- Outer star burst -->
        <polygon points="50,2 56,34 88,12 66,38 98,44 66,56 88,88 56,66 50,98 44,66 12,88 34,56 2,44 34,38 12,12 44,34" 
                 fill="url(#sealGrad)"/>
        <!-- Middle circle -->
        <circle cx="50" cy="50" r="28" fill="url(#sealGrad)" stroke="#f0d060" stroke-width="1"/>
        <!-- Inner circle -->
        <circle cx="50" cy="50" r="22" fill="url(#sealInner)"/>
        <!-- Shine -->
        <ellipse cx="42" cy="38" rx="7" ry="4" fill="rgba(255,255,255,0.35)" transform="rotate(-30,42,38)"/>
      </svg>
    </div>
    
    <!-- Right: Signature -->
    <div class="signature-box">
      <div class="signature-text">Mario M..</div>
      <div style="border-top:1px solid #1a2050;padding-top:1.5mm;margin-top:1mm;">
        <img src="${LOGO_URL}" class="signature-logo" alt="PROMAN" />
      </div>
      <div class="signature-name">LICDO. MARIO MORÁN</div>
      <div class="signature-role">GERENTE DE OPERACIONES</div>
    </div>
    
  </div>
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

        // Subir HTML
        const encoder = new TextEncoder();
        const file = new File([encoder.encode(html)], `certificado-${certNum}.html`, { type: 'text/html; charset=utf-8' });
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        // Enviar por correo
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