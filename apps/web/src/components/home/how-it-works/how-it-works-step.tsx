import type { LucideIcon } from 'lucide-react';

interface HowItWorksStepProps {
  icon: LucideIcon;
  index: string;
  title: string;
  description: string;
}

export function HowItWorksStep({
  icon: Icon,
  index,
  title,
  description,
}: HowItWorksStepProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <span className="absolute -right-2 -top-2 text-xs font-bold text-primary/40">{index}</span>
      </div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
