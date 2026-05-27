'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

function isSafeRedirect(value: string | null): value is string {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'));
}

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginForm(): React.JSX.Element {
  const t = useTranslations('auth.login');
  const te = useTranslations('errors');
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const schema = z.object({
    email: z.string().min(1, te('required')).email(te('invalid_email')),
    password: z.string().min(1, te('required')),
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { email: '', password: '' },
  });

  const isSubmitting = form.formState.isSubmitting;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setApiError(null);
    try {
      await login(values);
      const next = params.get('next');
      if (isSafeRedirect(next)) {
        router.push(next);
        return;
      }
      const role = useAuthStore.getState().user?.role;
      const target =
        role === 'HOST' || role === 'ADMIN' || role === 'STAFF' ? '/dashboard' : '/trips';
      router.push(target);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setApiError(t('invalid_credentials'));
        return;
      }
      setApiError(te('generic'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          {t('email')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="flex w-full h-12 rounded-xl border border-input bg-transparent pl-10 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-sm font-medium">
            {t('password')}
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-primary hover:underline font-medium"
          >
            {t('forgot_password')}
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="flex w-full h-12 rounded-xl border border-input bg-transparent pl-10 pr-10 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl font-semibold mt-2"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}
