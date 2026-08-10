import { randomBytes } from 'crypto';

// Human-facing inquiry reference, e.g. SCC-2026-0041
export function buildInquiryRef(year: number, sequence: number): string {
  return `SCC-${year}-${String(sequence).padStart(4, '0')}`;
}

// Opaque, hard-to-guess token for public payment links.
export function generatePaymentToken(): string {
  return randomBytes(24).toString('base64url');
}

// A booking whose payment due date has passed is dead (matches App.tsx isPastDue).
// dueDate is an ISO date string (YYYY-MM-DD) or Date; compares against today (UTC date).
export function isPastDue(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  const due =
    dueDate instanceof Date
      ? dueDate.toISOString().slice(0, 10)
      : String(dueDate).slice(0, 10);
  return due < today;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
