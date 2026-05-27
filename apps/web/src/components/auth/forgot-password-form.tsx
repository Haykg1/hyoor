'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface ForgotPasswordValues {
  email: string;
}

export function ForgotPasswordForm(): React.JSX.Element {
  const t = useTranslations('auth.forgot_password');
  const te = useTranslations('errors');
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const schema = z.object({
    email: z.string().min(1, te('required')).email(te('invalid_email')),
  });

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { email: '' },
  });

  const isSubmitting = form.formState.isSubmitting;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  async function onSubmit(values: ForgotPasswordValues): Promise<void> {
    setApiError(null);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSuccess(true);
    } catch {
      setApiError(te('generic'));
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <p className="text-sm text-muted-foreground">{t('sent_hint')}</p>
      </div>
    );
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
        <label htmlFor="forgot-email" className="text-sm font-medium">
          {t('email_label')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="flex w-full h-12 rounded-xl border border-input bg-transparent pl-10 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}
