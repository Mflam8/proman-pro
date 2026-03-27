import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Catálogo a sincronizar (upsert por service_name)
const CATALOG = [
  {
    area: 'fontaneria',
    service_name: 'Destapado de Tuberias - ducha',
    description: 'Se utiliza un equipo especial',
    rubros: ['Hogar', 'Comercial'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 80 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Identificación de fuga con Geófono',
    description: 'Detectamos la fuga con un geófono; técnico especializado identifica el punto de fuga y se cotiza la reparación.',
    rubros: ['Hogar', 'Comercial'],
    tipo_precio: 'fijo',
    notas_servicio: 'Protocolo A: Preguntas previas: ¿Hay algún punto de humedad?, ¿medidor gira con llaves cerradas?, ¿se activa la cisterna con llaves cerradas? Si no hay fuga o es un inodoro botando agua, solo se cobra visita técnica $45.00.',
    distance_pricing: [
      { km: 10, price: 125 },
      { km: 35, price: 145 },
      { km: 70, price: 165 },
      { km: 115, price: 185 },
      { km: 175, price: 205 },
    ],
  },
  {
    area: 'cisternas',
    service_name: 'Limpieza de cisterna',
    rubros: ['Hogar', 'Comercial', 'Restaurantes', 'Hospitales'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 65 },
      { km: 35, price: 85 },
      { km: 70, price: 105 },
      { km: 115, price: 125 },
      { km: 175, price: 145 },
    ],
  },
  {
    area: 'cisternas',
    service_name: 'Mantenimiento preventivo de la Bomba',
    description: '- Calibración del tanque hidroneumático\n- Verificación de válvulas checks\n- Revisión del sistema eléctrico',
    rubros: ['Hogar', 'Comercial'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 45 },
      { km: 35, price: 65 },
      { km: 70, price: 85 },
      { km: 115, price: 105 },
      { km: 175, price: 125 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Destapado de Inodoro',
    description: 'Desmontaje del inodoro, sondeo con máquina, inspección y reinstalación.',
    rubros: ['Hogar', 'Comercial'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 90 },
      { km: 35, price: 110 },
      { km: 70, price: 130 },
      { km: 115, price: 150 },
      { km: 175, price: 170 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Identificar tuberia - Caja negra',
    description: 'Desmontaje de inodoros de primer nivel para introducir transmisor y rastrear tubería; si queda trabado en caja de aguas negras, puede requerir romper (costo aparte).',
    rubros: ['Hogar', 'Comercial'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 175 },
      { km: 35, price: 195 },
      { km: 70, price: 215 },
      { km: 115, price: 235 },
      { km: 175, price: 255 },
    ],
  },
  {
    area: 'campanas_ductos_extractores',
    service_name: 'Limpieza de Campanas y filtros',
    description: 'Retiro de grasa en campana y filtros, limpieza de ductos verticales con desengrasante.',
    rubros: ['Comercial', 'Restaurantes'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 175 },
      { km: 35, price: 195 },
      { km: 70, price: 215 },
      { km: 115, price: 235 },
      { km: 175, price: 255 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Limpieza de trampas de grasa',
    description: 'Extracción de grasa, limpieza con detergente y desalojo de desechos.',
    rubros: ['Comercial', 'Restaurantes'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 65 },
      { km: 35, price: 85 },
      { km: 70, price: 105 },
      { km: 115, price: 125 },
      { km: 175, price: 145 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Limpieza de tuberia',
    rubros: ['Hogar', 'Comercial'],
    tipo_precio: 'fijo',
    // Precios provistos para tramos > 15 km
    distance_pricing: [
      { km: 35, price: 20 },
      { km: 70, price: 40 },
      { km: 115, price: 60 },
      { km: 175, price: 80 },
    ],
  },
  {
    area: 'campanas_ductos_extractores',
    service_name: 'Limpieza de extractor',
    rubros: ['Comercial', 'Restaurantes'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 95 },
      { km: 35, price: 115 },
      { km: 70, price: 135 },
      { km: 115, price: 155 },
      { km: 175, price: 175 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Destapado de Lavadero',
    description: 'Presurizador por aire; si no funciona, sondeo de tubería.',
    rubros: ['Hogar', 'Comercial'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 90 },
      { km: 35, price: 110 },
      { km: 70, price: 130 },
      { km: 115, price: 150 },
      { km: 175, price: 170 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Limpieza trampa de grasa pequeña (Hasta 60 x 60 x 60)',
    rubros: ['Comercial', 'Restaurantes'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 65 },
      { km: 35, price: 85 },
      { km: 70, price: 105 },
      { km: 115, price: 125 },
      { km: 175, price: 145 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Limpieza de trampa completa',
    description: '- Limpieza de trampa completa.\n- Desalojo de grasa.\n- Sondeo con máquina para limpieza de tubería',
    rubros: ['Comercial', 'Restaurantes'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 125 },
      { km: 35, price: 145 },
      { km: 70, price: 165 },
      { km: 115, price: 185 },
      { km: 175, price: 205 },
    ],
  },
  {
    area: 'fontaneria',
    service_name: 'Limpieza de tuberias - restaurantes',
    description: 'Mantenimiento general de drenajes de aguas grises en restaurante: sondeo de drenajes de piso, máquinas de bebidas, trampa de grasa interna; desinstalación y limpieza de sifones de lavamanos; sondeo de poceta de trapeadores; cambio de malla galvanizada y tornillos inox en coladeras; sondeos con equipos especializados; tubería de trampa de grasa externa hacia interior y salida a pozo colector.',
    rubros: ['Restaurantes'],
    tipo_precio: 'fijo',
    distance_pricing: [
      { km: 10, price: 275 },
      { km: 35, price: 295 },
      { km: 70, price: 315 },
      { km: 115, price: 335 },
      { km: 175, price: 355 },
    ],
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = [];

    for (const item of CATALOG) {
      const existing = await base44.asServiceRole.entities.Service.filter({ service_name: item.service_name });
      // Derivar base_price del tramo 10 km si existe
      const baseTier = (item.distance_pricing || []).find(t => t.km === 10);
      const payload = {
        ...item,
        base_price: baseTier ? baseTier.price : item.base_price ?? null,
        is_active: true,
      };

      if (existing.length > 0) {
        const current = existing[0];
        const updated = await base44.asServiceRole.entities.Service.update(current.id, payload);
        results.push({ action: 'updated', id: updated.id, name: updated.service_name });
      } else {
        // estimated_hours es requerido; establecer 1 por defecto si no está
        if (!('estimated_hours' in payload) || payload.estimated_hours == null) {
          payload.estimated_hours = 1;
        }
        const created = await base44.asServiceRole.entities.Service.create(payload);
        results.push({ action: 'created', id: created.id, name: created.service_name });
      }
    }

    return Response.json({ success: true, count: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});