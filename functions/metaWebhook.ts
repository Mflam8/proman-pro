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
        
        // Solo guardar el mensaje en las notas del cliente
        if (messageText) {
            const timestamp = new Date().toLocaleString('es-SV');
            const newNote = `[${timestamp}] WhatsApp: ${messageText}`;
            const updatedNotes = customer.notes ? `${customer.notes}\n${newNote}` : newNote;
            
            await base44.asServiceRole.entities.Customer.update(customer.id, {
                notes: updatedNotes
            });
            console.log('✅ Mensaje guardado en notas del cliente');
        }
        
        // Si es tipo no-texto, también registrarlo
        if (messageType !== 'text') {
            const timestamp = new Date().toLocaleString('es-SV');
            const note = `[${timestamp}] WhatsApp: Archivo tipo ${messageType} recibido`;
            const updatedNotes = customer.notes ? `${customer.notes}\n${note}` : note;
            
            await base44.asServiceRole.entities.Customer.update(customer.id, {
                notes: updatedNotes
            });
        }
        
        // ⏸️ BOT COMPLETAMENTE PAUSADO - No se envían respuestas automáticas
        console.log('⏸️ Bot pausado - solo guardado en cliente, sin crear trabajo');
        
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
    }
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