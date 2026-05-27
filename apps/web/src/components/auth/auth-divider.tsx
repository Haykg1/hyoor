import { useTranslations } from 'next-intl';

export function AuthDivider(): React.JSX.Element {
  const t = useTranslations('auth');
  return (
    <div className="relative my-2 flex items-center">
      <div className="h-px flex-1 bg-border" />
      <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t('divider')}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
