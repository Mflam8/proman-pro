import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Buscar trabajos completados hace 1-3 horas que no han sido encuestados
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
        
        const allCompleted = await base44.asServiceRole.entities.ClientInquiry.filter({
            status: 'completado'
        });
        
        // Filtrar solo los completados hace 1-3h que no tienen rating
        const recentlyCompleted = allCompleted.filter(job => {
            if (job.satisfaction_rating) return false; // Ya fue encuestado
            
            const updatedDate = new Date(job.updated_date);
            return updatedDate >= new Date(threeHoursAgo) && updatedDate <= new Date(oneHourAgo);
        });
        
        const results = [];
        
        for (const job of recentlyCompleted) {
            let customerPhone = job.phone;
            let customerName = job.client_name;
            
            if (job.customer_id) {
                const customer = await base44.asServiceRole.entities.Customer.filter({ id: job.customer_id });
                if (customer[0]) {
                    customerPhone = customer[0].phone;
                    customerName = customer[0].full_name;
                }
            }
            
            if (!customerPhone) continue;
            
            // Generar link de encuesta
            const surveyUrl = `${Deno.env.get('BASE_URL') || 'https://promanservices.base44.app'}/SatisfactionSurvey?id=${job.id}`;
            
            const whatsappPhone = customerPhone.replace(/\D/g, '');
            const message = `¡Hola ${customerName}! ⭐\n\nEsperamos que hayas quedado satisfecho con nuestro servicio de ${job.service_type}.\n\n¿Podrías calificarnos? Solo te tomará 30 segundos:\n${surveyUrl}\n\nTu opinión nos ayuda a mejorar.\n\n¡Gracias!\nPROMAN Services`;
            
            results.push({
                inquiry_id: job.id,
                customer: customerName,
                phone: customerPhone,
                whatsapp_url: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`,
                survey_url: surveyUrl,
                completed_hours_ago: Math.floor((Date.now() - new Date(job.updated_date).getTime()) / (1000 * 60 * 60))
            });
        }
        
        return Response.json({
            success: true,
            total_feedback_sent: results.length,
            results: results
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});