import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden crear empleados
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, employee_name, employee_type, role, hire_date, phone, profile_picture_url } = body;

    if (!employee_name) {
      return Response.json({ error: 'employee_name is required' }, { status: 400 });
    }

    // Generar email único si no se proporciona
    const emailToUse = email?.trim() || `empleado_${Date.now()}@proman.internal`;

    // Crear usuario con el método oficial de Base44
    await base44.users.inviteUser(emailToUse, role || 'user');
    
    // Obtener el usuario recién creado
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1);
    const newUser = allUsers[0];
    
    // Actualizar con datos del empleado
    await base44.asServiceRole.entities.User.update(newUser.id, {
      employee_name: employee_name,
      employee_type: employee_type || 'Empleado',
      hire_date: hire_date || null,
      phone: phone || null,
      profile_picture_url: profile_picture_url || null,
      onboarding_completed: true
    });

    // Obtener el usuario actualizado
    const updatedUser = await base44.asServiceRole.entities.User.filter({ id: newUser.id });

    return Response.json({ success: true, user: updatedUser[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});