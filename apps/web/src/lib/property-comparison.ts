import type { PropertyDetail } from '@repo/shared';

export interface PropertyComparisonLabels {
  priceCheaper: (name: string) => string;
  priceTie: () => string;
  amenitiesMore: (name: string, count: number, otherCount: number) => string;
  amenitiesTie: (count: number) => string;
  reviewsMore: (name: string, count: number, otherCount: number) => string;
  reviewsTie: (count: number) => string;
  reviewsNone: () => string;
  ratingHigher: (name: string, rating: string, otherRating: string) => string;
  ratingTie: (rating: string) => string;
  ratingInsufficient: () => string;
}

export function buildPropertyComparisonSummary(
  left: PropertyDetail,
  right: PropertyDetail,
  leftTitle: string,
  rightTitle: string,
  labels: PropertyComparisonLabels,
): string[] {
  const bullets: string[] = [];
  if (left.pricePerNight < right.pricePerNight) {
    bullets.push(labels.priceCheaper(leftTitle));
  } else if (right.pricePerNight < left.pricePerNight) {
    bullets.push(labels.priceCheaper(rightTitle));
  } else {
    bullets.push(labels.priceTie());
  }
  const leftAmenityCount = left.amenities.length;
  const rightAmenityCount = right.amenities.length;
  if (leftAmenityCount > rightAmenityCount) {
    bullets.push(labels.amenitiesMore(leftTitle, leftAmenityCount, rightAmenityCount));
  } else if (rightAmenityCount > leftAmenityCount) {
    bullets.push(labels.amenitiesMore(rightTitle, rightAmenityCount, leftAmenityCount));
  } else {
    bullets.push(labels.amenitiesTie(leftAmenityCount));
  }
  if (left.reviewCount === 0 && right.reviewCount === 0) {
    bullets.push(labels.reviewsNone());
  } else if (left.reviewCount > right.reviewCount) {
    bullets.push(labels.reviewsMore(leftTitle, left.reviewCount, right.reviewCount));
  } else if (right.reviewCount > left.reviewCount) {
    bullets.push(labels.reviewsMore(rightTitle, right.reviewCount, left.reviewCount));
  } else {
    bullets.push(labels.reviewsTie(left.reviewCount));
  }
  const leftRating = left.avgRating ?? 0;
  const rightRating = right.avgRating ?? 0;
  if (left.reviewCount > 0 && right.reviewCount > 0) {
    if (leftRating > rightRating) {
      bullets.push(labels.ratingHigher(leftTitle, leftRating.toFixed(1), rightRating.toFixed(1)));
    } else if (rightRating > leftRating) {
      bullets.push(labels.ratingHigher(rightTitle, rightRating.toFixed(1), leftRating.toFixed(1)));
    } else {
      bullets.push(labels.ratingTie(leftRating.toFixed(1)));
    }
  } else {
    bullets.push(labels.ratingInsufficient());
  }
  return bullets;
}
