import { COMPANY, PLATFORM_FEE_PERCENT_DEFAULT } from '@repo/shared';

export function getFaqI18nValues(): {
  siteName: string;
  legalName: string;
  address: string;
  feePercent: string;
} {
  return {
    siteName: COMPANY.websiteName,
    legalName: COMPANY.legalEntityName,
    address: COMPANY.address,
    feePercent: String(PLATFORM_FEE_PERCENT_DEFAULT),
  };
}

export function stripFaqMarkup(value: string): string {
  return value
    .replace(/<\/?[a-zA-Z]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildFaqPageJsonLd(items: Array<{ question: string; answer: string }>): {
  '@context': string;
  '@type': string;
  mainEntity: Array<{
    '@type': string;
    name: string;
    acceptedAnswer: { '@type': string; text: string };
  }>;
} {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
