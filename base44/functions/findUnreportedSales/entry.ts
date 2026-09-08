import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const PAYMENT_KEYWORDS = [
  'pago', 'pague', 'pagado', 'abono', 'abonado', 'deposito', 'deposite', 'transferencia',
  'transferi', 'cancelado', 'cancele', 'cobro', 'cobrado', 'recibido', 'recibi', 'comprobante', 'voucher', 'efectivo'
];

const CONTRACT_KEYWORDS = [
  'agend', 'programad', 'confirmad', 'aprobad', 'realizado', 'realizamos', 'instalacion', 'instalación',
  'reparacion', 'reparación', 'mantenimiento', 'visit', 'tecnico', 'técnico', 'cotizacion aprobada', 'cotización aprobada'
];

const ADDRESS_KEYWORDS = [
  'direccion', 'dirección', 'colonia', 'residencial', 'urbanizacion', 'urbanización', 'pasaje', 'calle', 'avenida',
  'boulevard', 'local', 'casa', 'km', 'kilometro', 'kilómetro'
];

const SERVICE_LABELS = [
  { label: 'Plomería', hints: ['fuga', 'tuberia', 'tubería', 'agua', 'lavamanos', 'grifo', 'inodoro', 'cisterna', 'bomba', 'destape'] },
  { label: 'Electricidad', hints: ['electricidad', 'eléctr', 'breaker', 'tomacorriente', 'voltaje', 'luz', 'cableado', 'panel'] },
  { label: 'Pintura', hints: ['pintura', 'pintar', 'repello', 'sellador'] },
  { label: 'Impermeabilización', hints: ['impermeabil', 'filtracion', 'filtración', 'techo', 'losa', 'goteras'] },
  { label: 'Remodelación', hints: ['remodel', 'enchape', 'ceramica', 'cerámica', 'construccion', 'construcción', 'albañil'] },
  { label: 'Aire acondicionado', hints: ['aire acondicionado', 'minisplit', 'compresor'] },
  { label: 'Limpieza', hints: ['limpieza', 'lavado', 'desinfeccion', 'desinfección'] }
];

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const money = (value) => Number(Number(value || 0).toFixed(2));

const phoneKey = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? digits.slice(-8) : '';
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dedupeBy = (items, getKey) => Array.from(new Map(items.map((item) => [getKey(item), item])).values());

const pushToMap = (map, key, value) => {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
};

const unwrapRecord = (record) => (record && record.data ? { ...record, ...record.data } : record);

const listAll = async (entityApi, sort = '-created_date', batchSize = 200) => {
  const results = [];
  let skip = 0;

  while (true) {
    const batch = await entityApi.list(sort, batchSize, skip);
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < batchSize || skip >= 5000) break;
    skip += batch.length;
  }

  return results;
};

const getMonthRange = (monthValue) => {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return null;
  const [year, month] = monthValue.split('-').map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

const inRange = (date, start, end) => {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const extractAmounts = (rawText) => {
  const text = normalizeText(rawText);
  const amounts = [];
  const patterns = [
    /\$\s*(\d{1,6}(?:[.,]\d{1,2})?)/g,
    /(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:usd|dolares?)/g,
    /(?:pago|pagado|abono|abonado|deposito|transferencia|cobro|cobrado|efectivo|comprobante)[^\d$]{0,20}\$?\s*(\d{1,6}(?:[.,]\d{1,2})?)/g
  ];

  patterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) {
      const value = Number(String(match[1]).replace(',', '.'));
      if (Number.isFinite(value) && value > 0) amounts.push(money(value));
    }
  });

  return [...new Set(amounts)].sort((a, b) => b - a);
};

const extractNameFromText = (rawText) => {
  if (!rawText) return '';
  const match = rawText.match(/(?:mi nombre es|soy|habla(?: con)?|a nombre de)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+){0,3})/i);
  return match?.[1]?.trim() || '';
};

