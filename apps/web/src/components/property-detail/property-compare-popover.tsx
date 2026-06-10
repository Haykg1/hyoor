'use client';

import { Check, Copy, GitCompare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from '@/i18n/navigation';
import { fetchPropertyDetailClient } from '@/lib/api/properties';

interface PropertyComparePopoverProps {
  propertyId: string;
}

export function PropertyComparePopover({
  propertyId,
}: PropertyComparePopoverProps): React.JSX.Element {
  const t = useTranslations('property.compare');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [otherId, setOtherId] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [copied, setCopied] = useState(false);
  async function handleCopyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(propertyId);
      setCopied(true);
      toast.success(t('copy_success'));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copy_error'));
    }
  }
  async function handleCompare(): Promise<void> {
    const trimmed = otherId.trim();
    if (!trimmed) {
      setError(t('errors.required'));
      return;
    }
    if (trimmed === propertyId) {
      setError(t('errors.same_property'));
      return;
    }
    setError('');
    setIsValidating(true);
    try {
      const found = await fetchPropertyDetailClient(trimmed);
      if (!found) {
        setError(t('errors.not_found'));
        return;
      }
      setOpen(false);
      setOtherId('');
      router.push(
        `/compare?left=${encodeURIComponent(propertyId)}&right=${encodeURIComponent(trimmed)}`,
      );
    } catch {
      setError(t('errors.not_found'));
    } finally {
      setIsValidating(false);
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
                <GitCompare className="h-3.5 w-3.5" aria-hidden />
                <span className="text-xs">{t('button')}</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {t('tooltip')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-4" align="end" side="bottom">
        <div className="space-y-3">
          <p className="text-sm font-medium">{t('popover_title')}</p>
          <div className="space-y-1.5">
            <Label htmlFor="compare-property-id" className="text-xs">
              {t('property_id_label')}
            </Label>
            <Input
              id="compare-property-id"
              value={otherId}
              onChange={(e) => {
                setOtherId(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('property_id_placeholder')}
              className="h-9 font-mono text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCompare();
                }
              }}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleCopyId()}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {t('copy_id')}
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={isValidating}
              onClick={() => void handleCompare()}
            >
              {t('compare_action')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
