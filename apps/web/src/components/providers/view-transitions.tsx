'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps, Dispatch, MouseEvent, ReactNode, SetStateAction } from 'react';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * Adapted from next-view-transitions v0.3.5 (MIT, Shu Ding), with its browser
 * back/forward (popstate) view transition removed: freezing the page in a view
 * transition during popstate races Next.js scroll restoration and made the page
 * jump on browser back. Link/router navigations here still run inside
 * document.startViewTransition, so shared-element morphs keep working forward.
 */

type FinishViewTransition = () => void;

type AppRouter = ReturnType<typeof useRouter>;

type NavigateOptions = Parameters<AppRouter['push']>[1];

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => Promise<void>) => unknown;
};

const ViewTransitionsContext = createContext<Dispatch<
  SetStateAction<FinishViewTransition | null>
> | null>(null);

export function ViewTransitions({ children }: { children: ReactNode }): React.JSX.Element {
  const [finishViewTransition, setFinishViewTransition] = useState<FinishViewTransition | null>(
    null,
  );
  useEffect(() => {
    if (!finishViewTransition) return;
    finishViewTransition();
    setFinishViewTransition(null);
  }, [finishViewTransition]);
  return (
    <ViewTransitionsContext.Provider value={setFinishViewTransition}>
      {children}
    </ViewTransitionsContext.Provider>
  );
}

export function useTransitionRouter(): AppRouter {
  const router = useRouter();
  const setFinishViewTransition = useContext(ViewTransitionsContext);
  const triggerTransition = useCallback(
    (navigate: () => void): void => {
      const doc = document as DocumentWithViewTransition;
      if (typeof doc.startViewTransition !== 'function' || !setFinishViewTransition) {
        navigate();
        return;
      }
      doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            startTransition(() => {
              navigate();
              // Stored as state so the provider resolves it in an effect, i.e. only
              // after React has committed the new route — that commit is what the
              // browser snapshots as the transition's "new" state.
              setFinishViewTransition(() => resolve);
            });
          }),
      );
    },
    [setFinishViewTransition],
  );
  const push = useCallback(
    (href: string, options?: NavigateOptions): void => {
      triggerTransition(() => router.push(href, options));
    },
    [triggerTransition, router],
  );
  const replace = useCallback(
    (href: string, options?: NavigateOptions): void => {
      triggerTransition(() => router.replace(href, options));
    },
    [triggerTransition, router],
  );
  return useMemo(() => ({ ...router, push, replace }), [router, push, replace]);
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>): boolean {
  const target = event.currentTarget.getAttribute('target');
  return (
    (target !== null && target !== '_self') ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.nativeEvent.which === 2
  );
}

type ViewTransitionLinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string };

export function ViewTransitionLink(props: ViewTransitionLinkProps): React.JSX.Element {
  const router = useTransitionRouter();
  const { href, replace, scroll, onClick: userOnClick } = props;
  const onClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>): void => {
      userOnClick?.(event);
      if (event.defaultPrevented) return;
      if (!('startViewTransition' in document)) return;
      if (isModifiedEvent(event)) return;
      event.preventDefault();
      const navigate = replace ? router.replace : router.push;
      navigate(href, { scroll: scroll ?? true });
    },
    [userOnClick, href, replace, scroll, router],
  );
  return <NextLink {...props} onClick={onClick} />;
}
