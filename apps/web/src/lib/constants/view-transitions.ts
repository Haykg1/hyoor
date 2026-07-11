import type { CSSProperties } from 'react';
import { flushSync } from 'react-dom';

export const LIGHTBOX_PHOTO_TRANSITION_NAME = 'lightbox-photo';

interface ViewTransitionLike {
  finished: Promise<void>;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransitionLike;
};

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

export function lightboxPhotoTransitionStyle(): CSSProperties {
  return { viewTransitionName: LIGHTBOX_PHOTO_TRANSITION_NAME } as CSSProperties;
}

export function viewTransitionsSupported(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/**
 * Runs a same-document View Transition around a React state update so elements sharing a
 * view-transition-name morph between the two states (e.g. gallery thumbnail → lightbox).
 * `flushSync` makes the DOM update land inside the transition's snapshot window. Falls back
 * to applying the update directly where the API is unavailable.
 */
export function withViewTransition(update: () => void, onFinished?: () => void): void {
  const doc = document as DocumentWithViewTransition;
  if (typeof doc.startViewTransition !== 'function') {
    update();
    onFinished?.();
    return;
  }
  const transition = doc.startViewTransition(() => flushSync(update));
  if (onFinished) void transition.finished.then(onFinished, onFinished);
}
