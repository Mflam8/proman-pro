import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        
        // Trabajos agendados para mañana (recordatorio 24h antes)
        const tomorrowJobs = await base44.asServiceRole.entities.ClientInquiry.filter({
            scheduled_date: tomorrowDate,
            status: 'agendado'
        });
        
        // Trabajos en próxima 1 hora (recordatorio 1h antes)
        const allScheduledJobs = await base44.asServiceRole.entities.ClientInquiry.filter({
            status: 'agendado'
        });
        
        const upcomingJobs = allScheduledJobs.filter(job => {
            if (!job.scheduled_start_time) return false;
            const jobDateTime = new Date(`${job.scheduled_date}T${job.scheduled_start_time}:00`);
            const timeDiff = jobDateTime.getTime() - now.getTime();
            return timeDiff > 0 && timeDiff <= 60 * 60 * 1000; // En la próxima hora
        });
        
        const results = [];
        
        // Procesar recordatorios 24h
        for (const job of tomorrowJobs) {
            let customerPhone = job.phone;
            let customerName = job.client_name;
            
            if (job.customer_id) {
                const customer = await base44.asServiceRole.entities.Customer.filter({ id: job.customer_id });
                if (customer[0]) {
                    customerPhone = customer[0].phone;
                    customerName = customer[0].full_name;
                }
            }
            
            // Obtener nombre del técnico
            let technicianName = 'nuestro técnico';
            if (job.assigned_to) {
                const users = await base44.asServiceRole.entities.User.filter({ email: job.assigned_to });
                if (users[0]) {
                    technicianName = users[0].employee_name || users[0].full_name;
                }
            }
            
            if (customerPhone) {
                const whatsappPhone = customerPhone.replace(/\D/g, '');
                const message = `¡Hola ${customerName}! 📅\n\nTe recordamos que *mañana ${job.scheduled_start_time || 'en la mañana'}* tenemos agendado tu servicio de ${job.service_type}.\n\n${technicianName} te atenderá en ${job.location}.\n\n¿Todo sigue en pie?\n\nPROMAN Services\n📞 6053-1213`;
                
                results.push({
                    type: '24h_reminder',
                    inquiry_id: job.id,
                    customer: customerName,
                    phone: customerPhone,
                    scheduled: `${job.scheduled_date} ${job.scheduled_start_time}`,
                    whatsapp_url: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
                });
            }
            
            // Notificar al técnico
            if (job.assigned_to) {
                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: job.assigned_to,
                        subject: `Recordatorio: Servicio mañana ${job.scheduled_start_time}`,
                        body: `Hola,\n\nRecordatorio de servicio programado para mañana:\n\nCliente: ${customerName}\nServicio: ${job.service_type}\nUbicación: ${job.location}\nHora: ${job.scheduled_start_time}\nDuración estimada: ${job.estimated_duration_hours || 'N/A'} horas\n\nSaludos,\nSistema PROMAN`
                    });
                    results.push({
                        type: '24h_reminder_technician',
                        inquiry_id: job.id,
                        technician: job.assigned_to
                    });
                } catch (error) {
                    console.error('Error sending email to technician:', error);
                }
            }
        }
        
        // Procesar recordatorios 1h
        for (const job of upcomingJobs) {
            if (job.assigned_to) {
                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: job.assigned_to,
                        subject: `⏰ URGENTE: Servicio en 1 hora`,
                        body: `RECORDATORIO URGENTE:\n\nTienes un servicio en aproximadamente 1 hora:\n\nCliente: ${job.client_name}\nServicio: ${job.service_type}\nUbicación: ${job.location}\nHora: ${job.scheduled_start_time}\n\n¡No olvides confirmar que vas en camino!\n\nSistema PROMAN`
                    });
                    results.push({
                        type: '1h_reminder',
                        inquiry_id: job.id,
                        technician: job.assigned_to,
                        time: `${job.scheduled_date} ${job.scheduled_start_time}`
                    });
                } catch (error) {
                    console.error('Error sending urgent reminder:', error);
                }
            }
        }
        
        return Response.json({
            success: true,
            total_reminders: results.length,
            reminders_24h: results.filter(r => r.type === '24h_reminder').length,
            reminders_1h: results.filter(r => r.type === '1h_reminder').length,
            results: results
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});