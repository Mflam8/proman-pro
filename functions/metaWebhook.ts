import { createClientFromRequest } from 'npm:@base44/sdk@0.8.8';

Deno.serve(async (req) => {
    // GET: Verificación del webhook (sin autenticación de Base44)
    if (req.method === 'GET') {
        const url = new URL(req.url);
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');
        
        const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
        
        console.log('🔐 Verificación webhook:', { mode, token, verifyToken, challenge });
        
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ Verificación exitosa');
            return new Response(challenge, { 
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        } else {
            console.log('❌ Verificación fallida');
            return new Response('Forbidden', { status: 403 });
        }
    }
    
    const base44 = createClientFromRequest(req);
    
    // POST: Recibir mensajes
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            
            // Procesar en background
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry || []) {
                    for (const change of entry.changes || []) {
                        if (change.field === 'messages' && change.value.messages) {
                            const messages = change.value.messages;
                            for (const message of messages) {
                                handleMessage(base44, message, change.value).catch(err => {
                                    console.error('Error procesando:', err);
                                });
                            }
                        }
                    }
                }
            }
            
            return new Response('EVENT_RECEIVED', { status: 200 });
        } catch (error) {
            console.error('Error webhook:', error);
            return new Response('Error', { status: 500 });
        }
    }
    
    return new Response('Method not allowed', { status: 405 });
});

async function handleMessage(base44, message, metadata) {
    try {
        const phoneNumber = message.from;
        const messageText = message.text?.body;
        
        if (!messageText || message.type !== 'text') return;
        
        console.log(`📱 ${phoneNumber}: ${messageText}`);
        
        // Buscar/crear cliente
        const customer = await getOrCreateCustomer(base44, phoneNumber, metadata);
        
        // Historial
        const history = customer.whatsapp_conversation || [];
        history.push({
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString()
        });
        
        // Contexto
        const context = history.slice(-10).map(m => 
            `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`
        ).join('\n');
        
        const prompt = `Eres asistente de PROMAN Services (fontanería/construcción El Salvador).

Cliente: ${customer.full_name}
Tel: ${phoneNumber}

Conversación:
${context}

INSTRUCCIONES:
- Responde amable y profesional
- Si cliente pide servicio con info completa (tipo, ubicación, descripción):
{
  "response": "tu mensaje confirmando que se creó la solicitud",
  "create_inquiry": true,
  "inquiry_data": {
    "rubro": "Hogar|Comercial|Restaurantes|Hospitales|Emergencias",
    "service_type": "descripción del servicio",
    "location": "departamento",
    "address": "dirección completa si la dio",
    "message": "descripción del problema",
    "lead_source": "whatsapp"
  }
}

- Si falta info:
{
  "response": "tu pregunta amable",
  "create_inquiry": false
}

Departamentos válidos: San Salvador, La Libertad, Santa Ana, Sonsonate, Ahuachapán, Chalatenango, Cuscatlán, La Paz, Cabañas, San Vicente, Usulután, San Miguel, Morazán, La Unión.

RESPONDE SOLO JSON, NADA MÁS.`;

        // LLM
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
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
        
        console.log('🤖 Respuesta LLM:', JSON.stringify(result));
        
        // Guardar respuesta
        history.push({
            role: 'assistant',
            content: result.response,
            timestamp: new Date().toISOString()
        });
        
        await base44.asServiceRole.entities.Customer.update(customer.id, {
            whatsapp_conversation: history
        });
        
        // Crear inquiry si corresponde
        if (result.create_inquiry && result.inquiry_data) {
            await base44.asServiceRole.entities.ClientInquiry.create({
                customer_id: customer.id,
                client_name: customer.full_name,
                phone: phoneNumber,
                ...result.inquiry_data,
                status: 'nuevo',
                priority: 'media'
            });
            console.log('✅ ClientInquiry creado');
        }
        
        // Enviar respuesta por WhatsApp
        await sendWhatsApp(phoneNumber, result.response);
        console.log('✅ Mensaje enviado a WhatsApp');
        
    } catch (error) {
        console.error('❌ Error en handleMessage:', error);
        try {
            await sendWhatsApp(message.from, 'Disculpa, hubo un error. Por favor llámanos al 6053-1213.');
        } catch (e) {
            console.error('Error enviando mensaje de error:', e);
        }
    }
}

async function sendWhatsApp(to, text) {
    const token = Deno.env.get('META_WHATSAPP_TOKEN');
    const phoneId = Deno.env.get('META_PHONE_NUMBER_ID');
    
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text }
        })
    });
    
    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Error WhatsApp API: ${error}`);
    }
    
    return res.json();
}

async function getOrCreateCustomer(base44, phone, metadata) {
    const clean = phone.replace(/\D/g, '');
    
    const existing = await base44.asServiceRole.entities.Customer.filter({
        phone: { $regex: clean.slice(-8) }
    });
    
    if (existing.length > 0) {
        console.log('✅ Cliente existente encontrado');
        return existing[0];
    }
    
    const name = metadata.contacts?.[0]?.profile?.name || 'Cliente WhatsApp';
    
    const newCustomer = await base44.asServiceRole.entities.Customer.create({
        full_name: name,
        phone,
        status: 'nuevo',
        primary_rubro: 'Hogar',
        preferred_contact: 'whatsapp',
        notes: 'Cliente creado automáticamente desde WhatsApp'
    });
    
    console.log('✅ Nuevo cliente creado:', name);
    return newCustomer;
}