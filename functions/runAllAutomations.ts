import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const results = {
            timestamp: new Date().toISOString(),
            automations: []
        };
        
        // 1. Notificar clientes cuando técnico va en ruta
        try {
            const enRutaResponse = await base44.functions.invoke('notifyClientEnRuta', {});
            results.automations.push({
                name: 'notifyClientEnRuta',
                status: 'success',
                data: enRutaResponse.data
            });
        } catch (error) {
            results.automations.push({
                name: 'notifyClientEnRuta',
                status: 'error',
                error: error.message
            });
        }
        
        // 2. Marcar leads dormidos (sin respuesta en 24h)
        try {
            const dormantResponse = await base44.functions.invoke('markDormantLeads', {});
            results.automations.push({
                name: 'markDormantLeads',
                status: 'success',
                data: dormantResponse.data
            });
        } catch (error) {
            results.automations.push({
                name: 'markDormantLeads',
                status: 'error',
                error: error.message
            });
        }
        
        // 3. Enviar recordatorios de servicios agendados
        try {
            const remindersResponse = await base44.functions.invoke('sendScheduleReminders', {});
            results.automations.push({
                name: 'sendScheduleReminders',
                status: 'success',
                data: remindersResponse.data
            });
        } catch (error) {
            results.automations.push({
                name: 'sendScheduleReminders',
                status: 'error',
                error: error.message
            });
        }
        
        // 4. Enviar encuestas de satisfacción automáticas
        try {
            const feedbackResponse = await base44.functions.invoke('sendAutoFeedback', {});
            results.automations.push({
                name: 'sendAutoFeedback',
                status: 'success',
                data: feedbackResponse.data
            });
        } catch (error) {
            results.automations.push({
                name: 'sendAutoFeedback',
                status: 'error',
                error: error.message
            });
        }
        
        // 5. Reactivar leads dormidos (14-21 días)
        try {
            const reactivateResponse = await base44.functions.invoke('reactivateDormantLeads', {});
            results.automations.push({
                name: 'reactivateDormantLeads',
                status: 'success',
                data: reactivateResponse.data
            });
        } catch (error) {
            results.automations.push({
                name: 'reactivateDormantLeads',
                status: 'error',
                error: error.message
            });
        }
        
        // 6. Verificar alertas de técnicos (retrasos, sin confirmar, etc.)
        try {
            const alertsResponse = await base44.functions.invoke('checkTechnicianAlerts', {});
            results.automations.push({
                name: 'checkTechnicianAlerts',
                status: 'success',
                data: alertsResponse.data
            });
        } catch (error) {
            results.automations.push({
                name: 'checkTechnicianAlerts',
                status: 'error',
                error: error.message
            });
        }
        
        // Resumen
        const successCount = results.automations.filter(a => a.status === 'success').length;
        const errorCount = results.automations.filter(a => a.status === 'error').length;
        
        return Response.json({
            success: errorCount === 0,
            summary: {
                total: results.automations.length,
                successful: successCount,
                errors: errorCount
            },
            results: results
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});