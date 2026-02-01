import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { phone_number } = await req.json();

    if (!phone_number) {
      return Response.json({ error: "Falta phone_number" }, { status: 400 });
    }

    // 1. Buscar en el Directorio de Confianza
    const trustedUsers = await base44.asServiceRole.entities.TrustedDirectory.filter({
      phone_number: phone_number,
      active: true
    });

    // CASO A: Es alguien conocido (CEO, Técnico, Corporativo, Admin)
    if (trustedUsers && trustedUsers.length > 0) {
      const user = trustedUsers[0];
      return Response.json({
        identified: true,
        role: user.role,
        name: user.name,
        related_id: user.related_id
      });
    }

    // CASO B: No está en directorio -> Buscar en Clientes Existentes
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({
      phone: phone_number
    });

    if (existingCustomers && existingCustomers.length > 0) {
      const customer = existingCustomers[0];
      
      // Si es cliente corporativo pero no está en TrustedDirectory
      if (customer.customer_type === 'corporativo' || customer.customer_type === 'comercial') {
        return Response.json({
          identified: true,
          role: 'corporate',
          name: customer.full_name,
          related_id: customer.id
        });
      }
      
      // Cliente residencial recurrente
      return Response.json({
        identified: true,
        role: 'customer_recurring',
        name: customer.full_name,
        related_id: customer.id
      });
    }

    // CASO C: Totalmente Nuevo (Lead)
    return Response.json({
      identified: false,
      role: 'lead_new',
      name: 'Desconocido'
    });

  } catch (error) {
    console.error("Error en router:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});