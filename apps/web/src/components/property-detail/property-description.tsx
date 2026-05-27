import { useTranslations } from 'next-intl';

interface PropertyDescriptionProps {
  description: string | null;
}

export function PropertyDescription({
  description,
}: PropertyDescriptionProps): React.JSX.Element | null {
  const t = useTranslations('property_detail.about');
  if (!description) return null;
  return (
    <section className="space-y-3 border-b border-border py-6">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{description}</p>
    </section>
  );
}
