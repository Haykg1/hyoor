import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export function FooterBottom(): React.JSX.Element {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
      <span>{t('copyright', { year })}</span>
      <div className="flex gap-4">
        <Link href="/" className="transition-colors hover:text-foreground">
          {t('privacy')}
        </Link>
        <Link href="/" className="transition-colors hover:text-foreground">
          {t('terms')}
        </Link>
      </div>
    </div>
  );
}
