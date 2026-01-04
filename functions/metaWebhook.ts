import { createClientFromRequest } from 'npm:@base44/sdk@0.8.8';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    // GET: Verificación del webhook
    if (req.method === 'GET') {
        const url = new URL(req.url);
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');
        
        const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
        
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ Webhook verificado correctamente');
            return new Response(challenge, { status: 200 });
        } else {
            console.log('❌ Token de verificación incorrecto');
            return new Response('Forbidden', { status: 403 });
        }
    }
    
    // POST: Recibir mensajes
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            console.log('📩 Webhook recibido:', JSON.stringify(body, null, 2));
            console.log('🔍 Body.object:', body.object);
            console.log('🔍 Entries:', body.entry?.length || 0);
            
            // Responder rápido a Meta (200 OK)
            const response = new Response('EVENT_RECEIVED', { status: 200 });
            
            // Procesar mensajes en segundo plano
            if (body.object === 'whatsapp_business_account') {
                console.log('✅ Es whatsapp_business_account');
                for (const entry of body.entry || []) {
                    console.log('🔄 Procesando entry:', entry.id);
                    for (const change of entry.changes || []) {
                        console.log('🔄 Change field:', change.field);
                        if (change.field === 'messages') {
                            const messages = change.value.messages || [];
                            console.log('📨 Mensajes encontrados:', messages.length);

                            for (const message of messages) {
                                console.log('💬 Procesando mensaje de:', message.from);
                                await processIncomingMessage(base44, message, change.value);
                            }
                        }
                    }
                }
            } else {
                console.log('❌ Body.object no es whatsapp_business_account:', body.object);
            }
            
            return response;
        } catch (error) {
            console.error('❌ Error procesando webhook:', error);
            return new Response('Error', { status: 500 });
        }
    }
    
    return new Response('Method not allowed', { status: 405 });
});

async function processIncomingMessage(base44, message, metadata) {
    try {
        const phoneNumber = message.from;
        const messageText = message.text?.body || '';
        const messageType = message.type;
        
        console.log(`📱 Mensaje de ${phoneNumber}: ${messageText}`);
        
        // Buscar o crear cliente
        let customer = await findOrCreateCustomer(base44, phoneNumber, metadata);
        
        // Buscar inquiry activo del cliente
        const activeInquiries = await base44.asServiceRole.entities.ClientInquiry.filter({
            customer_id: customer.id,
            status: { $in: ['nuevo', 'evaluacion_pendiente', 'cotizacion_pendiente'] }
        });
        
        let inquiry = activeInquiries[0];
        
        // Si no hay inquiry activo y hay mensaje, crear uno nuevo
        if (!inquiry && messageText) {
            inquiry = await base44.asServiceRole.entities.ClientInquiry.create({
                customer_id: customer.id,
                lead_source: 'whatsapp',
                message: messageText,
                status: 'nuevo',
                rubro: 'Hogar',
                priority: 'media'
            });
            console.log('✅ Nuevo lead creado desde WhatsApp');
        } else if (inquiry && messageText) {
            const updatedMessage = inquiry.message 
                ? `${inquiry.message}\n\n[${new Date().toLocaleString('es-SV')}] ${messageText}`
                : messageText;
            
            await base44.asServiceRole.entities.ClientInquiry.update(inquiry.id, {
                message: updatedMessage
            });
            console.log('✅ Mensaje agregado al inquiry existente');
        }
        
        // Guardar tipo de mensaje si no es texto
        if (messageType !== 'text' && inquiry) {
            const note = `Mensaje tipo ${messageType} recibido vía WhatsApp`;
            await base44.asServiceRole.entities.ClientInquiry.update(inquiry.id, {
                notes: inquiry.notes ? `${inquiry.notes}\n${note}` : note
            });
        }
        
        // NUEVO: Responder con el agente si hay mensaje de texto
        if (messageText) {
            await sendAgentResponse(base44, phoneNumber, customer, messageText);
        }
        
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
    }
}

