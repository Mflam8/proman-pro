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
        
        // Obtener historial de conversación (últimos 10 mensajes)
        const conversationHistory = customer.whatsapp_conversation || [];
        
        // Agregar mensaje del cliente al historial
        conversationHistory.push({
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString()
        });
        
        // Construir contexto para el LLM
        const conversationContext = conversationHistory
            .slice(-10) // Últimos 10 mensajes
            .map(msg => `${msg.role === 'user' ? 'Cliente' : 'Asistente'}: ${msg.content}`)
            .join('\n');
        
        // Prompt para el LLM
        const systemPrompt = `Eres un asistente de atención al cliente de PROMAN Services, empresa de fontanería, electricidad y construcción en El Salvador.

Cliente: ${customer.full_name}
Teléfono: ${phoneNumber}

Conversación anterior:
${conversationContext}

Instrucciones:
1. Responde de forma amable y profesional al cliente
2. Si el cliente solicita un servicio y proporciona suficiente información (tipo de servicio, ubicación, descripción), responde con un JSON en este formato:
{
  "response": "tu respuesta al cliente",
  "create_inquiry": true,
  "inquiry_data": {
    "rubro": "Hogar|Comercial|Restaurantes|Hospitales|Emergencias",
    "service_type": "tipo de servicio",
    "location": "departamento",
    "address": "dirección si la dio",
    "message": "descripción del problema",
    "lead_source": "whatsapp"
  }
}

3. Si falta información, pregunta lo necesario y responde con:
{
  "response": "tu pregunta al cliente",
  "create_inquiry": false
}

Departamentos válidos: San Salvador, La Libertad, Santa Ana, Sonsonate, Ahuachapán, Chalatenango, Cuscatlán, La Paz, Cabañas, San Vicente, Usulután, San Miguel, Morazán, La Unión.

Responde SOLO con el JSON, sin texto adicional.`;

        // Llamar al LLM
        console.log('🤖 Consultando LLM...');
        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: systemPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    response: { type: "string" },
                    create_inquiry: { type: "boolean" },
                    inquiry_data: {
                        type: "object",
                        properties: {
                            rubro: { type: "string" },
                            service_type: { type: "string" },
                            location: { type: "string" },
                            address: { type: "string" },
                            message: { type: "string" },
                            lead_source: { type: "string" }
                        }
                    }
                }
            }
        });
        
        console.log('📝 Respuesta del LLM:', JSON.stringify(llmResponse));
        
        // Agregar respuesta del asistente al historial
        conversationHistory.push({
            role: 'assistant',
            content: llmResponse.response,
            timestamp: new Date().toISOString()
        });
        
        // Guardar historial actualizado
        await base44.asServiceRole.entities.Customer.update(customer.id, {
            whatsapp_conversation: conversationHistory
        });
        
        // Crear inquiry si el LLM lo indica
        if (llmResponse.create_inquiry && llmResponse.inquiry_data) {
            try {
                const inquiry = await base44.asServiceRole.entities.ClientInquiry.create({
                    customer_id: customer.id,
                    client_name: customer.full_name,
                    phone: phoneNumber,
                    ...llmResponse.inquiry_data,
                    status: 'nuevo',
                    priority: 'media'
                });
                console.log('✅ ClientInquiry creado:', inquiry.id);
            } catch (error) {
                console.error('❌ Error creando inquiry:', error);
            }
        }
        
        // Enviar respuesta por WhatsApp
        await sendWhatsAppMessage(phoneNumber, llmResponse.response);
        console.log('✅ Respuesta enviada por WhatsApp');
        
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
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