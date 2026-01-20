import { createClientFromRequest } from 'npm:@base44/sdk@0.8.8';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticación
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Obtener todos los servicios
        const services = await base44.asServiceRole.entities.Service.list();

        // Formatear el reporte
        const report = {
            generated_date: new Date().toISOString(),
            total_services: services.length,
            services_by_rubro: {},
            all_services: services.map(service => ({
                nombre: service.service_name,
                rubros: service.rubros,
                descripcion: service.description,
                complejidad: service.complexity_level,
                horas_estimadas: service.estimated_hours,
                precio_base: service.base_price || 'No definido',
                rango_precio: service.price_range_min && service.price_range_max 
                    ? `$${service.price_range_min} - $${service.price_range_max}`
                    : 'No definido',
                herramientas_necesarias: service.required_tools || [],
                caracteristicas: service.features || [],
                activo: service.is_active
            }))
        };

        // Agrupar por rubro
        const rubrosSet = new Set();
        services.forEach(service => {
            service.rubros?.forEach(rubro => rubrosSet.add(rubro));
        });

        rubrosSet.forEach(rubro => {
            report.services_by_rubro[rubro] = services
                .filter(s => s.rubros?.includes(rubro))
                .map(s => ({
                    nombre: s.service_name,
                    precio_base: s.base_price || 'No definido',
                    horas: s.estimated_hours,
                    complejidad: s.complexity_level
                }));
        });

        // Estadísticas
        report.statistics = {
            por_rubro: {},
            por_complejidad: {},
            precio_promedio: services.filter(s => s.base_price).length > 0
                ? (services.filter(s => s.base_price).reduce((sum, s) => sum + s.base_price, 0) / services.filter(s => s.base_price).length).toFixed(2)
                : 'N/A',
            horas_promedio: services.filter(s => s.estimated_hours).length > 0
                ? (services.filter(s => s.estimated_hours).reduce((sum, s) => sum + s.estimated_hours, 0) / services.filter(s => s.estimated_hours).length).toFixed(2)
                : 'N/A'
        };

        rubrosSet.forEach(rubro => {
            report.statistics.por_rubro[rubro] = services.filter(s => s.rubros?.includes(rubro)).length;
        });

        ['basico', 'medio', 'complejo', 'experto'].forEach(nivel => {
            report.statistics.por_complejidad[nivel] = services.filter(s => s.complexity_level === nivel).length;
        });

        return Response.json({
            success: true,
            report: report,
            formatted_text: formatForChatGPT(report)
        });

    } catch (error) {
        console.error('Error generating services report:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function formatForChatGPT(report) {
    let text = `REPORTE DE SERVICIOS PROMAN\n`;
    text += `Generado: ${new Date(report.generated_date).toLocaleString('es-SV')}\n`;
    text += `Total de servicios: ${report.total_services}\n\n`;
    
    text += `ESTADÍSTICAS GENERALES:\n`;
    text += `- Precio promedio: $${report.statistics.precio_promedio}\n`;
    text += `- Horas promedio: ${report.statistics.horas_promedio}h\n\n`;
    
    text += `SERVICIOS POR RUBRO:\n`;
    Object.entries(report.services_by_rubro).forEach(([rubro, servicios]) => {
        text += `\n${rubro.toUpperCase()} (${servicios.length} servicios):\n`;
        servicios.forEach(s => {
            text += `  - ${s.nombre}: $${s.precio_base} | ${s.horas}h | ${s.complejidad}\n`;
        });
    });
    
    text += `\n\nDETALLE COMPLETO DE SERVICIOS:\n`;
    report.all_services.forEach((s, idx) => {
        text += `\n${idx + 1}. ${s.nombre}\n`;
        text += `   Rubros: ${s.rubros.join(', ')}\n`;
        text += `   Descripción: ${s.descripcion}\n`;
        text += `   Complejidad: ${s.complejidad}\n`;
        text += `   Precio base: $${s.precio_base}\n`;
        text += `   Rango: ${s.rango_precio}\n`;
        text += `   Horas estimadas: ${s.horas_estimadas}h\n`;
        if (s.caracteristicas.length > 0) {
            text += `   Características: ${s.caracteristicas.join(', ')}\n`;
        }
    });
    
    return text;
}