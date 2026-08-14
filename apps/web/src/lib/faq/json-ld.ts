import {
  COMPANY,
  DEPOSIT_CLAIM_WINDOW_HOURS,
  PAYOUT_DELAY_HOURS,
  PLATFORM_FEE_PERCENT_DEFAULT,
} from '@repo/shared';

export function getFaqI18nValues(): {
  siteName: string;
  legalName: string;
  address: string;
  feePercent: string;
  payoutHours: string;
  claimHours: string;
} {
  return {
    siteName: COMPANY.websiteName,
    legalName: COMPANY.legalEntityName,
    address: COMPANY.address,
    feePercent: String(PLATFORM_FEE_PERCENT_DEFAULT),
    payoutHours: String(PAYOUT_DELAY_HOURS),
    claimHours: String(DEPOSIT_CLAIM_WINDOW_HOURS),
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
