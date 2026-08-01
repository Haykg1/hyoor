'use client';

import type { PropertyDetail, StayFeeRuleInput, StayFeeRulesMode } from '@repo/shared';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  getStayFeeEditorValidation,
  StayFeeRulesEditor,
} from '@/components/listing-wizard/stay-fee-rules-editor';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { patchProperty } from '@/lib/api/properties';
import { hydrateSimpleFeeAmounts } from '@/lib/stay-fee-rules-hydration';
import { translateStayFeeValidationCode } from '@/lib/stay-fee-rules-i18n';

interface CalendarStayFeesSectionProps {
  property: PropertyDetail;
  onPropertyUpdated?: (property: PropertyDetail) => void;
}

function mapStayFeeRules(rules: PropertyDetail['stayFeeRules']): StayFeeRuleInput[] {
  return (rules ?? []).map((rule) => ({
    id: rule.id,
    dateFrom: rule.dateFrom,
    dateTo: rule.dateTo,
    minNights: rule.minNights,
    maxNights: rule.maxNights,
    cleaningFee: rule.cleaningFee,
    depositType: rule.depositType,
    depositValue: rule.depositValue,
    sortOrder: rule.sortOrder,
  }));
}

export function CalendarStayFeesSection({
  property,
  onPropertyUpdated,
}: CalendarStayFeesSectionProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.fees');
  const tValidation = useTranslations('stay_fee_rules');
  const initialRules = mapStayFeeRules(property.stayFeeRules);
  const initialFees = hydrateSimpleFeeAmounts({
    cleaningFee: property.cleaningFee,
    securityDeposit: property.securityDeposit,
    stayFeeRules: initialRules,
  });
  const [mode, setMode] = useState<StayFeeRulesMode>(property.stayFeeRulesMode ?? 'SIMPLE');
  const [cleaningFee, setCleaningFee] = useState(initialFees.cleaningFee);
  const [securityDeposit, setSecurityDeposit] = useState(initialFees.securityDeposit);
  const [rules, setRules] = useState<StayFeeRuleInput[]>(initialRules);
  const [saving, setSaving] = useState(false);
  const validationCode = useMemo(
    () =>
      getStayFeeEditorValidation({
        mode,
        rules,
        cleaningFee,
        securityDeposit,
        propertyMinNights: property.minNights,
        propertyMaxNights: property.maxNights,
        propertyPricePerNight: property.pricePerNight,
      }),
    [
      mode,
      rules,
      cleaningFee,
      securityDeposit,
      property.minNights,
      property.maxNights,
      property.pricePerNight,
    ],
  );
  const canSave = validationCode === null;
  async function handleSave(): Promise<void> {
    if (!canSave) return;
    setSaving(true);
    try {
      const updated = await patchProperty(property.id, {
        stayFeeRulesMode: mode,
        ...(mode === 'SIMPLE' ? { cleaningFee, securityDeposit } : { stayFeeRules: rules }),
      });
      const updatedRules = mapStayFeeRules(updated.stayFeeRules);
      const updatedFees = hydrateSimpleFeeAmounts({
        cleaningFee: updated.cleaningFee,
        securityDeposit: updated.securityDeposit,
        stayFeeRules: updatedRules,
      });
      setMode(updated.stayFeeRulesMode ?? 'SIMPLE');
      setCleaningFee(updatedFees.cleaningFee);
      setSecurityDeposit(updatedFees.securityDeposit);
      setRules(updatedRules);
      onPropertyUpdated?.(updated);
      toast.success(t('saved'));
    } catch (error: unknown) {
      const rawMessage = error instanceof ApiError ? error.message : null;
      const apiMessage = rawMessage
        ? (translateStayFeeValidationCode(tValidation, rawMessage) ?? rawMessage)
        : null;
      toast.error(apiMessage ?? t('save_failed'));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <StayFeeRulesEditor
        mode={mode}
        rules={rules}
        cleaningFee={cleaningFee}
        securityDeposit={securityDeposit}
        currency={property.currency}
        propertyMinNights={property.minNights}
        propertyMaxNights={property.maxNights}
        propertyPricePerNight={property.pricePerNight}
        onModeChange={setMode}
        onCleaningFeeChange={setCleaningFee}
        onSecurityDepositChange={setSecurityDeposit}
        onRulesChange={setRules}
      />
      <div className="flex justify-end">
        <Button type="button" onClick={() => void handleSave()} disabled={saving || !canSave}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('save')}
        </Button>
      </div>
    </section>
  );
}
