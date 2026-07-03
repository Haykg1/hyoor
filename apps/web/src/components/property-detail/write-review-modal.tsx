'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
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
import { createReview, uploadReviewPhoto } from '@/lib/api/reviews';

const MAX_PHOTOS = 5;
const ACCEPTED = 'image/jpeg,image/png,image/webp';

interface PendingPhoto {
  file: File;
  previewUrl: string;
}

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
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverConflict, setServerConflict] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || hasReviewed) return;
    setCheckingEligibility(true);
    setEligibleBookingId(null);
    setServerConflict(false);
    setRating(0);
    setComment('');
    setPhotos([]);
    listMyBookings({ status: 'COMPLETED', limit: 50 })
      .then((result) => {
        const match = result.data.find((b) => b.propertyId === propertyId);
        setEligibleBookingId(match?.id ?? null);
      })
      .catch(() => setEligibleBookingId(null))
      .finally(() => setCheckingEligibility(false));
  }, [open, propertyId, hasReviewed]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...toAdd]);
    e.target.value = '';
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index]!.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit() {
    if (!eligibleBookingId || rating === 0) return;
    setSubmitting(true);
    try {
      const review = await createReview({
        bookingId: eligibleBookingId,
        rating,
        comment: comment || undefined,
      });
      await Promise.all(photos.map((p) => uploadReviewPhoto(review.id, p.file)));
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
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

            {/* Photo picker */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t('photos_label', { defaultValue: 'Photos (optional)' })}
              </p>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    aria-label="Add photo"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('photos_hint', {
                  defaultValue: `Up to ${MAX_PHOTOS} photos · JPEG, PNG, WebP · max 5 MB each (compressed automatically)`,
                })}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={rating === 0 || submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('submitting')}
                  </span>
                ) : (
                  t('submit')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
