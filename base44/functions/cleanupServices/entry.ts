import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalizeName(name) {
  if (!name) return '';
  return String(name).toLowerCase().normalize('NFD').replace(/\p{Diacritic}+/gu, '').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { trapPreference = 'skip' } = await (async () => {
      try { return await req.json(); } catch { return { trapPreference: 'skip' }; }
    })();

    const marketingNames = [
      'Transformamos tu espacio con diseños modernos y ejecución impecable.',
      'Planes de mantenimiento regular para mantener tu propiedad en óptimas condiciones.'
    ].map(normalizeName);

    const list = await base44.asServiceRole.entities.Service.list();

    const toDelete = [];
    const kept = [];

    // 1) Borrar servicios de marketing por nombre exacto
    for (const s of list) {
      const n = normalizeName(s.service_name);
      if (marketingNames.includes(n)) {
        toDelete.push({ reason: 'marketing', id: s.id, name: s.service_name });
      }
    }

    // 2) Duplicados de "Limpieza de tuberia" y sin precio
    const namesEquivalent = new Set([
      normalizeName('Limpieza de tuberia'),
      normalizeName('Limpieza de tubería')
    ]);
    const tuberiaCandidates = list.filter(s => namesEquivalent.has(normalizeName(s.service_name)));

    if (tuberiaCandidates.length > 1) {
      // determinar cuáles no tienen precio (sin base_price y sin tramo 10km)
      const withScore = tuberiaCandidates.map(s => {
        const tiers = Array.isArray(s.distance_pricing) ? s.distance_pricing : [];
        const has10 = tiers.some(t => Number(t.km) === 10 && t.price != null);
        const hasBase = s.base_price != null;
        const priceScore = (hasBase ? 10 : 0) + (has10 ? 5 : 0) + tiers.length; // simple heurística
        return { s, hasBase, has10, tiersCount: tiers.length, priceScore };
      });

      // conservar el mejor puntaje y eliminar el resto con puntaje 0 o menor
      withScore.sort((a,b) => b.priceScore - a.priceScore);
      const keepId = withScore[0].s.id;
      kept.push({ id: keepId, name: withScore[0].s.service_name });

      for (let i = 1; i < withScore.length; i++) {
        const cand = withScore[i];
        if (cand.priceScore === 0) {
          toDelete.push({ reason: 'duplicate_no_price', id: cand.s.id, name: cand.s.service_name });
        }
      }
    }

    // 3) Unificar trampa de grasa según preferencia
    if (trapPreference === 'keep_small' || trapPreference === 'keep_general') {
      const smallName = normalizeName('Limpieza trampa de grasa pequeña (Hasta 60 x 60 x 60)');
      const generalName = normalizeName('Limpieza de trampas de grasa');

      const small = list.find(s => normalizeName(s.service_name) === smallName);
      const general = list.find(s => normalizeName(s.service_name) === generalName);

      if (small && general) {
        if (trapPreference === 'keep_small') {
          toDelete.push({ reason: 'unify_trap_keep_small', id: general.id, name: general.service_name });
          kept.push({ id: small.id, name: small.service_name });
        } else {
          toDelete.push({ reason: 'unify_trap_keep_general', id: small.id, name: small.service_name });
          kept.push({ id: general.id, name: general.service_name });
        }
      }
    }

    // Ejecutar borrados
    const deletions = [];
    for (const d of toDelete) {
      await base44.asServiceRole.entities.Service.delete(d.id);
      deletions.push(d);
    }

    return Response.json({
      success: true,
      deleted_count: deletions.length,
      deleted: deletions,
      kept
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});