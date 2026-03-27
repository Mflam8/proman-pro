import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Usar service role para acceder a todos los datos y enviar correos
        const adminClient = base44.asServiceRole;

        // 1. Calcular fecha de mañana para recordatorios (formato YYYY-MM-DD)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        console.log(`Buscando trabajos programados para mañana: ${tomorrowStr}`);

        // 2. Buscar trabajos programados para mañana
        const inquiries = await adminClient.entities.ClientInquiry.filter({
            scheduled_date: tomorrowStr,
            status: ["trabajo_aprobado", "en_proceso", "evaluacion_agendada"] // Solo trabajos activos/agendados
        });

        const inquiriesData = inquiries.map(i => i.data || i);
        console.log(`Encontrados ${inquiriesData.length} trabajos para recordar.`);

        const results = [];

        // 3. Iterar y enviar recordatorios
        for (const job of inquiriesData) {
            if (!job.assigned_to) {
                results.push({ id: job.id, status: 'skipped', reason: 'No technician assigned' });
                continue;
            }

            // Obtener datos del cliente para el correo
            let customerName = job.client_name || "Cliente";
            let customerPhone = job.phone || "N/A";
            
            if (job.customer_id) {
                try {
                    const customers = await adminClient.entities.Customer.filter({ id: job.customer_id });
                    if (customers.length > 0) {
                        const customer = customers[0].data || customers[0];
                        customerName = customer.full_name;
                        customerPhone = customer.phone;
                    }
                } catch (e) {
                    console.error(`Error fetching customer for job ${job.id}`, e);
                }
            }

            const emailBody = `
Hola,

Tienes un trabajo programado para mañana. Aquí están los detalles:

📅 Fecha: ${job.scheduled_date}
⏰ Hora: ${job.scheduled_start_time || 'Por definir'}
📍 Ubicación: ${job.location_name ? job.location_name + ', ' : ''}${job.location || 'N/A'}
👤 Cliente: ${customerName}
📞 Teléfono: ${customerPhone}

🛠️ Servicio: ${job.rubro || ''} - ${job.service_type || 'Servicio General'}
📝 Descripción: ${job.message || 'Sin detalles adicionales'}

Recuerda realizar tu Check-in enviando un mensaje al Bot de WhatsApp al llegar al sitio.

¡Buen trabajo!
Equipo PROMAN
            `;

            try {
                await adminClient.integrations.Core.SendEmail({
                    to: job.assigned_to,
                    subject: `🔔 Recordatorio de Trabajo: ${customerName} - ${tomorrowStr}`,
                    body: emailBody,
                    from_name: "PROMAN Bot"
                });
                results.push({ id: job.id, status: 'sent', to: job.assigned_to });
            } catch (error) {
                console.error(`Error sending email to ${job.assigned_to}`, error);
                results.push({ id: job.id, status: 'error', error: error.message });
            }
        }

        return Response.json({ 
            success: true, 
            processed: inquiriesData.length, 
            results 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});