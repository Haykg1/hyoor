'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { listMyBookings } from '@/lib/api/bookings';
import { createReview } from '@/lib/api/reviews';

interface WriteReviewModalProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewSubmitted: () => Promise<void>;
  hasReviewed?: boolean;
}

export function WriteReviewModal({
  propertyId,
  open,
  onOpenChange,
  onReviewSubmitted,
  hasReviewed = false,
}: WriteReviewModalProps): React.JSX.Element {
  const t = useTranslations('property_detail.reviews');
  const [eligibleBookingId, setEligibleBookingId] = useState<string | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverConflict, setServerConflict] = useState(false);

  useEffect(() => {
    if (!open || hasReviewed) return;
    setCheckingEligibility(true);
    setEligibleBookingId(null);
    setServerConflict(false);
    setRating(0);
    setComment('');
    listMyBookings({ status: 'COMPLETED', limit: 50 })
      .then((result) => {
        const match = result.data.find((b) => b.propertyId === propertyId);
        setEligibleBookingId(match?.id ?? null);
      })
      .catch(() => setEligibleBookingId(null))
      .finally(() => setCheckingEligibility(false));
  }, [open, propertyId, hasReviewed]);

  async function handleSubmit() {
    if (!eligibleBookingId || rating === 0) return;
    setSubmitting(true);
    try {
      await createReview({ bookingId: eligibleBookingId, rating, comment: comment || undefined });
      toast.success(t('submit_success'));
      onOpenChange(false);
      await onReviewSubmitted();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        setServerConflict(true);
      } else {
        toast.error(t('submit_error'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('write_review')}</DialogTitle>
          <DialogDescription>{t('write_review_subtitle')}</DialogDescription>
        </DialogHeader>
        {hasReviewed || serverConflict ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('already_reviewed')}</p>
        ) : checkingEligibility ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('checking')}</p>
        ) : eligibleBookingId === null ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('no_eligible_booking')}
          </p>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('rating_label')}</p>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starVal = i + 1;
                  const filled = starVal <= (hoverRating || rating);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`${starVal} star`}
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('comment_label')}</p>
              <Textarea
                placeholder={t('comment_placeholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={rating === 0 || submitting}>
                {submitting ? t('submitting') : t('submit')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
