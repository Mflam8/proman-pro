import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const cleanup = payload?.cleanup === true;
    const sampleLimit = Number(payload?.sample_limit || 20);
    const pageSize = 100;

    const normalizePhone = (value) => {
      if (!value) return '';
      const digits = String(value).replace(/[^\d]/g, '');
      if (!digits) return '';
      if (digits.startsWith('503')) return `+${digits}`;
      if (digits.length === 8) return `+503${digits}`;
      return `+${digits}`;
    };

    const listAll = async (entityApi, sort = 'created_date') => {
      const all = [];
      let skip = 0;
      while (true) {
        const batch = await entityApi.filter({}, sort, pageSize, skip);
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < pageSize) break;
        skip += batch.length;
      }
      return all;
    };

    const hasRealName = (customer) => !!customer?.full_name && customer.full_name !== 'Sin nombre';

    const extractConversationPhone = (conversation) => {
      const source = `${conversation?.subject || ''} ${conversation?.notes || ''}`;
      const matches = source.match(/\+\d{8,15}/g) || [];
      return matches[0] || '';
    };

    const customers = await listAll(base44.asServiceRole.entities.Customer);
    const conversations = await listAll(base44.asServiceRole.entities.WhatsappConversation);

    const customerGroupsMap = new Map();
    for (const customer of customers) {
      const key = normalizePhone(customer.normalized_phone || customer.canonical_wa_id || customer.phone || customer.wa_id);
      if (!key) continue;
      if (!customerGroupsMap.has(key)) customerGroupsMap.set(key, []);
      customerGroupsMap.get(key).push(customer);
    }

    const duplicateCustomerGroups = [...customerGroupsMap.entries()].filter(([, items]) => items.length > 1);
    const customerSamples = [];
    let deletedCustomers = 0;
    let activeDuplicateCustomers = 0;
    let mergedStubCustomers = 0;

    for (const [key, group] of duplicateCustomerGroups) {
      const ordered = [...group].sort((a, b) => {
        if ((b.activo !== false) !== (a.activo !== false)) return (b.activo !== false) ? 1 : -1;
        if (hasRealName(b) !== hasRealName(a)) return hasRealName(b) ? 1 : -1;
        return new Date(a.created_date || 0).getTime() - new Date(b.created_date || 0).getTime();
      });

      const canonical = ordered[0];
      const duplicates = ordered.slice(1);
      let deletedInGroup = 0;

      activeDuplicateCustomers += duplicates.filter((item) => item.activo !== false).length;
      mergedStubCustomers += duplicates.filter((item) => item.activo === false || (item.notes || '').includes('Merged into')).length;

      if (cleanup) {
        for (const duplicate of duplicates) {
          const notes = duplicate.notes || '';
          const safeToDelete = duplicate.activo === false && notes.includes('Merged into');
          if (safeToDelete) {
            await base44.asServiceRole.entities.Customer.delete(duplicate.id);
            deletedCustomers += 1;
            deletedInGroup += 1;
          }
        }
      }

      if (customerSamples.length < sampleLimit) {
        customerSamples.push({
          key,
          canonical_id: canonical.id,
          canonical_name: canonical.full_name,
          duplicates: duplicates.map((item) => ({
            id: item.id,
            full_name: item.full_name,
            activo: item.activo !== false,
            merged_note: (item.notes || '').includes('Merged into')
          })),
          deleted_in_cleanup: deletedInGroup
        });
      }
    }

    const conversationGroupsMap = new Map();
    for (const conversation of conversations) {
      if (!conversation.customer_id) continue;
      const phoneKey = extractConversationPhone(conversation);
      if (!phoneKey) continue;
      const key = `${conversation.customer_id}|${phoneKey}`;
      if (!conversationGroupsMap.has(key)) conversationGroupsMap.set(key, []);
      conversationGroupsMap.get(key).push(conversation);
    }

    const duplicateConversationGroups = [...conversationGroupsMap.entries()].filter(([, items]) => items.length > 1);
    const conversationSamples = [];
    let deletedConversations = 0;
    let emptyDuplicateConversations = 0;

    for (const [key, group] of duplicateConversationGroups) {
      const ordered = [...group].sort((a, b) => {
        const aScore = (a.last_message_id ? 1000 : 0) + new Date(a.last_message_at || 0).getTime();
        const bScore = (b.last_message_id ? 1000 : 0) + new Date(b.last_message_at || 0).getTime();
        return bScore - aScore;
      });

      const keep = ordered[0];
      const duplicates = ordered.slice(1);
      let deletedInGroup = 0;

      emptyDuplicateConversations += duplicates.filter((item) => !item.last_message_id).length;

      if (cleanup) {
        for (const duplicate of duplicates) {
          const safeToDelete = !duplicate.last_message_id;
          if (safeToDelete) {
            await base44.asServiceRole.entities.WhatsappConversation.delete(duplicate.id);
            deletedConversations += 1;
            deletedInGroup += 1;
          }
        }
      }

      if (conversationSamples.length < sampleLimit) {
        conversationSamples.push({
          key,
          keep_id: keep.id,
          duplicates: duplicates.map((item) => ({
            id: item.id,
            subject: item.subject,
            last_message_id: item.last_message_id || null
          })),
          deleted_in_cleanup: deletedInGroup
        });
      }
    }

    return Response.json({
      ok: true,
      cleanup_applied: cleanup,
      causes: [
        'Los clientes se fragmentaron por identidad histórica repartida entre phone, wa_id y normalized_phone.',
        'Las conversaciones se fragmentaron porque la llave del hilo se estaba armando con el identificador del número y no siempre con el número visible del canal.',
        'Por eso un mismo contacto pudo terminar con varias fichas y varios hilos vacíos o paralelos.'
      ],
      scanned: {
        customers: customers.length,
        conversations: conversations.length
      },
      summary: {
        duplicate_customer_groups: duplicateCustomerGroups.length,
        duplicate_customer_records: duplicateCustomerGroups.reduce((sum, [, items]) => sum + items.length, 0),
        extra_customer_records: duplicateCustomerGroups.reduce((sum, [, items]) => sum + items.length - 1, 0),
        active_duplicate_customers: activeDuplicateCustomers,
        merged_or_inactive_duplicate_customers: mergedStubCustomers,
        duplicate_conversation_groups: duplicateConversationGroups.length,
        duplicate_conversation_records: duplicateConversationGroups.reduce((sum, [, items]) => sum + items.length, 0),
        extra_conversation_records: duplicateConversationGroups.reduce((sum, [, items]) => sum + items.length - 1, 0),
        empty_duplicate_conversations: emptyDuplicateConversations,
        deleted_customers: deletedCustomers,
        deleted_conversations: deletedConversations
      },
      samples: {
        customers: customerSamples,
        conversations: conversationSamples
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});