/**
 * Saving reminder times is a server-side config action; it does not require
 * browser Notification permission (that only gates local push subscription).
 */
export function canSaveReminders(_permission: string | null): boolean {
  return true;
}
