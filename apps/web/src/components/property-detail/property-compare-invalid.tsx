import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface PropertyCompareInvalidProps {
  reason: 'missing' | 'not_found' | 'same' | 'expired';
}

const REASON_MESSAGE_KEYS: Record<PropertyCompareInvalidProps['reason'], string> = {
  missing: 'errors.invalid_params',
  same: 'errors.same_property',
  not_found: 'errors.not_found_page',
  expired: 'errors.expired',
};

export async function PropertyCompareInvalid({
  reason,
}: PropertyCompareInvalidProps): Promise<React.JSX.Element> {
  const t = await getTranslations('property.compare');
  const messageKey = REASON_MESSAGE_KEYS[reason];
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <h1 className="text-xl font-semibold">{t('page_title')}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t(messageKey)}</p>
      <Button className="mt-6" asChild>
        <Link href="/search">{t('back_to_search')}</Link>
      </Button>
    </div>
  );
}
