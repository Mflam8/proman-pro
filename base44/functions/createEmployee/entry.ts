import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, employee_name, employee_type, role, hire_date, phone } = body;
    const normalizedEmail = email?.trim().toLowerCase();
    const employeeName = employee_name?.trim();
    const accessRole = role || 'user';

    if (!normalizedEmail) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    if (!employeeName) {
      return Response.json({ error: 'employee_name is required' }, { status: 400 });
    }

    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (existingUsers.length > 0) {
      const updatedUser = await base44.asServiceRole.entities.User.update(existingUsers[0].id, {
        employee_name: employeeName,
        employee_type: employee_type || 'Empleado',
        role: accessRole,
        hire_date: hire_date || null,
        phone: phone || null,
        onboarding_completed: true
      });

      return Response.json({ success: true, status: 'existing_updated', user: updatedUser });
    }

    await base44.users.inviteUser(normalizedEmail, accessRole);

    const invitedUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (invitedUsers.length === 0) {
      return Response.json({ error: 'User was invited but could not be loaded' }, { status: 500 });
    }

    const updatedUser = await base44.asServiceRole.entities.User.update(invitedUsers[0].id, {
      employee_name: employeeName,
      employee_type: employee_type || 'Empleado',
      role: accessRole,
      hire_date: hire_date || null,
      phone: phone || null,
      onboarding_completed: true
    });

    return Response.json({ success: true, status: 'invited', user: updatedUser });
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});