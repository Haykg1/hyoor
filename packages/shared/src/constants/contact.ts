export const CONTACT_ROLES = ['guest', 'host', 'partner'] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_TOPICS = [
  'general',
  'booking',
  'host_onboarding',
  'payment_refunds',
  'technical',
  'partnership_press',
  'report_listing',
  'other',
] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export type ContactInbox = 'support' | 'info';

export interface ContactInquiryRequest {
  name: string;
  email: string;
  role: ContactRole;
  topic: ContactTopic;
  message: string;
}

export interface ContactInquiryResponse {
  inbox: ContactInbox;
}

/** Company/press mail goes to info; guest and host operational mail goes to support. */
export function resolveContactInbox(role: ContactRole, topic: ContactTopic): ContactInbox {
  if (role === 'partner' || topic === 'partnership_press') {
    return 'info';
  }
  return 'support';
}
