import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const accessToken = Deno.env.get('META_WHATSAPP_TOKEN');
        const appId = Deno.env.get('META_APP_ID');
        
        if (!accessToken) {
            return Response.json({ 
                error: 'META_WHATSAPP_TOKEN no configurado' 
            }, { status: 500 });
        }

        // Verificar información del token
        const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
        
        const debugResponse = await fetch(debugUrl);
        const debugData = await debugResponse.json();
        
        console.log('📊 Debug token:', debugData);

        return Response.json({ 
            success: true,
            tokenInfo: debugData.data,
            recommendations: generateRecommendations(debugData.data)
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});

function generateRecommendations(tokenData) {
    const recommendations = [];
    
    if (!tokenData.is_valid) {
        recommendations.push('⚠️ El token NO es válido. Genera uno nuevo.');
    }
    
    if (tokenData.expires_at && tokenData.expires_at < Date.now() / 1000) {
        recommendations.push('⚠️ El token ha expirado. Genera uno nuevo.');
    }
    
    const requiredScopes = [
        'whatsapp_business_messaging',
        'whatsapp_business_management'
    ];
    
    const currentScopes = tokenData.scopes || [];
    const missingScopes = requiredScopes.filter(s => !currentScopes.includes(s));
    
    if (missingScopes.length > 0) {
        recommendations.push(`❌ Permisos faltantes: ${missingScopes.join(', ')}`);
        recommendations.push('💡 Debes regenerar el token con estos permisos en Meta Business Suite.');
    }
    
    if (missingScopes.length === 0) {
        recommendations.push('✅ El token tiene todos los permisos necesarios.');
    }
    
    return recommendations;
}