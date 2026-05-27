'use client';

import { LayoutDashboard, LogOut, Plane, User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

interface UserMenuProps {
  variant?: 'default' | 'compact';
}

function getInitials(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  return localPart.slice(0, 2).toUpperCase();
}

export function UserMenu({ variant = 'default' }: UserMenuProps = {}): React.JSX.Element {
  const t = useTranslations('nav');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const isCompact = variant === 'compact';

  if (isLoading) {
    return <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />;
  }
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size={isCompact ? 'sm' : 'default'} asChild>
          <Link href="/auth/login">{t('sign_in')}</Link>
        </Button>
        <Button size={isCompact ? 'sm' : 'default'} asChild>
          <Link href="/auth/register">{t('sign_up')}</Link>
        </Button>
      </div>
    );
  }

  const isHostLike = user.role === 'HOST' || user.role === 'ADMIN' || user.role === 'STAFF';

  async function handleLogout(): Promise<void> {
    await logout();
    router.push('/');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('gap-2 rounded-full px-2', isCompact && 'h-8')}>
          <Avatar className={cn(isCompact ? 'h-6 w-6' : 'h-7 w-7')}>
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {getInitials(user.email)}
            </AvatarFallback>
          </Avatar>
          <span className={cn('hidden font-medium sm:inline', isCompact ? 'text-xs' : 'text-sm')}>
            {user.email.split('@')[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{user.email}</span>
            <span className="text-xs text-muted-foreground">{user.role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isHostLike ? (
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {t('dashboard')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/trips" className="cursor-pointer">
            <Plane className="mr-2 h-4 w-4" />
            {t('trips')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" />
            {t('account')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
