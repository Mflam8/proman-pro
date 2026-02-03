import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden listar todos los usuarios
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener TODOS los usuarios sin filtros (usando list sin límite)
    let allUsers = [];
    let skip = 0;
    const batchSize = 100;
    
    // Paginar hasta obtener todos
    while (true) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', batchSize, skip);
      if (batch.length === 0) break;
      allUsers = allUsers.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }
    
    console.log('🔍 Total usuarios encontrados:', allUsers.length);
    console.log('📋 Usuarios:', allUsers.map(u => ({ id: u.id, email: u.email, name: u.employee_name || u.full_name, type: u.employee_type })));

    return Response.json({ success: true, users: allUsers });
  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});