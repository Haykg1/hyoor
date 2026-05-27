'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, House, Loader2, Lock, Mail, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  wantsToHost: boolean;
}

export function RegisterForm(): React.JSX.Element {
  const t = useTranslations('auth.register');
  const te = useTranslations('errors');
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [wantsToHost, setWantsToHost] = useState(false);

  const schema = z
    .object({
      firstName: z.string().min(1, te('required')),
      lastName: z.string().min(1, te('required')),
      email: z.string().min(1, te('required')).email(te('invalid_email')),
      password: z.string().min(6, te('password_min')),
      confirmPassword: z.string().min(1, te('required')),
      wantsToHost: z.boolean(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: te('passwords_match'),
      path: ['confirmPassword'],
    });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      wantsToHost: false,
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  function selectRole(isHost: boolean): void {
    setWantsToHost(isHost);
    setValue('wantsToHost', isHost);
  }

  async function onSubmit(values: RegisterFormValues): Promise<void> {
    setApiError(null);
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        wantsToHost: values.wantsToHost,
      });
      router.push(values.wantsToHost ? '/dashboard' : '/trips');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setApiError(t('email_taken'));
        return;
      }
      setApiError(te('generic'));
    }
  }

  const inputClass =
    'flex w-full h-12 rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => selectRole(false)}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            !wantsToHost ? 'border-primary bg-accent/50 shadow-sm' : 'border-border hover:bg-muted'
          }`}
        >
          <User className={`w-6 h-6 ${!wantsToHost ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="text-center">
            <p className={`text-sm font-semibold ${!wantsToHost ? 'text-primary' : ''}`}>
              {t('role_guest')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('role_guest_hint')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => selectRole(true)}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            wantsToHost ? 'border-primary bg-accent/50 shadow-sm' : 'border-border hover:bg-muted'
          }`}
        >
          <House className={`w-6 h-6 ${wantsToHost ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="text-center">
            <p className={`text-sm font-semibold ${wantsToHost ? 'text-primary' : ''}`}>
              {t('role_host')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('role_host_hint')}</p>
          </div>
        </button>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="reg-email" className="text-sm font-medium">
          {t('email')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`${inputClass} pl-10`}
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="reg-first" className="text-sm font-medium">
            {t('first_name')}
          </label>
          <input
            id="reg-first"
            type="text"
            autoComplete="given-name"
            className={inputClass}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-last" className="text-sm font-medium">
            {t('last_name')}
          </label>
          <input
            id="reg-last"
            type="text"
            autoComplete="family-name"
            className={inputClass}
            {...register('lastName')}
          />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="reg-password" className="text-sm font-medium">
          {t('password')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min. 6 characters"
            className={`${inputClass} pl-10 pr-10`}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="reg-confirm" className="text-sm font-medium">
          {t('confirm_password')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={`${inputClass} pl-10`}
            {...register('confirmPassword')}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
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
