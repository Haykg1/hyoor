/** Public company identity — legal pages, contact, FAQ, and API mail defaults. */
export const COMPANY = {
  websiteName: 'Arimna.am',
  legalEntityName: 'Hayk Ghazaryan Armeni',
  registrationNumber: '010200210',
  address: 'Azatutyan 11/55, 0037 Yerevan, Armenia',
  cityCountry: 'Yerevan, Armenia',
  phone: '+374 55 151515',
  supportEmail: 'support@arimna.am',
  infoEmail: 'info@arimna.am',
  privacyEmail: 'privacy@arimna.am',
} as const;

export const CONTACT_SUPPORT_EMAIL = COMPANY.supportEmail;
export const CONTACT_INFO_EMAIL = COMPANY.infoEmail;
