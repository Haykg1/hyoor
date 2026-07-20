'use client';

import { UserRound } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ParticipantAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}

export function ParticipantAvatar({
  name,
  avatarUrl,
  className,
}: ParticipantAvatarProps): React.JSX.Element {
  return (
    <Avatar className={cn('h-10 w-10 shrink-0', className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className="bg-muted text-muted-foreground">
        <UserRound className="h-[55%] w-[55%]" aria-hidden />
        <span className="sr-only">{name}</span>
      </AvatarFallback>
    </Avatar>
  );
}
