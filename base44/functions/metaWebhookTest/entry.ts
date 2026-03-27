Deno.serve(async (req) => {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    
    // Log todo lo que recibimos
    console.log('📥 Petición recibida:', {
        method: req.method,
        mode,
        token,
        challenge,
        headers: Object.fromEntries(req.headers)
    });
    
    if (req.method === 'GET' && mode === 'subscribe' && token === 'final2026') {
        console.log('✅ Respondiendo con challenge:', challenge);
        return new Response(challenge, { 
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
    
    return new Response('OK', { status: 200 });
});