const extractAddressFromText = (messages) => {
  const candidates = messages
    .map((message) => [message?.text, message?.texto_mensaje, message?.caption].filter(Boolean).join(' ').trim())
    .filter(Boolean)
    .filter((text) => ADDRESS_KEYWORDS.some((keyword) => normalizeText(text).includes(normalizeText(keyword))));

  return candidates.sort((a, b) => b.length - a.length)[0] || '';
};

const extractServiceFromText = (messages) => {
  const joined = normalizeText(messages.map((message) => [message?.text, message?.texto_mensaje, message?.caption].filter(Boolean).join(' ')).join(' \n '));
  const explicitMatch = joined.match(/(?:servicio|trabajo|cotizacion|cotizacion de|cotización|cotización de)\s+de\s+([a-z0-9\s]{4,60})/i);
  if (explicitMatch?.[1]) return explicitMatch[1].trim();

  const found = SERVICE_LABELS.find((item) => item.hints.some((hint) => joined.includes(normalizeText(hint))));
  return found?.label || '';
};

const analyzeConversationMessages = (messages) => {
  const evidence = [];
  const allAmounts = [];
  let contractKeywordCount = 0;
  let paymentKeywordCount = 0;
  let nameCandidate = '';

  messages.forEach((message) => {
    const rawText = [message?.text, message?.texto_mensaje, message?.caption].filter(Boolean).join(' ').trim();
    const normalized = normalizeText(rawText);
    const amounts = extractAmounts(rawText);
    const hasPaymentKeyword = PAYMENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const hasContractKeyword = CONTRACT_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
    const hasAddressKeyword = ADDRESS_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));

    if (!nameCandidate) nameCandidate = extractNameFromText(rawText);
    if (hasPaymentKeyword) paymentKeywordCount += 1;
    if (hasContractKeyword) contractKeywordCount += 1;
    allAmounts.push(...amounts);

    if (rawText && (hasPaymentKeyword || hasContractKeyword || hasAddressKeyword || amounts.length > 0)) {
      evidence.push(rawText.slice(0, 220));
    }
  });

  return {
    evidenceSnippets: evidence.slice(0, 3),
    allAmounts: [...new Set(allAmounts)].sort((a, b) => b - a),
    contractKeywordCount,
    paymentKeywordCount,
    nameCandidate
  };
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.employee_type !== 'Supervisor') {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const month = body?.month || new Date().toISOString().slice(0, 7);
    const monthRange = getMonthRange(month);
    const start = monthRange?.start || parseDate(body?.startDate || null);
    const end = monthRange?.end || parseDate(body?.endDate || null);
    if (end && !monthRange) end.setHours(23, 59, 59, 999);

    const [rawInquiries, rawPayments, rawCustomers, rawMessages] = await Promise.all([
      listAll(base44.asServiceRole.entities.ClientInquiry, '-created_date'),
      listAll(base44.asServiceRole.entities.Payment, '-created_date'),
      listAll(base44.asServiceRole.entities.Customer, '-created_date'),
      listAll(base44.asServiceRole.entities.BitacoraWhatsApp, '-timestamp')
    ]);

    const inquiries = rawInquiries.map(unwrapRecord);
    const payments = rawPayments.map(unwrapRecord);
    const customers = rawCustomers.map(unwrapRecord);
    const messages = rawMessages.map(unwrapRecord);

    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
    const paymentsByInquiry = new Map();
    const inquiriesByCustomer = new Map();
    const inquiriesByConversation = new Map();
    const inquiriesByPhone = new Map();

    payments.forEach((payment) => pushToMap(paymentsByInquiry, payment?.inquiry_id, payment));

    inquiries.forEach((inquiry) => {
      pushToMap(inquiriesByCustomer, inquiry?.customer_id, inquiry);
      pushToMap(inquiriesByConversation, inquiry?.source_conversation_id, inquiry);
      [
        inquiry?.phone,
        inquiry?.normalized_phone,
        customerMap.get(inquiry?.customer_id)?.phone,
        customerMap.get(inquiry?.customer_id)?.secondary_phone,
        customerMap.get(inquiry?.customer_id)?.normalized_phone,
        customerMap.get(inquiry?.customer_id)?.wa_id,
        customerMap.get(inquiry?.customer_id)?.canonical_wa_id
      ].forEach((value) => pushToMap(inquiriesByPhone, phoneKey(value), inquiry));
    });

    const filteredMessages = messages
      .filter((message) => inRange(parseDate(message?.timestamp || message?.message_timestamp || message?.created_date), start, end))
      .sort((a, b) => new Date(a?.timestamp || a?.message_timestamp || a?.created_date || 0).getTime() - new Date(b?.timestamp || b?.message_timestamp || b?.created_date || 0).getTime());

    const groups = new Map();

    filteredMessages.forEach((message) => {
      const key = message?.conversation_id || message?.customer_id || phoneKey(message?.from_phone || message?.phone || message?.contact_phone || message?.wa_id) || message?.id;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          conversationId: message?.conversation_id || '',
          customerId: message?.customer_id || '',
          phone: message?.from_phone || message?.phone || message?.contact_phone || message?.wa_id || '',
          messages: []
        });
      }
      groups.get(key).messages.push(message);
    });

    const conversations = Array.from(groups.values()).map((group) => {
      const phone = group.phone;
      const linkedInquiries = dedupeBy([
        ...(inquiriesByCustomer.get(group.customerId) || []),
        ...(inquiriesByConversation.get(group.conversationId) || []),
        ...(inquiriesByPhone.get(phoneKey(phone)) || [])
      ], (item) => item?.id || `${item?.customer_id}-${item?.created_date}`);

      const primaryInquiry = linkedInquiries
        .sort((a, b) => new Date(b?.updated_date || b?.created_date || 0).getTime() - new Date(a?.updated_date || a?.created_date || 0).getTime())[0] || null;

      const customer = customerMap.get(group.customerId) || customerMap.get(primaryInquiry?.customer_id) || null;
      const paymentTotal = money(linkedInquiries.reduce((sum, inquiry) => {
        const inquiryPayments = paymentsByInquiry.get(inquiry?.id) || [];
        return sum + inquiryPayments.reduce((inner, payment) => inner + Number(payment?.amount_paid || 0), 0);
      }, 0));

      const analysis = analyzeConversationMessages(group.messages);
      const address = primaryInquiry?.address || primaryInquiry?.location_name || customer?.addresses?.find?.((item) => item?.is_primary)?.address || customer?.addresses?.[0]?.address || extractAddressFromText(group.messages);
      const service = primaryInquiry?.service_type || primaryInquiry?.rubro || extractServiceFromText(group.messages);
      const systemAmount = money(primaryInquiry?.final_amount || primaryInquiry?.quote_amount || primaryInquiry?.subtotal_amount || 0);
      const chatAmount = money(analysis.allAmounts[0] || 0);
      const latestMessageAt = parseDate(group.messages[group.messages.length - 1]?.timestamp || group.messages[group.messages.length - 1]?.message_timestamp || group.messages[group.messages.length - 1]?.created_date);
      const detectedName = customer?.full_name || primaryInquiry?.client_name || analysis.nameCandidate || '';
      const detectedPhone = customer?.phone || primaryInquiry?.phone || phone || '';

      const flags = [];
      let score = 0;

      if (linkedInquiries.length > 0) {
        score += 4;
        flags.push('Trabajo vinculado');
      }
      if (paymentTotal > 0) {
        score += 4;
        flags.push('Pago registrado');
      }
      if (analysis.contractKeywordCount > 0) {
        score += 2;
        flags.push('Lenguaje de contratación');
      }
      if (analysis.paymentKeywordCount > 0) {
        score += 2;
        flags.push('Lenguaje de pago');
      }
      if (chatAmount > 0) {
        score += 1;
        flags.push('Monto en chat');
      }
      if (service) {
        score += 1;
        flags.push('Servicio detectado');
      }
      if (address) {
        score += 1;
        flags.push('Dirección detectada');
      }

      let contractStatus = 'sin_indicio';
      let contractStatusLabel = 'Sin indicio claro';
      if (paymentTotal > 0 || linkedInquiries.length > 0) {
        contractStatus = 'confirmado_en_sistema';
        contractStatusLabel = 'Confirmado en sistema';
      } else if (score >= 5) {
        contractStatus = 'probable';
        contractStatusLabel = 'Probable contratación';
      } else if (score >= 2) {
        contractStatus = 'dudoso';
        contractStatusLabel = 'Caso dudoso';
      }

      const summaryParts = [
        detectedName ? `${detectedName}` : 'Conversación sin nombre detectado',
        detectedPhone ? `tel. ${detectedPhone}` : 'sin teléfono claro',
        service ? `servicio: ${service}` : 'servicio no claro',
        address ? `dirección: ${address}` : 'sin dirección clara',
        chatAmount > 0 ? `monto en chat: $${chatAmount.toFixed(2)}` : 'sin monto escrito',
        paymentTotal > 0 ? `pago registrado: $${paymentTotal.toFixed(2)}` : 'sin pago registrado'
      ];

      return {
        review_key: `${month}:${group.key}`,
        audit_period: month,
        conversation_id: group.conversationId,
        customer_id: customer?.id || group.customerId || '',
        inquiry_id: primaryInquiry?.id || '',
        customer_name: customer?.full_name || primaryInquiry?.client_name || 'Conversación sin nombre',
        phone: detectedPhone,
        detected_name: detectedName,
        detected_phone: detectedPhone,
        detected_address: address || '',
        detected_service: service || '',
        chat_amount: chatAmount,
        system_amount: systemAmount,
        recorded_amount: paymentTotal,
        message_count: group.messages.length,
        latest_message_at: latestMessageAt ? latestMessageAt.toISOString() : null,
        linked_inquiry_count: linkedInquiries.length,
        contract_status: contractStatus,
        contract_status_label: contractStatusLabel,
        flags,
        evidence_snippets: analysis.evidenceSnippets,
        audit_summary: summaryParts.join(' • ')
      };
    }).sort((a, b) => {
      const statusRank = {
        confirmado_en_sistema: 3,
        probable: 2,
        dudoso: 1,
        sin_indicio: 0
      };
      if (statusRank[b.contract_status] !== statusRank[a.contract_status]) {
        return statusRank[b.contract_status] - statusRank[a.contract_status];
      }
      return new Date(b.latest_message_at || 0).getTime() - new Date(a.latest_message_at || 0).getTime();
    });

    const summary = {
      totalConversations: conversations.length,
      confirmedInSystemCount: conversations.filter((item) => item.contract_status === 'confirmado_en_sistema').length,
      probableCount: conversations.filter((item) => item.contract_status === 'probable').length,
      doubtfulCount: conversations.filter((item) => item.contract_status === 'dudoso').length,
      totalChatAmount: money(conversations.reduce((sum, item) => sum + Number(item.chat_amount || 0), 0)),
      totalRecordedAmount: money(conversations.reduce((sum, item) => sum + Number(item.recorded_amount || 0), 0))
    };

    return Response.json({
      success: true,
      month,
      summary,
      conversations,
      criteria: 'Auditoría histórica por conversación del mes seleccionado. Detecta nombre, teléfono, dirección, servicio y montos escritos en el chat, y los cruza con trabajos y pagos ya existentes para revisión manual.'
    });
  } catch (error) {
    console.error('FIND_UNREPORTED_SALES_ERROR', error);
    return Response.json({ success: false, error: error.message || 'Error generico' }, { status: 500 });
  }
}