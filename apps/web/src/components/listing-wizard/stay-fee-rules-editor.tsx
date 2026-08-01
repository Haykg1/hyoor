'use client';

import type { StayFeeDepositType, StayFeeRuleInput, StayFeeRulesMode } from '@repo/shared';
import {
  buildSimpleCatchAllRule,
  deriveSimpleFees,
  hasYearRoundFallback,
  validateStayFeeRules,
} from '@repo/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  SettlementMoneyInput,
  useMoneyInputCurrency,
} from '@/components/currency/settlement-money-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { translateStayFeeValidationCode } from '@/lib/stay-fee-rules-i18n';
import { cn } from '@/lib/utils';

export interface StayFeeRulesEditorProps {
  mode: StayFeeRulesMode;
  rules: StayFeeRuleInput[];
  cleaningFee: number;
  securityDeposit: number;
  currency: string;
  propertyMinNights?: number;
  propertyMaxNights?: number | null;
  propertyPricePerNight?: number | null;
  onModeChange: (mode: StayFeeRulesMode) => void;
  onCleaningFeeChange: (value: number) => void;
  onSecurityDepositChange: (value: number) => void;
  onRulesChange: (rules: StayFeeRuleInput[]) => void;
  className?: string;
  showModeLabel?: boolean;
}

interface SeasonGroup {
  dateFrom: string | null;
  dateTo: string | null;
  bands: StayFeeRuleInput[];
}

function seasonKey(rule: StayFeeRuleInput): string {
  if (rule.dateFrom == null && rule.dateTo == null) return '__default__';
  return `${rule.dateFrom ?? ''}:${rule.dateTo ?? ''}`;
}

function groupBySeason(rules: StayFeeRuleInput[]): SeasonGroup[] {
  const map = new Map<string, SeasonGroup>();
  for (const rule of rules) {
    const key = seasonKey(rule);
    const existing = map.get(key);
    if (existing) {
      existing.bands.push(rule);
      continue;
    }
    map.set(key, {
      dateFrom: rule.dateFrom ?? null,
      dateTo: rule.dateTo ?? null,
      bands: [rule],
    });
  }
  return [...map.values()];
}

function flattenSeasons(seasons: SeasonGroup[]): StayFeeRuleInput[] {
  return seasons.flatMap((season, seasonIndex) =>
    season.bands.map((band, bandIndex) => ({
      ...band,
      dateFrom: season.dateFrom,
      dateTo: season.dateTo,
      sortOrder: seasonIndex * 100 + bandIndex,
    })),
  );
}

function emptyBand(minNights = 1): StayFeeRuleInput {
  return {
    dateFrom: null,
    dateTo: null,
    minNights,
    maxNights: null,
    cleaningFee: 0,
    depositType: 'FIXED',
    depositValue: 0,
  };
}

function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function clampFixedDepositValue(value: number, pricePerNight: number | null | undefined): number {
  const safe = Math.max(0, value);
  if (pricePerNight == null || pricePerNight <= 0) return safe;
  return Math.min(safe, pricePerNight);
}

