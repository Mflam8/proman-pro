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

    // Crear usuario directamente con service role (sin invitación)
    const newUser = await base44.asServiceRole.entities.User.create({
      email: emailToUse,
      full_name: employee_name,
      role: role || 'user',
      employee_name: employee_name,
      employee_type: employee_type || 'Empleado',
      hire_date: hire_date || null,
      profile_picture_url: profile_picture_url || null,
      onboarding_completed: true,
      is_verified: true
    });

    console.log('✅ Empleado creado exitosamente:', newUser.id, newUser.employee_name);

    return Response.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating employee:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});