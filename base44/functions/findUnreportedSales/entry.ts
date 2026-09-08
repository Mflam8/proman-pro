import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const PAYMENT_KEYWORDS = [
  'pago', 'pague', 'pague', 'pagado', 'abono', 'abone', 'abonado', 'deposito', 'deposite', 'transferencia',
  'transferi', 'cancelado', 'cancele', 'cobro', 'cobrado', 'recibido', 'recibi', 'comprobante', 'voucher', 'efectivo'
];

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const phoneKey = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? digits.slice(-8) : '';
};

const money = (value) => Number(Number(value || 0).toFixed(2));

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const inRange = (date, start, end) => {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

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

const analyzeMessage = (message) => {
  const rawText = [message?.text, message?.texto_mensaje, message?.caption].filter(Boolean).join(' ').trim();
  const normalized = normalizeText(rawText);
  const amounts = extractAmounts(rawText);
  const hasKeyword = PAYMENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const hasProofWord = normalized.includes('comprobante') || normalized.includes('voucher') || normalized.includes('captura');
  const mediaType = String(message?.message_type || '').toLowerCase();
  const hasPaymentMedia = ['image', 'document'].includes(mediaType) && hasProofWord;
  const hasSignal = hasKeyword || amounts.length > 0 || hasPaymentMedia;

  return {
    hasSignal,
    amounts,
    snippet: rawText || '[Mensaje sin texto]'
  };
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const start = parseDate(body?.startDate || null);
    const end = parseDate(body?.endDate || null);
    if (end) end.setHours(23, 59, 59, 999);

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
    const inquiriesByPhone = new Map();
    const inquiriesByConversation = new Map();
    const messagesByInquiry = new Map();
    const messagesByCustomer = new Map();
    const messagesByPhone = new Map();
    const messagesByConversation = new Map();

    payments.forEach((payment) => {
      pushToMap(paymentsByInquiry, payment?.inquiry_id, payment);
    });

    const filteredInquiries = inquiries.filter((inquiry) => {
      const referenceDate = parseDate(inquiry?.completed_at || inquiry?.scheduled_date || inquiry?.created_date);
      return (!start && !end) || inRange(referenceDate, start, end);
    });

    filteredInquiries.forEach((inquiry) => {
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

    const filteredMessages = messages.filter((message) => {
      const referenceDate = parseDate(message?.timestamp || message?.message_timestamp || message?.created_date);
      return (!start && !end) || inRange(referenceDate, start, end);
    });

    filteredMessages.forEach((message) => {
      pushToMap(messagesByInquiry, message?.job_id || message?.trabajo_id, message);
      pushToMap(messagesByCustomer, message?.customer_id, message);
      pushToMap(messagesByConversation, message?.conversation_id, message);
      [message?.from_phone, message?.phone, message?.contact_phone, message?.author_phone, message?.to_phone, message?.wa_id].forEach((value) => {
        pushToMap(messagesByPhone, phoneKey(value), message);
      });
    });

    const candidates = filteredInquiries.map((inquiry) => {
      const customer = customerMap.get(inquiry?.customer_id);
      const relatedMessages = [
        ...(messagesByInquiry.get(inquiry?.id) || []),
        ...(messagesByCustomer.get(inquiry?.customer_id) || []),
        ...(messagesByConversation.get(inquiry?.source_conversation_id) || [])
      ];

      [
        inquiry?.phone,
        inquiry?.normalized_phone,
        customer?.phone,
        customer?.secondary_phone,
        customer?.normalized_phone,
        customer?.wa_id,
        customer?.canonical_wa_id
      ].forEach((value) => {
        relatedMessages.push(...(messagesByPhone.get(phoneKey(value)) || []));
      });

      const dedupedMessages = Array.from(new Map(relatedMessages.map((message) => {
        const key = message?.id || message?.message_id || message?.mensaje_id || `${message?.timestamp || ''}-${message?.text || message?.texto_mensaje || ''}`;
        return [key, message];
      })).values());

      const evidence = dedupedMessages.map((message) => ({
        message,
        analysis: analyzeMessage(message)
      })).filter((item) => item.analysis.hasSignal);

      const recordedAmount = money((paymentsByInquiry.get(inquiry?.id) || []).reduce((sum, payment) => sum + Number(payment?.amount_paid || 0), 0));
      const expectedAmount = money(inquiry?.final_amount || inquiry?.balance_due || inquiry?.quote_amount || inquiry?.subtotal_amount || 0);
      const largestMentionedAmount = money(Math.max(0, ...evidence.flatMap((item) => item.analysis.amounts)));
      const latestEvidence = evidence
        .map((item) => parseDate(item.message?.timestamp || item.message?.message_timestamp || item.message?.created_date))
        .filter(Boolean)
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;

      let reason = '';
      if (evidence.length > 0 && recordedAmount === 0) reason = 'Hay señales de pago en el chat pero no existe pago registrado';
      else if (largestMentionedAmount > recordedAmount + 1) reason = 'El monto mencionado en chat es mayor al pago registrado';
      else if (evidence.length > 0 && inquiry?.payment_status !== 'pagado') reason = 'El chat sugiere cobro, pero el estado aún no está actualizado';

      if (!reason) return null;

      return {
        inquiry_id: inquiry?.id,
        customer_name: customer?.full_name || inquiry?.client_name || 'Cliente sin nombre',
        phone: customer?.phone || inquiry?.phone || '',
        service_type: inquiry?.service_type || inquiry?.rubro || 'Sin especificar',
        expected_amount: expectedAmount,
        recorded_amount: recordedAmount,
        suspected_amount: largestMentionedAmount,
        payment_status: inquiry?.payment_status || 'pendiente',
        evidence_count: evidence.length,
        latest_evidence_at: latestEvidence ? latestEvidence.toISOString() : null,
        reason,
        sample_message: evidence[0]?.analysis?.snippet?.slice(0, 220) || ''
      };
    }).filter(Boolean).sort((a, b) => {
      if (b.suspected_amount !== a.suspected_amount) return b.suspected_amount - a.suspected_amount;
      return new Date(b.latest_evidence_at || 0).getTime() - new Date(a.latest_evidence_at || 0).getTime();
    });

    const orphanGroups = new Map();

    filteredMessages.forEach((message) => {
      const analysis = analyzeMessage(message);
      if (!analysis.hasSignal) return;

      const linkedInquiries = [
        ...(inquiriesByCustomer.get(message?.customer_id) || []),
        ...(inquiriesByConversation.get(message?.conversation_id) || []),
        ...(inquiriesByPhone.get(phoneKey(message?.from_phone || message?.phone || message?.contact_phone)) || []),
        ...(inquiriesByPhone.get(phoneKey(message?.author_phone || message?.to_phone)) || []),
        ...(message?.job_id || message?.trabajo_id ? filteredInquiries.filter((inquiry) => inquiry.id === (message.job_id || message.trabajo_id)) : [])
      ];

      if (linkedInquiries.length > 0) return;

      const groupKey = message?.customer_id || message?.conversation_id || phoneKey(message?.from_phone || message?.phone || message?.contact_phone) || message?.id;
      if (!orphanGroups.has(groupKey)) {
        orphanGroups.set(groupKey, {
          customer_name: 'Conversación sin trabajo',
          phone: message?.from_phone || message?.phone || message?.contact_phone || '',
          evidence_count: 0,
          suspected_amount: 0,
          latest_evidence_at: null,
          sample_message: analysis.snippet.slice(0, 220)
        });
      }

      const group = orphanGroups.get(groupKey);
      const customer = customerMap.get(message?.customer_id);
      group.customer_name = customer?.full_name || group.customer_name;
      group.evidence_count += 1;
      group.suspected_amount = Math.max(group.suspected_amount, ...analysis.amounts, group.suspected_amount);
      const currentDate = parseDate(message?.timestamp || message?.message_timestamp || message?.created_date);
      if (currentDate && (!group.latest_evidence_at || currentDate > new Date(group.latest_evidence_at))) {
        group.latest_evidence_at = currentDate.toISOString();
      }
    });

    const orphans = Array.from(orphanGroups.values()).sort((a, b) => {
      if (b.suspected_amount !== a.suspected_amount) return b.suspected_amount - a.suspected_amount;
      return new Date(b.latest_evidence_at || 0).getTime() - new Date(a.latest_evidence_at || 0).getTime();
    });

    const summary = {
      totalCandidates: candidates.length,
      totalSuspectedAmount: money(candidates.reduce((sum, item) => sum + Number(item.suspected_amount || 0), 0) + orphans.reduce((sum, item) => sum + Number(item.suspected_amount || 0), 0)),
      noPaymentRecordCount: candidates.filter((item) => item.recorded_amount === 0).length,
      amountGapCount: candidates.filter((item) => item.suspected_amount > item.recorded_amount + 1).length,
      orphanConversationCount: orphans.length
    };

    return Response.json({
      success: true,
      summary,
      candidates,
      orphans,
      criteria: 'Búsqueda heurística en chats usando palabras como pago, transferencia, depósito, abono, comprobante y montos detectables. Requiere revisión humana antes de registrar pagos.'
    });
  } catch (error) {
    console.error('FIND_UNREPORTED_SALES_ERROR', error);
    return Response.json({ success: false, error: error.message || 'Error generico' }, { status: 500 });
  }
}