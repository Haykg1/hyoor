'use client';

import type { PropertySummary } from '@repo/shared';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { PropertyCard } from '@/components/property';
import { CategoryFilter, type CategoryFilterOption } from '@/components/ui/category-filter';
import { Link } from '@/i18n/navigation';
import {
  PROPERTY_CATEGORIES,
  type PropertyCategory,
  categoryFromPropertyType,
} from '@/lib/api/properties';

type Category = 'all' | PropertyCategory;
const CATEGORY_VALUES: Category[] = ['all', ...PROPERTY_CATEGORIES];

interface FeaturedStaysProps {
  properties: PropertySummary[];
}

export function FeaturedStays({ properties }: FeaturedStaysProps): React.JSX.Element {
  const t = useTranslations('home.featured');
  const tc = useTranslations('home.featured.categories');
  const [active, setActive] = useState<Category>('all');
  const options = useMemo<CategoryFilterOption<Category>[]>(
    () => CATEGORY_VALUES.map((value) => ({ value, label: tc(value) })),
    [tc],
  );
  const visible = useMemo(() => {
    if (active === 'all') return properties;
    return properties.filter(
      (property) => categoryFromPropertyType(property.propertyType) === active,
    );
  }, [active, properties]);
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">{t('title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href="/search"
          className="hidden items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 sm:inline-flex"
        >
          {t('search_all')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <CategoryFilter
        className="mb-8"
        options={options}
        active={active}
        onChange={setActive}
        ariaLabel={t('title')}
      />
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </section>
  );
}
