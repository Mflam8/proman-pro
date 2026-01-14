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
            return new Response(challenge, { status: 200 });
        } else {
            return new Response('Forbidden', { status: 403 });
        }
    }
    
    // POST: Recibir mensajes
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            
            // Responder inmediatamente a Meta
            setTimeout(() => {
                if (body.object === 'whatsapp_business_account') {
                    for (const entry of body.entry || []) {
                        for (const change of entry.changes || []) {
                            if (change.field === 'messages' && change.value.messages) {
                                for (const message of messages) {
                                    handleMessage(base44, message, change.value).catch(console.error);
                                }
                            }
                        }
                    }
                }
            }, 0);
            
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
        
        // Prompt
        const context = history.slice(-10).map(m => 
            `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`
        ).join('\n');
        
        const prompt = `Eres asistente de PROMAN Services (fontanería/construcción en El Salvador).

Cliente: ${customer.full_name}
Tel: ${phoneNumber}

Conversación:
${context}

INSTRUCCIONES:
1. Responde amable y profesional
2. Si cliente pide servicio con info completa (tipo, ubicación, descripción), devuelve:
{
  "response": "tu mensaje",
  "create_inquiry": true,
  "inquiry_data": {
    "rubro": "Hogar|Comercial|Restaurantes|Hospitales|Emergencias",
    "service_type": "descripción",
    "location": "departamento",
    "address": "dirección si la dio",
    "message": "problema",
    "lead_source": "whatsapp"
  }
}

3. Si falta info, pregunta:
{
  "response": "tu pregunta",
  "create_inquiry": false
}

Departamentos: San Salvador, La Libertad, Santa Ana, Sonsonate, Ahuachapán, Chalatenango, Cuscatlán, La Paz, Cabañas, San Vicente, Usulután, San Miguel, Morazán, La Unión.

RESPONDE SOLO JSON.`;

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
        
        console.log('🤖 LLM:', JSON.stringify(result));
        
        // Guardar respuesta
        history.push({
            role: 'assistant',
            content: result.response,
            timestamp: new Date().toISOString()
        });
        
        await base44.asServiceRole.entities.Customer.update(customer.id, {
            whatsapp_conversation: history
        });
        
        // Crear inquiry
        if (result.create_inquiry && result.inquiry_data) {
            await base44.asServiceRole.entities.ClientInquiry.create({
                customer_id: customer.id,
                client_name: customer.full_name,
                phone: phoneNumber,
                ...result.inquiry_data,
                status: 'nuevo',
                priority: 'media'
            });
            console.log('✅ Inquiry creado');
        }
        
        // Enviar WhatsApp
        await sendWhatsApp(phoneNumber, result.response);
        console.log('✅ Enviado');
        
    } catch (error) {
        console.error('❌ Error:', error);
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
    
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function getOrCreateCustomer(base44, phone, metadata) {
    const clean = phone.replace(/\D/g, '');
    
    const existing = await base44.asServiceRole.entities.Customer.filter({
        phone: { $regex: clean.slice(-8) }
    });
    
    if (existing.length > 0) return existing[0];
    
    const name = metadata.contacts?.[0]?.profile?.name || 'Cliente WhatsApp';
    
    return await base44.asServiceRole.entities.Customer.create({
        full_name: name,
        phone,
        status: 'nuevo',
        primary_rubro: 'Hogar',
        preferred_contact: 'whatsapp',
        notes: 'Desde WhatsApp'
    });
}