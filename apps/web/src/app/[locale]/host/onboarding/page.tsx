'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { createHostProfile, type MyHostProfile } from '@/lib/api/host-profiles';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';

type HostType = 'INDIVIDUAL' | 'COMPANY';

export default function HostOnboardingPage(): React.JSX.Element {
  const t = useTranslations('host_onboarding');
  const router = useRouter();
  const { user, isLoading: authLoading, fetchMe } = useAuthStore();

  const [hostType, setHostType] = useState<HostType>('INDIVIDUAL');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MyHostProfile | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/host/onboarding');
      return;
    }
    if (user.role === 'HOST' || user.role === 'ADMIN' || user.role === 'STAFF') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (hostType === 'COMPANY' && !companyName.trim()) {
      setError(t('company_name_required'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const profile = await createHostProfile({
        hostType,
        companyName: hostType === 'COMPANY' ? companyName.trim() : undefined,
        description: description.trim() || undefined,
      });
      await fetchMe();
      setResult(profile);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('error_generic');
      toast.error(message);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('success_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('success_subtitle')}</p>
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              {t('continue_button')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>{t('host_type_label')}</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['INDIVIDUAL', 'COMPANY'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setHostType(type)}
                    className={cn(
                      'rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors',
                      hostType === type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <span className="font-medium">
                      {type === 'INDIVIDUAL' ? t('individual') : t('company')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {hostType === 'COMPANY' && (
              <div className="space-y-2">
                <Label htmlFor="companyName">{t('company_name_label')} *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t('company_name_placeholder')}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">{t('description_label')}</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('description_placeholder')}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
