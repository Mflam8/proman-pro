import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden listar todos los usuarios
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Listar TODOS los usuarios con service role
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date');

    return Response.json({ success: true, users: allUsers });
  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});