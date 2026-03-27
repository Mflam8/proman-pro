import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const accessToken = Deno.env.get('META_WHATSAPP_TOKEN');
        const whatsappBusinessAccountId = '1559594938241932'; // Tu WABA ID
        
        if (!accessToken) {
            return Response.json({ 
                error: 'META_WHATSAPP_TOKEN no configurado' 
            }, { status: 500 });
        }

        // Primero verificar si ya estamos suscritos
        const checkUrl = `https://graph.facebook.com/v21.0/${whatsappBusinessAccountId}/subscribed_apps`;
        const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const checkData = await checkResponse.json();
        console.log('📋 Apps suscritas actualmente:', checkData);

        // Suscribir la app a webhooks con los campos específicos
        const subscribeUrl = `https://graph.facebook.com/v21.0/${whatsappBusinessAccountId}/subscribed_apps`;
        
        const subscribeResponse = await fetch(subscribeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const subscribeData = await subscribeResponse.json();
        
        console.log('✅ Respuesta de suscripción:', subscribeData);

        if (subscribeData.success) {
            return Response.json({ 
                success: true,
                message: 'App suscrita exitosamente a webhooks',
                previousSubscriptions: checkData,
                data: subscribeData
            });
        } else {
            return Response.json({ 
                success: false,
                message: 'Error al suscribir',
                previousSubscriptions: checkData,
                error: subscribeData
            }, { status: 400 });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});