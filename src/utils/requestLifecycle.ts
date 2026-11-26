const ARCHIVED_STATUSES: ReadonlySet<string> = new Set(['closed', 'delivered', 'completed']);

export function normalizeRequestStatus(status: unknown): string {
  return String(status ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function isArchivedStatus(status: unknown): boolean {
  return ARCHIVED_STATUSES.has(normalizeRequestStatus(status));
}
