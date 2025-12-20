import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Calcular 24 horas atrás
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Buscar leads nuevos que no han sido contactados en 24h
        const allInquiries = await base44.asServiceRole.entities.ClientInquiry.filter({
            status: 'nuevo'
        });
        
        const dormantLeads = allInquiries.filter(inquiry => {
            const createdDate = new Date(inquiry.created_date);
            return createdDate < new Date(twentyFourHoursAgo);
        });
        
        const results = [];
        
        for (const lead of dormantLeads) {
            // Actualizar a estado "evaluacion_pendiente" (Lead Dormido)
            await base44.asServiceRole.entities.ClientInquiry.update(lead.id, {
                status: 'evaluacion_pendiente',
                notes: (lead.notes || '') + '\n[Auto] Lead sin respuesta por 24h - marcado como pendiente'
            });
            
            results.push({
                inquiry_id: lead.id,
                customer: lead.client_name,
                hours_passed: Math.floor((Date.now() - new Date(lead.created_date).getTime()) / (1000 * 60 * 60)),
                action: 'marked_dormant'
            });
        }
        
        return Response.json({
            success: true,
            total_marked: results.length,
            results: results
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});