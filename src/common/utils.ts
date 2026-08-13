import { randomBytes } from 'crypto';

// Human-facing inquiry reference, e.g. SCC-2026-0041
export function buildInquiryRef(year: number, sequence: number): string {
  return `SCC-${year}-${String(sequence).padStart(4, '0')}`;
}

// Opaque, hard-to-guess token for public payment links.
export function generatePaymentToken(): string {
  return randomBytes(24).toString('base64url');
}

// A booking whose payment due date has passed is dead. dueDate is an ISO
// datetime string or Date; compares against the exact current moment.
export function isPastDue(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) return false;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  return due.getTime() < Date.now();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

// "HH:MM" -> minutes since midnight, or null if malformed.
export function parseTimeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Leading integer of a duration string ("8" or legacy "8 hours" both -> 8).
export function parseDurationHours(duration: string): number {
  const n = parseInt(duration, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// minutes since midnight -> "HH:MM". Not wrapped at 24h — a booking that
// runs past midnight (e.g. start 22:00 + 5h) prints "27:00" rather than
// silently rolling over to an early-morning time on the same date.
export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Human-readable due date/time for customer-facing emails, e.g. "12 Aug 2026, 14:30".
export function formatDueDate(dueDate: string | Date | null | undefined): string {
  if (!dueDate) return '—';
  const d = dueDate instanceof Date ? dueDate : new Date(dueDate);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
