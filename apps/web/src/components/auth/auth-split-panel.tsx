import Image from 'next/image';

import { Link } from '@/i18n/navigation';

interface AuthSplitPanelProps {
  imageUrl: string;
  quote: string;
  subtext: string;
}

function BrandWordmark({ variant }: { variant: 'white' | 'color' }): React.JSX.Element {
  if (variant === 'white') {
    return (
      <span className="flex items-center gap-1 font-bold text-2xl">
        <span className="text-white">Rent</span>
        <span className="text-white/70">Star</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 font-bold text-xl">
      <span className="text-primary">Rent</span>
      <span className="text-foreground">Star</span>
    </span>
  );
}

export function AuthSplitPanel({
  imageUrl,
  quote,
  subtext,
}: AuthSplitPanelProps): React.JSX.Element {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <Image
        src={imageUrl}
        alt="Beautiful home"
        fill
        className="object-cover"
        sizes="50vw"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/40" />
      <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
        <Link href="/">
          <BrandWordmark variant="white" />
        </Link>
        <div>
          <blockquote className="text-2xl font-semibold leading-snug mb-4">
            &ldquo;{quote}&rdquo;
          </blockquote>
          <p className="text-white/70 text-sm">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

export function MobileBrandLink(): React.JSX.Element {
  return (
    <Link href="/" className="flex items-center gap-1 font-bold text-xl mb-8 lg:hidden">
      <span className="text-primary">Rent</span>
      <span className="text-foreground">Star</span>
    </Link>
  );
}
