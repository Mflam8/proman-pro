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
                            // Guard clause: Solo procesar si hay mensajes reales
                            if (!change.value.messages) {
                                console.log('⏭️ Status/event ignorado');
                                continue;
                            }
                            
                            const messages = change.value.messages;
                            console.log('📨 Mensajes reales encontrados:', messages.length);

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
        
        // Solo procesar mensajes de texto
        if (messageType !== 'text' || !messageText) {
            console.log('⏭️ Tipo de mensaje no soportado, ignorando');
            return;
        }
        
        // Buscar o crear cliente
        let customer = await findOrCreateCustomer(base44, phoneNumber, metadata);
        
        // Guardar mensaje en notas del cliente
        const timestamp = new Date().toLocaleString('es-SV');
        const newNote = `[${timestamp}] WhatsApp: ${messageText}`;
        const updatedNotes = customer.notes ? `${customer.notes}\n${newNote}` : newNote;
        await base44.asServiceRole.entities.Customer.update(customer.id, {
            notes: updatedNotes
        });
        
        // Buscar o crear conversación con el agente
        const conversations = await base44.agents.listConversations({
            agent_name: 'whatsappAssistant'
        });
        
        let conversation = conversations.find(c => 
            c.metadata?.phone_number === phoneNumber
        );
        
        if (!conversation) {
            conversation = await base44.agents.createConversation({
                agent_name: 'whatsappAssistant',
                metadata: {
                    phone_number: phoneNumber,
                    customer_id: customer.id,
                    customer_name: customer.full_name
                }
            });
            console.log('✅ Nueva conversación creada con el agente');
        }
        
        // Enviar mensaje al agente y obtener respuesta
        console.log('🤖 Enviando mensaje al agente...');
        const response = await base44.agents.addMessage(conversation.id, {
            role: 'user',
            content: messageText
        });
        
        // Esperar a que el agente responda completamente
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Obtener la respuesta del agente
        const updatedConversation = await base44.agents.getConversation(conversation.id);
        const messages = updatedConversation.messages || [];
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
            // Enviar respuesta por WhatsApp
            await sendWhatsAppMessage(phoneNumber, lastMessage.content);
            console.log('✅ Respuesta enviada por WhatsApp');
        }
        
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        // Enviar mensaje de error al usuario
        try {
            await sendWhatsAppMessage(
                message.from,
                'Disculpa, hubo un error procesando tu mensaje. Por favor intenta de nuevo o llámanos al 6053-1213.'
            );
        } catch (sendError) {
            console.error('❌ Error enviando mensaje de error:', sendError);
        }
    }
}

async function sendWhatsAppMessage(to, text) {
    const token = Deno.env.get('META_WHATSAPP_TOKEN');
    const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID');
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: text }
        })
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error enviando WhatsApp: ${error}`);
    }
    
    return response.json();
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