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

        const prompt = `Eres asistente inteligente de PROMAN Services (fontanería, electricidad, construcción El Salvador).

INFORMACIÓN ACTUAL:
Cliente: ${customer.full_name}
Tel: ${phoneNumber}
Email: ${customer.email || 'no registrado'}
Direcciones: ${JSON.stringify(customer.addresses || [])}

Conversación:
${context}

TU TRABAJO:
1. Recopilar información completa del cliente y trabajo
2. Crear/actualizar datos del cliente
3. Crear solicitudes de trabajo con todos los detalles
4. Si el cliente da información de presupuesto (materiales, cantidades, precios), crear items de cotización

RESPONDE EN FORMATO JSON:
{
  "response": "tu mensaje amable al cliente",
  "update_customer": true/false,
  "customer_data": {
    "full_name": "nombre completo si lo dio",
    "fiscal_name": "razón social si lo mencionó",
    "nit": "NIT si lo dio",
    "email": "email si lo dio",
    "addresses": [
      {
        "label": "Casa|Oficina|Negocio",
        "address": "dirección completa",
        "location": "departamento",
        "reference": "referencias de ubicación",
        "is_primary": true
      }
    ],
    "customer_type": "residencial|comercial|corporativo",
    "notes": "cualquier nota relevante"
  },
  "create_inquiry": true/false,
  "inquiry_data": {
    "rubro": "Hogar|Comercial|Restaurantes|Hospitales|Emergencias",
    "service_type": "tipo de servicio específico",
    "location": "departamento",
    "location_name": "nombre del lugar si lo dio (ej: Cuartel General)",
    "address": "dirección específica",
    "message": "descripción completa del trabajo",
    "priority": "baja|media|alta|urgente",
    "scheduled_date": "YYYY-MM-DD si mencionó fecha",
    "preferred_time": "horario preferido si lo dijo",
    "lead_source": "whatsapp"
  },
  "create_quote_items": true/false,
  "quote_items": [
    {
      "opcion_numero": 1,
      "opcion_titulo": "título de la opción de cotización",
      "tipo_item": "servicio|material|transporte|mano_de_obra",
      "descripcion": "descripción corta",
      "descripcion_detallada": "descripción detallada del trabajo",
      "cantidad": 1,
      "unidad_medida": "unidad|m2|ml|hora|dia|global",
      "precio_unitario": 0,
      "incluir_iva": false,
      "orden": 1
    }
  ]
}

DEPARTAMENTOS VÁLIDOS: San Salvador, La Libertad, Santa Ana, Sonsonate, Ahuachapán, Chalatenango, Cuscatlán, La Paz, Cabañas, San Vicente, Usulután, San Miguel, Morazán, La Unión.

EJEMPLOS DE USO:
- Cliente: "Hola, soy Juan Pérez de la empresa ABC, necesito reparar fontanería en mi oficina"
  → update_customer=true con full_name, fiscal_name, customer_type=comercial

- Cliente: "Necesito impermeabilizar 50m2 de techo, cuánto cuesta?"
  → create_inquiry=true + create_quote_items=true con item de impermeabilización

- Cliente: "Mi dirección es Col. Escalón, casa #123, San Salvador"
  → update_customer=true agregando address

RESPONDE SOLO JSON, NADA MÁS.`;

        // LLM
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    response: { type: "string" },
                    update_customer: { type: "boolean" },
                    customer_data: {
                        type: "object",
                        properties: {
                            full_name: { type: "string" },
                            fiscal_name: { type: "string" },
                            nit: { type: "string" },
                            email: { type: "string" },
                            addresses: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        label: { type: "string" },
                                        address: { type: "string" },
                                        location: { type: "string" },
                                        reference: { type: "string" },
                                        is_primary: { type: "boolean" }
                                    }
                                }
                            },
                            customer_type: { type: "string" },
                            notes: { type: "string" }
                        }
                    },
                    create_inquiry: { type: "boolean" },
                    inquiry_data: {
                        type: "object",
                        properties: {
                            rubro: { type: "string" },
                            service_type: { type: "string" },
                            location: { type: "string" },
                            location_name: { type: "string" },
                            address: { type: "string" },
                            message: { type: "string" },
                            priority: { type: "string" },
                            scheduled_date: { type: "string" },
                            preferred_time: { type: "string" },
                            lead_source: { type: "string" }
                        }
                    },
                    create_quote_items: { type: "boolean" },
                    quote_items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                opcion_numero: { type: "number" },
                                opcion_titulo: { type: "string" },
                                tipo_item: { type: "string" },
                                descripcion: { type: "string" },
                                descripcion_detallada: { type: "string" },
                                cantidad: { type: "number" },
                                unidad_medida: { type: "string" },
                                precio_unitario: { type: "number" },
                                incluir_iva: { type: "boolean" },
                                orden: { type: "number" }
                            }
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

        // Actualizar cliente si hay datos nuevos
        const updateData = { whatsapp_conversation: history };
        if (result.update_customer && result.customer_data) {
            const custData = result.customer_data;
            if (custData.full_name) updateData.full_name = custData.full_name;
            if (custData.fiscal_name) updateData.fiscal_name = custData.fiscal_name;
            if (custData.nit) updateData.nit = custData.nit;
            if (custData.email) updateData.email = custData.email;
            if (custData.customer_type) updateData.customer_type = custData.customer_type;
            if (custData.notes) updateData.notes = custData.notes;
            if (custData.addresses && custData.addresses.length > 0) {
                updateData.addresses = custData.addresses;
            }
            console.log('✅ Actualizando datos del cliente');
        }

        await base44.asServiceRole.entities.Customer.update(customer.id, updateData);

        // Crear inquiry si corresponde
        let inquiryId = null;
        if (result.create_inquiry && result.inquiry_data) {
            const newInquiry = await base44.asServiceRole.entities.ClientInquiry.create({
                customer_id: customer.id,
                client_name: customer.full_name,
                phone: phoneNumber,
                ...result.inquiry_data,
                status: 'nuevo',
                priority: result.inquiry_data.priority || 'media'
            });
            inquiryId = newInquiry.id;
            console.log('✅ ClientInquiry creado:', inquiryId);
        }

        // Crear items de cotización si se proporcionaron
        if (result.create_quote_items && result.quote_items && inquiryId) {
            for (const item of result.quote_items) {
                const montoTotal = (item.cantidad || 1) * (item.precio_unitario || 0);
                await base44.asServiceRole.entities.DetalleFacturaTrabajo.create({
                    inquiry_id: inquiryId,
                    opcion_numero: item.opcion_numero || 1,
                    opcion_titulo: item.opcion_titulo || 'Cotización',
                    tipo_item: item.tipo_item || 'servicio',
                    descripcion: item.descripcion,
                    descripcion_detallada: item.descripcion_detallada,
                    cantidad: item.cantidad || 1,
                    unidad_medida: item.unidad_medida || 'unidad',
                    precio_unitario: item.precio_unitario || 0,
                    monto_total_item: montoTotal,
                    incluir_iva: item.incluir_iva || false,
                    es_cotizacion: true,
                    orden: item.orden || 0
                });
            }
            console.log(`✅ ${result.quote_items.length} items de cotización creados`);
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