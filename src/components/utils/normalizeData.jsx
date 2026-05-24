/**
 * Utilidades para normalizar datos desestructurados que vienen de n8n, WhatsApp, etc.
 * Garantiza consistencia en reportes y estadísticas
 */

// Mapeo de rubros - todas las variantes mapean al valor estandarizado
const RUBRO_MAPPING = {
  // Fontanería
  'fontaneria': 'Fontanería',
  'plomeria': 'Fontanería',
  'plomería': 'Fontanería',
  'fontanería': 'Fontanería',
  'FONTANERIA': 'Fontanería',
  'PLOMERIA': 'Fontanería',
  
  // Construcción
  'construccion': 'Construcción',
  'construcción': 'Construcción',
  'CONSTRUCCION': 'Construcción',
  'obra': 'Construcción',
  
  // Electricidad
  'electricidad': 'Electricidad',
  'electrico': 'Electricidad',
  'eléctrico': 'Electricidad',
  'ELECTRICIDAD': 'Electricidad',
  
  // Remodelación
  'remodelacion': 'Remodelación',
  'remodelación': 'Remodelación',
  'REMODELACION': 'Remodelación',
  
  // Pintura
  'pintura': 'Pintura',
  'PINTURA': 'Pintura',
  
  // Mantenimiento
  'mantenimiento': 'Mantenimiento',
  'MANTENIMIENTO': 'Mantenimiento',
  'mtto': 'Mantenimiento'
};

// Valores válidos finales para rubros
const VALID_RUBROS = ['Hogar', 'Comercial', 'Restaurantes', 'Hospitales', 'Emergencias'];

/**
 * Normaliza el nombre de un rubro a su valor estándar
 * @param {string} rubro - Rubro a normalizar
 * @returns {string} - Rubro normalizado
 */
export function normalizeRubro(rubro) {
  if (!rubro) return rubro;
  
  const cleaned = rubro.trim();
  const normalized = RUBRO_MAPPING[cleaned.toLowerCase()] || cleaned;
  
  // Si el normalizado está en válidos, usarlo; si no, mantener el original
  return VALID_RUBROS.includes(normalized) ? normalized : rubro;
}

/**
 * Normaliza nombre de servicio eliminando espacios extra y estandarizando mayúsculas
 * @param {string} serviceName - Nombre del servicio
 * @returns {string} - Nombre normalizado
 */
export function normalizeServiceName(serviceName) {
  if (!serviceName) return '';
  
  return serviceName
    .trim()
    .replace(/\s+/g, ' ') // Múltiples espacios -> un espacio
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase()); // Capitalizar primera letra de cada palabra
}

/**
 * Detecta y marca el origen de los datos (WhatsApp, sistema, manual)
 * @param {object} data - Datos del registro
 * @returns {string} - Origen del dato: "whatsapp_bot", "manual", "system"
 */
export function detectDataSource(data) {
  // Si viene de n8n/automatización
  if (data.created_by === 'system' || data.notes?.includes('WhatsApp') || data.notes?.includes('Bot')) {
    return 'whatsapp_bot';
  }
  
  // Si viene de email conocido (usuario registrado)
  if (data.created_by && data.created_by.includes('@')) {
    return 'manual';
  }
  
  return 'system';
}

/**
 * Normaliza número telefónico a formato E.164
 * @param {string} phone - Número telefónico
 * @returns {string} - Número en formato E.164 (+503...)
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('503') && digits.length === 11) return `+${digits}`;
  if (digits.length === 8) return `+503${digits}`;
  return String(phone).trim();
}

export function normalizeWaId(value) {
  if (!value) return '';
  return normalizePhone(String(value));
}

export function getCanonicalContactId({ phone, wa_id, normalized_phone, canonical_wa_id }) {
  return canonical_wa_id || normalized_phone || normalizeWaId(wa_id) || normalizePhone(phone) || '';
}

/**
 * Limpia y normaliza todos los campos de un inquiry que viene de n8n
 * @param {object} inquiry - Datos del trabajo
 * @returns {object} - Datos normalizados
 */
export function normalizeInquiryData(inquiry) {
  const normalizedPhone = inquiry.phone ? normalizePhone(inquiry.phone) : '';
  const normalized = {
    ...inquiry,
    source: detectDataSource(inquiry),
    normalized_phone: normalizedPhone || inquiry.normalized_phone || '',
    commercial_status: inquiry.commercial_status || 'nuevo',
    work_status: inquiry.work_status || inquiry.status || 'nuevo',
    conversation_status: inquiry.conversation_status || 'abierta',
    human_review_status: inquiry.human_review_status || 'not_required'
  };
  
  if (inquiry.rubro) {
    normalized.rubro = normalizeRubro(inquiry.rubro);
  }
  if (inquiry.service_type) {
    normalized.service_type = normalizeServiceName(inquiry.service_type);
  }
  if (normalizedPhone) {
    normalized.phone = normalizedPhone;
  }
  
  return normalized;
}

/**
 * Agrupa trabajos por cliente para vista consolidada
 * @param {Array} inquiries - Lista de trabajos
 * @param {Array} customers - Lista de clientes
 * @returns {Array} - Clientes con trabajos agrupados
 */
export function groupInquiriesByCustomer(inquiries, customers) {
  const grouped = {};
  
  inquiries.forEach(inquiry => {
    const customerId = inquiry.customer_id;
    if (!customerId) return;
    
    if (!grouped[customerId]) {
      const customer = customers.find(c => c.id === customerId);
      // Skip si no se encuentra el customer
      if (!customer) return;
      
      grouped[customerId] = {
        customer,
        jobs: [],
        totalAmount: 0,
        totalPaid: 0,
        activeJobsCount: 0
      };
    }
    
    grouped[customerId].jobs.push(inquiry);
    grouped[customerId].totalAmount += parseFloat(inquiry.final_amount || inquiry.quote_amount || 0);
    
    if (inquiry.status !== 'completado' && inquiry.status !== 'cancelado') {
      grouped[customerId].activeJobsCount++;
    }
  });
  
  return Object.values(grouped).filter(g => g.customer); // Filtrar entradas sin customer
}

/**
 * Calcula métricas de proyecto (múltiples servicios del mismo cliente)
 * @param {Array} jobs - Trabajos del cliente
 * @returns {object} - Métricas consolidadas
 */
export function calculateProjectMetrics(jobs) {
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completado').length;
  const activeJobs = jobs.filter(j => j.status !== 'completado' && j.status !== 'cancelado').length;
  
  const totalAmount = jobs.reduce((sum, j) => sum + parseFloat(j.final_amount || j.quote_amount || 0), 0);
  const avgProgress = jobs.reduce((sum, j) => sum + (j.progress_percentage || 0), 0) / totalJobs;
  
  const uniqueRubros = [...new Set(jobs.map(j => j.rubro).filter(Boolean))];
  
  return {
    totalJobs,
    completedJobs,
    activeJobs,
    totalAmount,
    avgProgress: Math.round(avgProgress),
    uniqueRubros,
    isMultiService: uniqueRubros.length > 1
  };
}