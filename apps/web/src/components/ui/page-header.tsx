import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function PageHeaderActions({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
