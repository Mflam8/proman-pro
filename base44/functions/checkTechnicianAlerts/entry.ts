import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        
        const alerts = [];
        
        // 1. Técnico no confirmó "en ruta" para trabajo agendado hoy
        const today = now.toISOString().split('T')[0];
        const todayJobs = await base44.asServiceRole.entities.ClientInquiry.filter({
            scheduled_date: today,
            status: 'agendado'
        });
        
        for (const job of todayJobs) {
            if (!job.scheduled_start_time) continue;
            
            const [hours, minutes] = job.scheduled_start_time.split(':');
            const scheduledTime = new Date(now);
            scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0);
            
            // Si ya pasó la hora programada y sigue en "agendado"
            if (now > scheduledTime) {
                const delayMinutes = Math.floor((now - scheduledTime) / (1000 * 60));
                
                alerts.push({
                    type: 'no_confirmation',
                    severity: delayMinutes > 30 ? 'high' : 'medium',
                    inquiry_id: job.id,
                    customer: job.client_name,
                    technician: job.assigned_to,
                    scheduled_time: job.scheduled_start_time,
                    delay_minutes: delayMinutes,
                    message: `⚠️ Técnico ${job.assigned_to} no confirmó salida para trabajo con ${job.client_name}. Programado a las ${job.scheduled_start_time}, ${delayMinutes} min de retraso.`
                });
            }
        }
        
        // 2. Técnico en ruta hace más de 2 horas (posible problema)
        const enRutaJobs = await base44.asServiceRole.entities.ClientInquiry.filter({
            status: 'en_ruta'
        });
        
        for (const job of enRutaJobs) {
            if (!job.en_ruta_timestamp) continue;
            
            const enRutaTime = new Date(job.en_ruta_timestamp);
            const minutesEnRuta = Math.floor((now - enRutaTime) / (1000 * 60));
            
            if (minutesEnRuta > 120) {
                alerts.push({
                    type: 'stuck_en_ruta',
                    severity: 'high',
                    inquiry_id: job.id,
                    customer: job.client_name,
                    technician: job.assigned_to,
                    minutes_en_ruta: minutesEnRuta,
                    message: `🚨 Técnico ${job.assigned_to} lleva ${minutesEnRuta} min "en ruta" sin llegar. Cliente: ${job.client_name}`
                });
            }
        }
        
        // 3. Trabajo "en_sitio" sin actualizaciones hace más de 4 horas
        const enSitioJobs = await base44.asServiceRole.entities.ClientInquiry.filter({
            status: 'en_sitio'
        });
        
        for (const job of enSitioJobs) {
            if (!job.en_sitio_timestamp) continue;
            
            const enSitioTime = new Date(job.en_sitio_timestamp);
            const hoursEnSitio = Math.floor((now - enSitioTime) / (1000 * 60 * 60));
            
            if (hoursEnSitio > 4) {
                alerts.push({
                    type: 'no_progress_update',
                    severity: 'medium',
                    inquiry_id: job.id,
                    customer: job.client_name,
                    technician: job.assigned_to,
                    hours_without_update: hoursEnSitio,
                    message: `⚠️ Trabajo con ${job.client_name} sin actualización hace ${hoursEnSitio}h. Técnico: ${job.assigned_to}`
                });
            }
        }
        
        // Enviar alertas críticas por email a admin
        if (alerts.filter(a => a.severity === 'high').length > 0) {
            const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
            
            for (const admin of adminUsers) {
                const criticalAlerts = alerts.filter(a => a.severity === 'high');
                const emailBody = `ALERTAS CRÍTICAS DEL SISTEMA:\n\n${criticalAlerts.map(a => `- ${a.message}`).join('\n')}\n\nRevisa el sistema inmediatamente.`;
                
                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: admin.email,
                        subject: `🚨 ALERTAS CRÍTICAS - ${criticalAlerts.length} problema(s)`,
                        body: emailBody
                    });
                } catch (error) {
                    console.error('Error sending alert email:', error);
                }
            }
        }
        
        return Response.json({
            success: true,
            total_alerts: alerts.length,
            high_severity: alerts.filter(a => a.severity === 'high').length,
            medium_severity: alerts.filter(a => a.severity === 'medium').length,
            alerts: alerts
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});