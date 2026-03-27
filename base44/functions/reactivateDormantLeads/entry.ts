import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Buscar leads sin conversión de hace 14-21 días
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
        
        // Estados que consideramos "sin conversión"
        const dormantStatuses = ['nuevo', 'evaluacion_pendiente', 'cotizacion_pendiente', 'pendiente_aprobacion'];
        
        const allInquiries = await base44.asServiceRole.entities.ClientInquiry.list();
        
        const dormantLeads = allInquiries.filter(inquiry => {
            if (!dormantStatuses.includes(inquiry.status)) return false;
            
            const createdDate = new Date(inquiry.created_date);
            const updatedDate = new Date(inquiry.updated_date);
            const lastActivity = updatedDate > createdDate ? updatedDate : createdDate;
            
            return lastActivity >= new Date(twentyOneDaysAgo) && 
                   lastActivity <= new Date(fourteenDaysAgo);
        });
        
        const results = [];
        
        for (const lead of dormantLeads) {
            let customerPhone = lead.phone;
            let customerName = lead.client_name;
            
            if (lead.customer_id) {
                const customer = await base44.asServiceRole.entities.Customer.filter({ id: lead.customer_id });
                if (customer[0]) {
                    customerPhone = customer[0].phone;
                    customerName = customer[0].full_name;
                }
            }
            
            if (!customerPhone) continue;
            
            const whatsappPhone = customerPhone.replace(/\D/g, '');
            const message = `Hola ${customerName} 👋\n\nEsperamos que estés bien.\n\nSeguimos disponibles para ayudarte con tu servicio de ${lead.service_type} cuando lo necesites.\n\n¿Te gustaría que agendemos una visita?\n\nPROMAN Services\n📞 6053-1213`;
            
            // Actualizar notes para marcar que fue reactivado
            await base44.asServiceRole.entities.ClientInquiry.update(lead.id, {
                notes: (lead.notes || '') + `\n[Auto] Mensaje de reactivación enviado ${new Date().toISOString()}`
            });
            
            results.push({
                inquiry_id: lead.id,
                customer: customerName,
                phone: customerPhone,
                days_since_last_activity: Math.floor((Date.now() - new Date(lead.updated_date || lead.created_date).getTime()) / (1000 * 60 * 60 * 24)),
                whatsapp_url: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
            });
        }
        
        return Response.json({
            success: true,
            total_reactivated: results.length,
            results: results
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});