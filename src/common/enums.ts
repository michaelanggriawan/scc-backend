// ─── Domain enums mirrored from the SCC wireframe (SCC 2/src/app/App.tsx) ───

export enum UserRole {
  Customer = 'customer',
  Admin = 'admin',
}

export enum EntityStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

// Inquiry lifecycle. Order matters conceptually but transitions are guarded
// explicitly in InquiriesService, not by ordinal.
export enum InquiryStatus {
  NewInquiry = 'New Inquiry',
  AwaitingPayment = 'Awaiting Payment',
  PaymentSubmitted = 'Payment Submitted',
  Confirmed = 'Confirmed',
  PaymentRejected = 'Payment Rejected',
  Cancelled = 'Cancelled',
}

export enum CancelledBy {
  Customer = 'Customer',
  Admin = 'Admin',
  System = 'System',
}

// Statuses where the customer may self-cancel (from App.tsx CUSTOMER_CANCELLABLE_STATUSES)
export const CUSTOMER_CANCELLABLE_STATUSES: InquiryStatus[] = [
  InquiryStatus.NewInquiry,
  InquiryStatus.AwaitingPayment,
  InquiryStatus.PaymentSubmitted,
  InquiryStatus.PaymentRejected,
];

// Statuses where admin may still edit deal terms (from App.tsx EDITABLE_INQUIRY_STATUSES)
export const EDITABLE_INQUIRY_STATUSES: InquiryStatus[] = [
  InquiryStatus.NewInquiry,
  InquiryStatus.AwaitingPayment,
  InquiryStatus.PaymentRejected,
];

// Statuses from which the customer can (re)submit proof of payment
export const PAYABLE_STATUSES: InquiryStatus[] = [
  InquiryStatus.AwaitingPayment,
  InquiryStatus.PaymentRejected,
];

export const EVENT_CATEGORIES = [
  'Corporate Conference / Seminar',
  'Exhibition & Trade Show',
  'Concert & Live Performance',
  'Wedding & Social Event',
  'Government & Ceremony',
  'Hybrid / Virtual Event',
  'Other',
];

// Fixed set of production systems each room specs out (from App.tsx SPEC_SYSTEMS)
export const SPEC_SYSTEMS = [
  'LED Display',
  'Sound System',
  'Rigging',
  'Lighting',
  'Power Supply',
  'Connectivity',
  'IMAG / Projection',
  'Communication',
];
