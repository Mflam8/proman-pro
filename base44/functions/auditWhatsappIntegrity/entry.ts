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
    const mergeDuplicates = payload?.merge === true;
    const sampleLimit = Number(payload?.sample_limit || 20);
    const maxCustomerGroups = Number(payload?.max_customer_groups || 0);
    const maxConversationGroups = Number(payload?.max_conversation_groups || 0);
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

    const uniqueList = (values) => {
      const seen = new Set();
      const result = [];
      for (const value of values) {
        const normalized = String(value || '').trim();
        if (!normalized) continue;
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(normalized);
      }
      return result;
    };

    const mergeStringArrays = (current, incoming) => uniqueList([...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]);

    const mergeObjectArrays = (current, incoming) => {
      const result = [];
      const seen = new Set();
      const values = [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])];
      for (const item of values) {
        if (!item || typeof item !== 'object') continue;
        const key = JSON.stringify(item);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(item);
      }
      return result;
    };

    const chooseBetterString = (currentValue, candidateValue) => {
      const current = String(currentValue || '').trim();
      const candidate = String(candidateValue || '').trim();
      if (!candidate) return currentValue || '';
      if (!current) return candidateValue;
      const currentPlaceholder = current.toLowerCase() === 'sin nombre';
      const candidatePlaceholder = candidate.toLowerCase() === 'sin nombre';
      if (currentPlaceholder && !candidatePlaceholder) return candidateValue;
      if (!currentPlaceholder && candidatePlaceholder) return currentValue;
      return candidate.length > current.length ? candidateValue : currentValue;
    };

    const chooseLatestDate = (currentValue, candidateValue) => {
      const currentTime = new Date(currentValue || 0).getTime();
      const candidateTime = new Date(candidateValue || 0).getTime();
      if (!candidateTime) return currentValue;
      if (!currentTime || candidateTime > currentTime) return candidateValue;
      return currentValue;
    };

    const hasRealName = (customer) => !!customer?.full_name && String(customer.full_name).trim().toLowerCase() !== 'sin nombre';

    const buildCustomerMergePatch = (canonical, duplicate, identityKey) => {
      const patch = {};
      const mergedFullName = chooseBetterString(canonical.full_name, duplicate.full_name);
      if ((canonical.full_name || '') !== (mergedFullName || '')) patch.full_name = mergedFullName;

      const stringFields = [
        'fiscal_name', 'nit', 'secondary_phone', 'email', 'wa_id', 'canonical_wa_id', 'channel', 'primary_rubro',
        'customer_type', 'source', 'commercial_owner', 'modo_operacion', 'preferred_contact', 'notas_legales'
      ];

      for (const field of stringFields) {
        const nextValue = chooseBetterString(canonical[field], duplicate[field]);
        if ((canonical[field] || '') !== (nextValue || '')) patch[field] = nextValue;
      }

      const mergedPhone = chooseBetterString(canonical.phone, duplicate.phone) || identityKey;
      if ((canonical.phone || '') !== (mergedPhone || '')) patch.phone = mergedPhone;

      const mergedNormalizedPhone = normalizePhone(canonical.normalized_phone || duplicate.normalized_phone || mergedPhone || identityKey);
      if ((canonical.normalized_phone || '') !== (mergedNormalizedPhone || '')) patch.normalized_phone = mergedNormalizedPhone;

      const mergedCanonicalWaId = chooseBetterString(canonical.canonical_wa_id, duplicate.canonical_wa_id || duplicate.wa_id || identityKey);
      if ((canonical.canonical_wa_id || '') !== (mergedCanonicalWaId || '')) patch.canonical_wa_id = mergedCanonicalWaId;

      const mergedNotes = uniqueList([canonical.notes, duplicate.notes]).join('\n\n');
      if ((canonical.notes || '') !== mergedNotes) patch.notes = mergedNotes;

      const mergedStatus = chooseBetterString(canonical.status, duplicate.status);
      if ((canonical.status || '') !== (mergedStatus || '')) patch.status = mergedStatus;

      const mergedPreferredContact = chooseBetterString(canonical.preferred_contact, duplicate.preferred_contact);
      if ((canonical.preferred_contact || '') !== (mergedPreferredContact || '')) patch.preferred_contact = mergedPreferredContact;

      const mergedAddresses = mergeObjectArrays(canonical.addresses, duplicate.addresses);
      if (JSON.stringify(canonical.addresses || []) !== JSON.stringify(mergedAddresses)) patch.addresses = mergedAddresses;

      const mergedConversation = mergeObjectArrays(canonical.whatsapp_conversation, duplicate.whatsapp_conversation);
      if (JSON.stringify(canonical.whatsapp_conversation || []) !== JSON.stringify(mergedConversation)) patch.whatsapp_conversation = mergedConversation;

      const mergedConsent = Boolean(canonical.consentimiento_contacto || duplicate.consentimiento_contacto);
      if (Boolean(canonical.consentimiento_contacto) !== mergedConsent) patch.consentimiento_contacto = mergedConsent;

      const mergedEmergency = Boolean(canonical.is_emergency || duplicate.is_emergency);
      if (Boolean(canonical.is_emergency) !== mergedEmergency) patch.is_emergency = mergedEmergency;

      const mergedVip = Boolean(canonical.is_vip || duplicate.is_vip);
      if (Boolean(canonical.is_vip) !== mergedVip) patch.is_vip = mergedVip;

      const mergedActivo = canonical.activo !== false || duplicate.activo !== false;
      if ((canonical.activo !== false) !== mergedActivo) patch.activo = mergedActivo;

      const mergedSourceVerified = Boolean(canonical.source_verified || duplicate.source_verified);
      if (Boolean(canonical.source_verified) !== mergedSourceVerified) patch.source_verified = mergedSourceVerified;

      const mergedLastInteraction = chooseLatestDate(canonical.last_interaction_at, duplicate.last_interaction_at);
      if ((canonical.last_interaction_at || '') !== (mergedLastInteraction || '')) patch.last_interaction_at = mergedLastInteraction;

      const mergedRating = Math.max(Number(canonical.rating || 0), Number(duplicate.rating || 0)) || undefined;
      if ((canonical.rating || undefined) !== mergedRating && mergedRating !== undefined) patch.rating = mergedRating;

      const mergedTotalJobs = Math.max(Number(canonical.total_jobs || 0), Number(duplicate.total_jobs || 0));
      if (Number(canonical.total_jobs || 0) !== mergedTotalJobs) patch.total_jobs = mergedTotalJobs;

      const mergedTotalSpent = Math.max(Number(canonical.total_spent || 0), Number(duplicate.total_spent || 0));
      if (Number(canonical.total_spent || 0) !== mergedTotalSpent) patch.total_spent = mergedTotalSpent;

      return patch;
    };

    const extractConversationPhone = (conversation) => {
      const source = `${conversation?.subject || ''} ${conversation?.notes || ''}`;
      const matches = source.match(/\+\d{8,15}/g) || [];
      return matches[0] || '';
    };

    const buildConversationMergePatch = (canonical, duplicate) => {
      const patch = {};

      const mergedLastMessageAt = chooseLatestDate(canonical.last_message_at, duplicate.last_message_at);
      if ((canonical.last_message_at || '') !== (mergedLastMessageAt || '')) patch.last_message_at = mergedLastMessageAt;

      const mergedLastMessageId = chooseBetterString(canonical.last_message_id, duplicate.last_message_id);
      if ((canonical.last_message_id || '') !== (mergedLastMessageId || '')) patch.last_message_id = mergedLastMessageId;

      const mergedSubject = chooseBetterString(canonical.subject, duplicate.subject);
      if ((canonical.subject || '') !== (mergedSubject || '')) patch.subject = mergedSubject;

      const mergedNotes = uniqueList([canonical.notes, duplicate.notes]).join('\n\n');
      if ((canonical.notes || '') !== mergedNotes) patch.notes = mergedNotes;

      const mergedChannel = chooseBetterString(canonical.channel, duplicate.channel);
      if ((canonical.channel || '') !== (mergedChannel || '')) patch.channel = mergedChannel;

      const mergedOpen = Boolean(canonical.is_open || duplicate.is_open);
      if (Boolean(canonical.is_open) !== mergedOpen) patch.is_open = mergedOpen;

      if ((canonical.customer_id || '') !== (duplicate.customer_id || '') && duplicate.customer_id) {
        patch.customer_id = canonical.customer_id;
      }

      return patch;
    };

    const updateEntityReferences = async (entityName, field, fromId, toId) => {
      if (!fromId || !toId || fromId === toId) return 0;
      const entityApi = base44.asServiceRole.entities[entityName];
      let updated = 0;

      while (true) {
        const batch = await entityApi.filter({ [field]: fromId }, 'created_date', pageSize, 0);
        if (!Array.isArray(batch) || batch.length === 0) break;

        for (const record of batch) {
          await entityApi.update(record.id, { [field]: toId });
          updated += 1;
        }
      }

      return updated;
    };

    const customerReferenceTargets = [
      { entity: 'WhatsappConversation', field: 'customer_id' },
      { entity: 'BitacoraWhatsApp', field: 'customer_id' },
      { entity: 'ConversationAnalysis', field: 'customer_id' },
      { entity: 'ClientInquiry', field: 'customer_id' },
      { entity: 'ConversationOperationalState', field: 'customer_id' },
      { entity: 'CorporateLog', field: 'customer_id' },
      { entity: 'ContactoCliente', field: 'customer_id' }
    ];

    const conversationReferenceTargets = [
      { entity: 'BitacoraWhatsApp', field: 'conversation_id' },
      { entity: 'ConversationAnalysis', field: 'conversation_id' },
      { entity: 'ConversationTimelineEvent', field: 'conversation_id' },
      { entity: 'ConversationOperationalState', field: 'conversation_id' },
      { entity: 'ClientInquiry', field: 'source_conversation_id' }
    ];

    const summarizeState = (customers, conversations) => {
      const customerGroupsMap = new Map();
      for (const customer of customers) {
        const key = normalizePhone(customer.normalized_phone || customer.canonical_wa_id || customer.phone || customer.wa_id);
        if (!key) continue;
        if (!customerGroupsMap.has(key)) customerGroupsMap.set(key, []);
        customerGroupsMap.get(key).push(customer);
      }

      const duplicateCustomerGroups = [...customerGroupsMap.entries()].filter(([, items]) => items.length > 1);

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

      return {
        customerGroupsMap,
        duplicateCustomerGroups,
        conversationGroupsMap,
        duplicateConversationGroups
      };
    };

    const initialCustomers = await listAll(base44.asServiceRole.entities.Customer);
    const initialConversations = await listAll(base44.asServiceRole.entities.WhatsappConversation);
    const initialState = summarizeState(initialCustomers, initialConversations);

    const customerSamples = [];
    const conversationSamples = [];
    const customerGroupsToProcess = maxCustomerGroups > 0 ? initialState.duplicateCustomerGroups.slice(0, maxCustomerGroups) : initialState.duplicateCustomerGroups;
    let deletedCustomers = 0;
    let deletedConversations = 0;
    let mergedCustomers = 0;
    let mergedConversations = 0;
    let activeDuplicateCustomers = 0;
    let mergedStubCustomers = 0;
    let emptyDuplicateConversations = 0;
    let customerReferenceUpdates = 0;
    let conversationReferenceUpdates = 0;

    for (const [key, group] of customerGroupsToProcess) {
      const ordered = [...group].sort((a, b) => {
        if ((b.activo !== false) !== (a.activo !== false)) return (b.activo !== false) ? 1 : -1;
        if (hasRealName(b) !== hasRealName(a)) return hasRealName(b) ? 1 : -1;
        return new Date(a.created_date || 0).getTime() - new Date(b.created_date || 0).getTime();
      });

      const canonical = ordered[0];
      const duplicates = ordered.slice(1);
      let deletedInGroup = 0;
      let mergedInGroup = 0;
      let runningCanonical = { ...canonical };

      activeDuplicateCustomers += duplicates.filter((item) => item.activo !== false).length;
      mergedStubCustomers += duplicates.filter((item) => item.activo === false || (item.notes || '').includes('Merged into')).length;

      for (const duplicate of duplicates) {
        if (mergeDuplicates) {
          const patch = buildCustomerMergePatch(runningCanonical, duplicate, key);
          if (Object.keys(patch).length > 0) {
            await base44.asServiceRole.entities.Customer.update(canonical.id, patch);
            runningCanonical = { ...runningCanonical, ...patch };
          }

          for (const target of customerReferenceTargets) {
            customerReferenceUpdates += await updateEntityReferences(target.entity, target.field, duplicate.id, canonical.id);
          }

          await base44.asServiceRole.entities.Customer.delete(duplicate.id);
          deletedCustomers += 1;
          mergedCustomers += 1;
          deletedInGroup += 1;
          mergedInGroup += 1;
          continue;
        }

        if (cleanup) {
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
          merged_in_run: mergedInGroup,
          deleted_in_cleanup: deletedInGroup
        });
      }
    }

    const currentConversations = await listAll(base44.asServiceRole.entities.WhatsappConversation);
    const conversationState = summarizeState([], currentConversations);
    const conversationGroupsToProcess = maxConversationGroups > 0 ? conversationState.duplicateConversationGroups.slice(0, maxConversationGroups) : conversationState.duplicateConversationGroups;

    for (const [key, group] of conversationGroupsToProcess) {
      const ordered = [...group].sort((a, b) => {
        const aScore = (a.last_message_id ? 1000 : 0) + new Date(a.last_message_at || 0).getTime();
        const bScore = (b.last_message_id ? 1000 : 0) + new Date(b.last_message_at || 0).getTime();
        return bScore - aScore;
      });

      const keep = ordered[0];
      const duplicates = ordered.slice(1);
      let deletedInGroup = 0;
      let mergedInGroup = 0;
      let runningKeep = { ...keep };

      emptyDuplicateConversations += duplicates.filter((item) => !item.last_message_id).length;

      for (const duplicate of duplicates) {
        if (mergeDuplicates) {
          const patch = buildConversationMergePatch(runningKeep, duplicate);
          if (Object.keys(patch).length > 0) {
            await base44.asServiceRole.entities.WhatsappConversation.update(keep.id, patch);
            runningKeep = { ...runningKeep, ...patch };
          }

          for (const target of conversationReferenceTargets) {
            conversationReferenceUpdates += await updateEntityReferences(target.entity, target.field, duplicate.id, keep.id);
          }

          await base44.asServiceRole.entities.WhatsappConversation.delete(duplicate.id);
          deletedConversations += 1;
          mergedConversations += 1;
          deletedInGroup += 1;
          mergedInGroup += 1;
          continue;
        }

        if (cleanup) {
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
          merged_in_run: mergedInGroup,
          deleted_in_cleanup: deletedInGroup
        });
      }
    }

    const finalCustomers = await listAll(base44.asServiceRole.entities.Customer);
    const finalConversations = await listAll(base44.asServiceRole.entities.WhatsappConversation);
    const finalState = summarizeState(finalCustomers, finalConversations);

    return Response.json({
      ok: true,
      cleanup_applied: cleanup,
      merge_applied: mergeDuplicates,
      causes: [
        'Los clientes se fragmentaron por identidad histórica repartida entre phone, wa_id y normalized_phone.',
        'Las conversaciones se fragmentaron porque la llave del hilo se estaba armando con el identificador del número y no siempre con el número visible del canal.',
        'Por eso un mismo contacto pudo terminar con varias fichas y varios hilos vacíos o paralelos.'
      ],
      scanned: {
        customers_before: initialCustomers.length,
        conversations_before: initialConversations.length,
        customers_after: finalCustomers.length,
        conversations_after: finalConversations.length
      },
      summary: {
        duplicate_customer_groups_before: initialState.duplicateCustomerGroups.length,
        duplicate_customer_records_before: initialState.duplicateCustomerGroups.reduce((sum, [, items]) => sum + items.length, 0),
        extra_customer_records_before: initialState.duplicateCustomerGroups.reduce((sum, [, items]) => sum + items.length - 1, 0),
        active_duplicate_customers_before: activeDuplicateCustomers,
        merged_or_inactive_duplicate_customers_before: mergedStubCustomers,
        duplicate_conversation_groups_before: initialState.duplicateConversationGroups.length,
        duplicate_conversation_records_before: initialState.duplicateConversationGroups.reduce((sum, [, items]) => sum + items.length, 0),
        extra_conversation_records_before: initialState.duplicateConversationGroups.reduce((sum, [, items]) => sum + items.length - 1, 0),
        empty_duplicate_conversations_before: emptyDuplicateConversations,
        processed_customer_groups: customerGroupsToProcess.length,
        processed_conversation_groups: conversationGroupsToProcess.length,
        merged_customers: mergedCustomers,
        merged_conversations: mergedConversations,
        customer_reference_updates: customerReferenceUpdates,
        conversation_reference_updates: conversationReferenceUpdates,
        deleted_customers: deletedCustomers,
        deleted_conversations: deletedConversations,
        duplicate_customer_groups_after: finalState.duplicateCustomerGroups.length,
        duplicate_customer_records_after: finalState.duplicateCustomerGroups.reduce((sum, [, items]) => sum + items.length, 0),
        extra_customer_records_after: finalState.duplicateCustomerGroups.reduce((sum, [, items]) => sum + items.length - 1, 0),
        duplicate_conversation_groups_after: finalState.duplicateConversationGroups.length,
        duplicate_conversation_records_after: finalState.duplicateConversationGroups.reduce((sum, [, items]) => sum + items.length, 0),
        extra_conversation_records_after: finalState.duplicateConversationGroups.reduce((sum, [, items]) => sum + items.length - 1, 0)
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