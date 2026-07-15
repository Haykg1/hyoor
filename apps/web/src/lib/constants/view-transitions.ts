import type { CSSProperties } from 'react';

/**
 * Shared-element style for the property cover image. The same name on a card in a listing
 * page and on the detail-page gallery hero makes the browser morph one into the other
 * during a View Transition. `viewTransitionClass` lets globals.css style all these pairs
 * without knowing the per-property names; unsupported browsers ignore both properties.
 */
export function propertyImageTransitionStyle(propertyId: string): CSSProperties {
  return {
    viewTransitionName: `property-image-${propertyId}`,
    viewTransitionClass: 'property-image',
  } as CSSProperties;
}
