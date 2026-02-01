import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { related_id } = await req.json();

    if (!related_id) {
      return Response.json({ 
        text: "❌ Error: No tienes ID de empleado asociado en el sistema." 
      }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Buscar trabajos asignados para HOY
    const allJobs = await base44.asServiceRole.entities.ClientInquiry.filter({
      assigned_to: related_id,
      scheduled_date: today
    });

    // Filtrar solo trabajos activos
    const activeJobs = allJobs.filter(j => 
      j.status !== 'completado' && 
      j.status !== 'cancelado' && 
      j.status !== 'cerrado'
    );

    if (!activeJobs || activeJobs.length === 0) {
      return Response.json({ 
        text: "🎉 No tienes trabajos agendados para hoy (o ya los terminaste)." 
      });
    }

    // Obtener información de clientes
    const customerIds = [...new Set(activeJobs.map(j => j.customer_id).filter(Boolean))];
    const customers = await base44.asServiceRole.entities.Customer.filter({
      id: { $in: customerIds }
    });

    let message = `📅 *TU RUTA DE HOY (${today})*\n\n`;
    message += `Total: ${activeJobs.length} ${activeJobs.length === 1 ? 'trabajo' : 'trabajos'}\n\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    for (const [index, job] of activeJobs.entries()) {
      const customer = customers.find(c => c.id === job.customer_id);
      const clientName = customer?.full_name || job.client_name || 'Cliente';
      const clientPhone = customer?.phone || job.phone || 'N/A';
      
      message += `🔧 *Trabajo #${index + 1}*\n`;
      message += `👤 Cliente: ${clientName}\n`;
      message += `📱 Teléfono: ${clientPhone}\n`;
      message += `📍 Ubicación: ${job.location_name || job.location || 'N/A'}\n`;
      
      if (job.address) {
        message += `🏠 Dirección: ${job.address}\n`;
      }
      
      if (job.scheduled_start_time) {
        message += `⏰ Hora: ${job.scheduled_start_time}\n`;
      }
      
      if (job.estimated_duration_hours) {
        message += `⏱️ Duración estimada: ${job.estimated_duration_hours}h\n`;
      }
      
      message += `📝 Servicio: ${job.service_type || job.rubro}\n`;
      
      const finalAmount = job.final_amount || job.quote_amount;
      if (finalAmount) {
        message += `💰 Cobrar: $${finalAmount}\n`;
      }
      
      if (job.message) {
        message += `📋 Detalles: ${job.message.substring(0, 100)}...\n`;
      }
      
      message += `\n━━━━━━━━━━━━━━━━\n\n`;
    }

    message += `✅ *Recuerda:* Tomar fotos antes/después y reportar avances.`;

    return Response.json({ text: message });

  } catch (error) {
    console.error("Error obteniendo agenda:", error);
    return Response.json({ 
      text: "❌ Error obteniendo tu agenda. Contacta a soporte." 
    }, { status: 500 });
  }
});