function clampPercentDepositValue(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function getStayFeeEditorValidation(params: {
  mode: StayFeeRulesMode;
  rules: StayFeeRuleInput[];
  cleaningFee: number;
  securityDeposit: number;
  propertyMinNights?: number;
  propertyMaxNights?: number | null;
  propertyPricePerNight?: number | null;
}) {
  const rulesForValidation =
    params.mode === 'SIMPLE'
      ? [buildSimpleCatchAllRule(params.cleaningFee, params.securityDeposit)]
      : params.rules;
  return validateStayFeeRules({
    mode: params.mode,
    rules: rulesForValidation,
    propertyMinNights: params.propertyMinNights,
    propertyMaxNights: params.propertyMaxNights,
    propertyPricePerNight: params.propertyPricePerNight,
  });
}

export function StayFeeRulesEditor({
  mode,
  rules,
  cleaningFee,
  securityDeposit,
  currency,
  propertyMinNights = 1,
  propertyMaxNights = null,
  propertyPricePerNight = null,
  onModeChange,
  onCleaningFeeChange,
  onSecurityDepositChange,
  onRulesChange,
  className,
  showModeLabel = false,
}: StayFeeRulesEditorProps): React.JSX.Element {
  const t = useTranslations('stay_fee_rules');
  const moneyCurrency = useMoneyInputCurrency(currency);
  const seasons = groupBySeason(rules.length > 0 ? rules : [buildSimpleCatchAllRule(0, 0)]);
  const validationCode = getStayFeeEditorValidation({
    mode,
    rules,
    cleaningFee,
    securityDeposit,
    propertyMinNights,
    propertyMaxNights,
    propertyPricePerNight,
  });
  const validationMessage = translateStayFeeValidationCode(t, validationCode);
  const showCoverageWarning = mode === 'RULES' && !hasYearRoundFallback(rules);
  function updateSeasons(next: SeasonGroup[]): void {
    onRulesChange(flattenSeasons(next));
  }
  function handleModeChange(next: StayFeeRulesMode): void {
    onModeChange(next);
    if (next === 'SIMPLE') {
      const derived = deriveSimpleFees(rules);
      onCleaningFeeChange(derived.cleaningFee);
      onSecurityDepositChange(derived.securityDeposit);
      return;
    }
    if (rules.length === 0) {
      onRulesChange([buildSimpleCatchAllRule(cleaningFee, securityDeposit)]);
    }
  }
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        {showModeLabel ? <p className="mb-2 text-sm font-medium">{t('mode_label')}</p> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {(['SIMPLE', 'RULES'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleModeChange(value)}
              className={cn(
                'rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors',
                mode === value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <span className="font-medium">{t(`modes.${value}`)}</span>
              <p className="mt-1 text-xs text-muted-foreground">{t(`mode_hints.${value}`)}</p>
            </button>
          ))}
        </div>
      </div>
      {mode === 'SIMPLE' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('cleaning_fee')} ({moneyCurrency})
            </label>
            <SettlementMoneyInput
              settlementCurrency={currency}
              value={cleaningFee}
              onValueChange={onCleaningFeeChange}
              placeholder={t('cleaning_placeholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('security_deposit')} ({moneyCurrency})
            </label>
            <SettlementMoneyInput
              settlementCurrency={currency}
              value={securityDeposit}
              onValueChange={(value) =>
                onSecurityDepositChange(clampFixedDepositValue(value, propertyPricePerNight))
              }
              placeholder={t('deposit_placeholder')}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('rules_hint')}</p>
          {showCoverageWarning ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              {t('coverage_warning')}
            </p>
          ) : null}
          {seasons.map((season, seasonIndex) => (
            <div
              key={`season-${seasonIndex}`}
              className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('date_from')}
                    </label>
                    <Input
                      type="date"
                      value={season.dateFrom ?? ''}
                      onChange={(e) => {
                        const next = [...seasons];
                        const value = e.target.value || null;
                        next[seasonIndex] = {
                          ...season,
                          dateFrom: value,
                          dateTo: value && !season.dateTo ? value : season.dateTo,
                        };
                        updateSeasons(next);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('date_to')}
                    </label>
                    <Input
                      type="date"
                      value={season.dateTo ?? ''}
                      onChange={(e) => {
                        const next = [...seasons];
                        const value = e.target.value || null;
                        next[seasonIndex] = {
                          ...season,
                          dateTo: value,
                          dateFrom: value && !season.dateFrom ? value : season.dateFrom,
                        };
                        updateSeasons(next);
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={seasons.length <= 1}
                  onClick={() => updateSeasons(seasons.filter((_, i) => i !== seasonIndex))}
                  aria-label={t('remove_season')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {season.dateFrom == null && season.dateTo == null
                  ? t('year_round_hint')
                  : t('season_window_hint')}
              </p>
              <div className="space-y-3">
                {season.bands.map((band, bandIndex) => (
                  <div
                    key={`band-${seasonIndex}-${bandIndex}`}
                    className="space-y-3 rounded-lg border border-border/60 bg-background p-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('min_nights')}</label>
                        <Input
                          type="number"
                          min={1}
                          value={band.minNights}
                          onChange={(e) => {
                            const next = [...seasons];
                            const bands = [...season.bands];
                            bands[bandIndex] = {
                              ...band,
                              minNights: Number(e.target.value) || 1,
                            };
                            next[seasonIndex] = { ...season, bands };
                            updateSeasons(next);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('max_nights')}</label>
                        <Input
                          type="number"
                          min={1}
                          placeholder={t('max_nights_open')}
                          value={band.maxNights ?? ''}
                          onChange={(e) => {
                            const next = [...seasons];
                            const bands = [...season.bands];
                            const val = e.target.value;
                            bands[bandIndex] = {
                              ...band,
                              maxNights: val === '' ? null : Number(val) || null,
                            };
                            next[seasonIndex] = { ...season, bands };
                            updateSeasons(next);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {t('cleaning_fee')} ({moneyCurrency})
                        </label>
                        <SettlementMoneyInput
                          settlementCurrency={currency}
                          value={band.cleaningFee}
                          onValueChange={(value) => {
                            const next = [...seasons];
                            const bands = [...season.bands];
                            bands[bandIndex] = { ...band, cleaningFee: value };
                            next[seasonIndex] = { ...season, bands };
                            updateSeasons(next);
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('deposit_type')}</label>
                        <Select
                          value={band.depositType}
                          onValueChange={(value: StayFeeDepositType) => {
                            const next = [...seasons];
                            const bands = [...season.bands];
                            bands[bandIndex] = {
                              ...band,
                              depositType: value,
                              depositValue:
                                value === 'PERCENT'
                                  ? clampPercentDepositValue(band.depositValue)
                                  : clampFixedDepositValue(
                                      band.depositValue,
                                      propertyPricePerNight,
                                    ),
                            };
                            next[seasonIndex] = { ...season, bands };
                            updateSeasons(next);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIXED">{t('deposit_types.FIXED')}</SelectItem>
                            <SelectItem value="PERCENT">{t('deposit_types.PERCENT')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {band.depositType === 'PERCENT'
                            ? t('deposit_percent')
                            : `${t('security_deposit')} (${moneyCurrency})`}
                        </label>
                        {band.depositType === 'PERCENT' ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={band.depositValue}
                            onChange={(e) => {
                              const next = [...seasons];
                              const bands = [...season.bands];
                              bands[bandIndex] = {
                                ...band,
                                depositValue: clampPercentDepositValue(Number(e.target.value) || 0),
                              };
                              next[seasonIndex] = { ...season, bands };
                              updateSeasons(next);
                            }}
                          />
                        ) : (
                          <SettlementMoneyInput
                            settlementCurrency={currency}
                            value={band.depositValue}
                            onValueChange={(value) => {
                              const next = [...seasons];
                              const bands = [...season.bands];
                              bands[bandIndex] = {
                                ...band,
                                depositValue: clampFixedDepositValue(value, propertyPricePerNight),
                              };
                              next[seasonIndex] = { ...season, bands };
                              updateSeasons(next);
                            }}
                          />
                        )}
                      </div>
                      <div className="flex justify-end sm:justify-start">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={season.bands.length <= 1}
                          onClick={() => {
                            const next = [...seasons];
                            next[seasonIndex] = {
                              ...season,
                              bands: season.bands.filter((_, i) => i !== bandIndex),
                            };
                            updateSeasons(next);
                          }}
                          aria-label={t('remove_band')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = [...seasons];
                  const lastMax = season.bands[season.bands.length - 1]?.maxNights;
                  const nextMin =
                    lastMax != null && Number.isFinite(lastMax) ? lastMax + 1 : propertyMinNights;
                  next[seasonIndex] = {
                    ...season,
                    bands: [...season.bands, emptyBand(nextMin)],
                  };
                  updateSeasons(next);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t('add_band')}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const hasYearRound = seasons.some(
                (season) => season.dateFrom == null && season.dateTo == null,
              );
              const today = todayIsoUtc();
              updateSeasons([
                ...seasons,
                {
                  dateFrom: hasYearRound ? today : null,
                  dateTo: hasYearRound ? today : null,
                  bands: [emptyBand(propertyMinNights)],
                },
              ]);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('add_season')}
          </Button>
        </div>
      )}
      {validationMessage ? <p className="text-sm text-destructive">{validationMessage}</p> : null}
    </div>
  );
}
