import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Obtener trabajos marcados como "en_ruta" en los últimos 5 minutos
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const enRutaJobs = await base44.asServiceRole.entities.ClientInquiry.filter({
            status: 'en_ruta'
        });
        
        // Filtrar solo los que fueron actualizados recientemente
        const recentlyMarked = enRutaJobs.filter(job => {
            if (!job.en_ruta_timestamp) return false;
            const timestamp = new Date(job.en_ruta_timestamp);
            return timestamp >= new Date(fiveMinutesAgo);
        });
        
        const results = [];
        
        for (const job of recentlyMarked) {
            // Si ya fue notificado, skip
            if (job.client_notified) continue;
            
            // Obtener información del cliente
            let customerPhone = job.phone;
            let customerName = job.client_name;
            
            if (job.customer_id) {
                const customer = await base44.asServiceRole.entities.Customer.filter({ id: job.customer_id });
                if (customer[0]) {
                    customerPhone = customer[0].phone;
                    customerName = customer[0].full_name;
                }
            }
            
            if (!customerPhone) {
                results.push({ 
                    inquiry: job.id, 
                    status: 'skipped', 
                    reason: 'No phone number' 
                });
                continue;
            }
            
            // Obtener nombre del técnico
            let technicianName = 'nuestro técnico';
            if (job.assigned_to) {
                const users = await base44.asServiceRole.entities.User.filter({ email: job.assigned_to });
                if (users[0]) {
                    technicianName = users[0].employee_name || users[0].full_name || 'nuestro técnico';
                }
            }
            
            // Construir mensaje personalizado
            const whatsappPhone = customerPhone.replace(/\D/g, '');
            const message = `¡Hola ${customerName}! 🚗\n\n${technicianName} ya está *en camino* a tu domicilio para el servicio de ${job.service_type}.\n\n${job.scheduled_start_time ? `Hora estimada de llegada: ${job.scheduled_start_time}` : 'Llegará pronto.'}\n\n¡Gracias por tu paciencia!\n\nEquipo de PROMAN Services\n📞 6053-1213`;
            
            const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
            
            // Marcar como notificado
            await base44.asServiceRole.entities.ClientInquiry.update(job.id, {
                client_notified: true
            });
            
            results.push({
                inquiry: job.id,
                customer: customerName,
                phone: customerPhone,
                whatsapp_url: whatsappUrl,
                status: 'notified'
            });
        }
        
        return Response.json({
            success: true,
            results: results,
            total_notified: results.filter(r => r.status === 'notified').length
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});