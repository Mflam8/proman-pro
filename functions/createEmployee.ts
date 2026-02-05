import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar que el usuario esté autenticado como admin
    const user = await base44.auth.me();
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

    // Primero invitar al usuario para crear la cuenta
    await base44.asServiceRole.auth.inviteUser(emailToUse, role || 'user');
    
    // Esperar un momento para que se cree
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Buscar el usuario recién creado
    const users = await base44.asServiceRole.entities.User.filter({ email: emailToUse });
    const newUser = users[0];
    
    if (!newUser) {
      throw new Error('Usuario creado pero no encontrado');
    }

    // Actualizar con datos del empleado
    await base44.asServiceRole.entities.User.update(newUser.id, {
      employee_name: employee_name,
      employee_type: employee_type || 'Empleado',
      hire_date: hire_date || null,
      phone: phone || null,
      profile_picture_url: profile_picture_url || null,
      onboarding_completed: true
    });

    console.log('✅ Empleado creado exitosamente:', newUser.id, employee_name);

    return Response.json({ success: true, user: { ...newUser, employee_name } });
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});