async function sendAgentResponse(base44, phoneNumber, customer, messageText) {
    try {
        console.log('🤖 Iniciando respuesta del agente...');
        
        // Buscar conversación activa del agente para este cliente
        const conversations = await base44.asServiceRole.agents.listConversations({
            agent_name: 'base44_whatsapp_agent'
        });
        console.log('📋 Conversaciones encontradas:', conversations.length);
        
        let conversation = conversations.find(c => 
            c.metadata?.customer_id === customer.id || 
            c.metadata?.phone === phoneNumber
        );
        
        if (!conversation) {
            console.log('🆕 Creando nueva conversación...');
            conversation = await base44.asServiceRole.agents.createConversation({
                agent_name: 'base44_whatsapp_agent',
                metadata: {
                    customer_id: customer.id,
                    phone: phoneNumber,
                    customer_name: customer.full_name
                }
            });
            console.log('✅ Conversación creada:', conversation.id);
        } else {
            console.log('✅ Conversación existente encontrada:', conversation.id);
        }
        
        console.log('💬 Enviando mensaje al agente...');
        // Agregar mensaje del usuario usando la estructura correcta
        const response = await base44.asServiceRole.agents.addMessage(
            conversation,
            {
                role: 'user',
                content: messageText
            }
        );
        
        console.log('📥 Respuesta del agente recibida');
        console.log('📊 Total mensajes:', response?.messages?.length || 0);
        
        // La respuesta del agente viene en la conversación actualizada
        if (response && response.messages) {
            const lastMessage = response.messages[response.messages.length - 1];
            console.log('🔍 Último mensaje - role:', lastMessage?.role, '- tiene contenido:', !!lastMessage?.content);
            
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
                console.log('📤 Enviando respuesta por WhatsApp:', lastMessage.content.substring(0, 50) + '...');
                await sendWhatsAppMessage(phoneNumber, lastMessage.content);
                console.log('✅ Respuesta enviada correctamente');
            } else {
                console.log('⚠️ No se encontró respuesta del asistente');
                console.log('Últimos 3 mensajes:', response.messages.slice(-3).map(m => ({
                    role: m.role,
                    contentLength: m.content?.length || 0
                })));
            }
        } else {
            console.log('❌ Response no tiene mensajes');
        }
        
    } catch (error) {
        console.error('❌ Error con agente:', error.message);
        console.error('Stack:', error.stack);
        // Si falla el agente, enviar mensaje de respaldo
        await sendWhatsAppMessage(
            phoneNumber,
            '¡Gracias por contactarnos! Un agente revisará tu mensaje pronto. 🔧'
        );
    }
}

async function sendWhatsAppMessage(to, message) {
    const accessToken = Deno.env.get('META_WHATSAPP_TOKEN');
    const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID');
    
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: message }
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        console.error('❌ Error enviando mensaje WhatsApp:', data);
        throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
    }
    
    return data;
}

async function findOrCreateCustomer(base44, phoneNumber, metadata) {
    // Limpiar número de teléfono
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Buscar cliente existente
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({
        phone: { $regex: cleanPhone.slice(-8) } // Últimos 8 dígitos
    });
    
    if (existingCustomers.length > 0) {
        return existingCustomers[0];
    }
    
    // Crear nuevo cliente
    const profileName = metadata.contacts?.[0]?.profile?.name || 'Cliente WhatsApp';
    
    const newCustomer = await base44.asServiceRole.entities.Customer.create({
        full_name: profileName,
        phone: phoneNumber,
        status: 'nuevo',
        primary_rubro: 'Hogar',
        preferred_contact: 'whatsapp',
        notes: 'Cliente creado automáticamente desde WhatsApp'
    });
    
    console.log('✅ Nuevo cliente creado:', profileName);
    return newCustomer;
}