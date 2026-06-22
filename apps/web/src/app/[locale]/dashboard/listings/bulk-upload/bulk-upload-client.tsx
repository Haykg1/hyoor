'use client';

import type { BulkImportJobResponse, BulkImportPreviewResponse } from '@repo/shared';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { analyzeBulkImport, confirmBulkImport, getBulkImportJob } from '@/lib/api/properties';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

type Step = 'upload' | 'analyzing' | 'preview' | 'confirm' | 'started';

export function BulkUploadClient(): React.JSX.Element {
  const t = useTranslations('dashboard.bulk_upload');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<BulkImportJobResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setAnalyzeError(null);
      setStep('analyzing');
      try {
        const result = await analyzeBulkImport(file);
        setPreview(result);
        setStep('preview');
      } catch (err) {
        setAnalyzeError(err instanceof Error ? err.message : t('analyze_failed'));
        setStep('upload');
      }
    },
    [t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleConfirm = useCallback(async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const res = await confirmBulkImport(preview.previewId, locale);
      setJobId(res.jobId);
      setStep('started');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setConfirming(false);
    }
  }, [preview, locale]);

  const handlePollJob = useCallback(async () => {
    if (!jobId) return;
    const status = await getBulkImportJob(jobId).catch(() => null);
    if (status) setJobStatus(status);
  }, [jobId]);

  const importableCount = preview
    ? (preview.rows ?? []).filter((r) => r.status !== 'error').length
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <FileSpreadsheet className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      {/* Column guide (collapsible) */}
      <div className="mb-6 rounded-xl border border-border bg-muted/40">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium"
          onClick={() => setGuideOpen((v) => !v)}
        >
          {t('column_guide_title')}
          {guideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {guideOpen && (
          <div className="border-t border-border px-5 py-4 text-sm space-y-4">
            <div>
              <p className="font-semibold mb-2">{t('column_guide_required')}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">city</code> —
                  city name
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">address</code> —
                  full building address (geocoded automatically)
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">maxGuests</code>{' '}
                  — max number of guests
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">bedrooms</code> —
                  number of bedrooms
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">beds</code> —
                  number of beds
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">bathrooms</code>{' '}
                  — number of bathrooms
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    pricePerNight
                  </code>{' '}
                  — price in AMD
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    cancellationPolicy
                  </code>{' '}
                  — FLEXIBLE | MODERATE | STRICT | NON_REFUNDABLE
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">{t('column_guide_optional')}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">title</code> —{' '}
                  {t('column_guide_title_note')}
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    description
                  </code>{' '}
                  — {t('column_guide_description_note')}
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    propertyType
                  </code>{' '}
                  — {t('column_guide_property_type_note')} APARTMENT | HOUSE | VILLA | STUDIO |
                  GUESTHOUSE | HOTEL_ROOM | OTHER
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    cleaningFee
                  </code>{' '}
                  — {t('column_guide_cleaning_fee_note')}
                </li>
                <li>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    securityDeposit
                  </code>{' '}
                  — {t('column_guide_security_deposit_note')}
                </li>
                <li className="text-xs">
                  titleEn, titleRu, titleHy, region, minNights, maxNights, checkInTime,
                  checkOutTime, smokingAllowed, petsAllowed, partiesAllowed, additionalRules,
                  amenities
                </li>
              </ul>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">{t('column_guide_address_note')}</p>
              <p className="text-muted-foreground mb-1">{t('column_guide_amenities_note')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Step: Upload */}
      {(step === 'upload' || step === 'analyzing') && (
        <div className="rounded-2xl border border-border bg-card p-8">
          {/* Download buttons */}
          <div className="flex flex-wrap gap-3 mb-8">
            <a
              href="/templates/property-bulk-import-example.csv"
              download
              className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              <Download className="h-4 w-4" />
              {t('download_example')}
            </a>
            <a
              href="/templates/property-bulk-import-template.csv"
              download
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" />
              {t('download_blank')}
            </a>
          </div>

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/40',
              step === 'analyzing' && 'pointer-events-none opacity-60',
            )}
          >
            {step === 'analyzing' ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-medium text-muted-foreground">{t('analyzing')}</p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">{t('upload_hint')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('upload_limit')}</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />

          {analyzeError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {analyzeError}
            </div>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && preview && preview.summary && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{t('preview_title')}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t('preview_summary', {
                  valid: preview.summary.valid,
                  fixed: preview.summary.fixed,
                  error: preview.summary.error,
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreview(null);
                setStep('upload');
              }}
            >
              {t('upload_title')}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t('col_row')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('col_status')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('col_title')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('col_city')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('col_fixes')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('col_errors')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(preview.rows ?? []).map((row) => {
                  const norm = row.normalized as Record<string, string | undefined>;
                  return (
                    <tr
                      key={row.rowIndex}
                      className={cn(
                        row.status === 'error' && 'bg-destructive/5',
                        row.status === 'fixed' && 'bg-amber-50 dark:bg-amber-950/20',
                      )}
                    >
                      <td className="px-4 py-3 text-muted-foreground">{row.rowIndex + 1}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            row.status === 'error'
                              ? 'destructive'
                              : row.status === 'fixed'
                                ? 'secondary'
                                : 'default'
                          }
                          className="capitalize"
                        >
                          {t(
                            `row_status_${row.status}` as
                              | 'row_status_valid'
                              | 'row_status_fixed'
                              | 'row_status_error',
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium max-w-48 truncate">
                        {(norm.title as string | undefined) ?? row.original['title'] ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(norm.city as string | undefined) ?? row.original['city'] ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-48">
                        {row.fixes.length > 0
                          ? row.fixes
                              .map((f) => `${f.field}: ${String(f.from)} → ${String(f.to)}`)
                              .join(', ')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-destructive max-w-48">
                        {row.errors.length > 0 ? row.errors.join('; ') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {importableCount === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_importable')}</p>
          ) : (
            <Button onClick={() => void handleConfirm()} disabled={confirming} className="gap-2">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('confirm_button', { count: importableCount })}
            </Button>
          )}
        </div>
      )}

      {/* Step: Started */}
      {step === 'started' && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">{t('started_title')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('started_message', { email: user?.email ?? '' })}
          </p>
          {jobId && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => void handlePollJob()}>
                {t('poll_status')}
              </Button>
              {jobStatus && (
                <p className="mt-2 text-sm">
                  {jobStatus.status === 'processing'
                    ? t('job_processing')
                    : jobStatus.status === 'completed' ||
                        jobStatus.status === 'completed_with_email_error'
                      ? `${t('job_completed')} — ${jobStatus.summary?.created ?? 0} created, ${jobStatus.summary?.failed ?? 0} failed`
                      : t('job_failed')}
                </p>
              )}
            </div>
          )}
          <div className="pt-2">
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
