export function unwrapRecord(record) {
  if (!record) return record;
  return record.data ? { ...record, ...record.data } : record;
}

export function unwrapRecords(records = []) {
  return records.map(unwrapRecord);
}