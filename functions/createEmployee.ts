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

    console.log('🔄 Creando empleado:', employee_name, 'con email:', emailToUse);

    // Crear usuario usando inviteUser (forma correcta)
    await base44.asServiceRole.users.inviteUser(emailToUse, role || 'user');
    
    // Esperar un momento para que el usuario se cree
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Buscar el usuario recién creado
    const users = await base44.asServiceRole.entities.User.filter({ email: emailToUse });
    const newUser = users[0];
    
    if (!newUser) {
      throw new Error('Usuario creado pero no encontrado');
    }

    // Actualizar con los datos del empleado
    await base44.asServiceRole.entities.User.update(newUser.id, {
      employee_name: employee_name,
      employee_type: employee_type || 'Empleado',
      hire_date: hire_date || null,
      profile_picture_url: profile_picture_url || null,
      onboarding_completed: true
    });

    console.log('✅ Empleado creado exitosamente:', newUser.id, employee_name);

    return Response.json({ success: true, user: { ...newUser, employee_name } });
  } catch (error) {
    console.error('Error creating employee:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});