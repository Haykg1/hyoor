'use client';

import { Check, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createCompareShareLink } from '@/lib/api/compare-share';

interface CompareShareButtonProps {
  leftId: string;
  rightId: string;
}

export function CompareShareButton({
  leftId,
  rightId,
}: CompareShareButtonProps): React.JSX.Element {
  const t = useTranslations('property.compare');
  const locale = useLocale();
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  async function handleShare(): Promise<void> {
    setIsSharing(true);
    try {
      const { token } = await createCompareShareLink(leftId, rightId);
      const url = `${window.location.origin}/${locale}/compare/s/${token}`;
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('share_copied'));
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      toast.error(t('share_error'));
    } finally {
      setIsSharing(false);
    }
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isSharing}
            onClick={() => void handleShare()}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : (
              <Share2 className="h-4 w-4" aria-hidden />
            )}
            {t('share')}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {t('share_tooltip')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
