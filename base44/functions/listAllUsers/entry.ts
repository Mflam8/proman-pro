import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden listar todos los usuarios
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener TODOS los usuarios usando filter sin límites
    const allUsers = await base44.asServiceRole.entities.User.filter({});
    
    console.log('🔍 Total usuarios encontrados:', allUsers.length);
    console.log('📋 Usuarios:', allUsers.map(u => ({ id: u.id, email: u.email, name: u.employee_name || u.full_name, type: u.employee_type })));

    return Response.json({ success: true, users: allUsers });
  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});