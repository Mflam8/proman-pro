export const normalizePhone = (value) => {
  if (!value) return '';
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('503')) return `+${digits}`;
  if (digits.length === 8) return `+503${digits}`;
  return `+${digits}`;
};

export const getPhoneVariants = (value) => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/[^\d]/g, '');
  const normalized = normalizePhone(raw);
  const variants = new Set();

  if (raw) variants.add(raw);
  if (digits) {
    variants.add(digits);
    variants.add(`+${digits}`);
  }
  if (normalized) variants.add(normalized);

  if (digits.startsWith('503') && digits.length >= 11) {
    variants.add(digits.slice(3));
  } else if (digits.length === 8) {
    variants.add(`503${digits}`);
  }

  return [...variants].filter(Boolean);
};

export const buildConversationKey = (phone, channelId) => {
  const normalizedPhone = normalizePhone(phone) || 'unknown';
  const normalizedChannel = normalizePhone(channelId) || String(channelId || '').trim() || 'unknown';
  return `${normalizedPhone}_${normalizedChannel}`;
};