'use client';

import { Camera, CheckCircle2, Globe, Lock, LogOut, Mail, Phone, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAccountSettings } from '@/hooks/use-account-settings';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  hy: 'Հայերեն',
};

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-6', className)}>{children}</div>
  );
}

function SectionHeader({
  icon,
  title,
  iconColor = 'text-primary',
}: {
  icon: React.ReactNode;
  title: string;
  iconColor?: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className={iconColor}>{icon}</span>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}

function PasswordInput({
  id,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  const [show, setShow] = useState(false);
  const t = useTranslations('common');
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-10 h-12 rounded-xl"
      />
      <button
        type="button"
        aria-label={show ? t('hide_password') : t('show_password')}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function AccountSettingsPage(): React.JSX.Element {
  const t = useTranslations('account');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    profile,
    loading,
    avatarUrl,
    avatarUploading,
    profileForm,
    profileSaving,
    profileError,
    profileSuccess,
    passwordForm,
    passwordSaving,
    passwordError,
    passwordSuccess,
    setProfileForm,
    setPasswordForm,
    handleSaveProfile,
    handleChangePassword,
    handleAvatarChange,
    handleSignOut,
  } = useAccountSettings();

  const firstName = profile?.profile?.firstName ?? '';
  const lastName = profile?.profile?.lastName ?? '';
  const displayName = ([firstName, lastName].filter(Boolean).join(' ') || profile?.email) ?? '';
  const initials = (firstName[0] ?? profile?.email?.[0] ?? '?').toUpperCase();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-6 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <div className="space-y-5">
        {/* Profile Photo */}
        <SectionCard>
          <SectionHeader icon={<User className="h-4 w-4" />} title={t('photo.title')} />
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
              <button
                type="button"
                aria-label={t('photo.upload')}
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center shadow hover:bg-muted disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatarChange(file);
                  e.target.value = '';
                }}
              />
            </div>
            <div>
              <p className="font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {profile?.role ? profile.role.charAt(0) + profile.role.slice(1).toLowerCase() : ''}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Personal Information */}
        <SectionCard>
          <SectionHeader icon={<Mail className="h-4 w-4" />} title={t('personal.title')} />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{t('personal.full_name')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="fullName"
                  placeholder={t('personal.full_name_placeholder')}
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ fullName: e.target.value })}
                  className="pl-9 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{t('personal.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  value={profile?.email ?? ''}
                  disabled
                  readOnly
                  className="pl-9 h-12 rounded-xl bg-muted cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('personal.email_note')}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">{t('personal.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+374 XX XXX XXX"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ phone: e.target.value })}
                  className="pl-9 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">{t('personal.bio')}</Label>
              <Textarea
                id="bio"
                placeholder={t('personal.bio_placeholder')}
                value={profileForm.bio}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setProfileForm({ bio: e.target.value })
                }
                rows={4}
                className="rounded-xl resize-none"
              />
            </div>

            {profileError && <p className="text-sm text-destructive">{profileError}</p>}
            {profileSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {t('personal.save_success')}
              </div>
            )}

            <Button
              onClick={() => void handleSaveProfile()}
              disabled={profileSaving}
              className="rounded-xl"
            >
              {profileSaving ? t('personal.saving') : t('personal.save')}
            </Button>
          </div>
        </SectionCard>

        {/* Language */}
        <SectionCard>
          <SectionHeader icon={<Globe className="h-4 w-4" />} title={t('language.title')} />
          <div className="flex flex-wrap gap-2">
            {routing.locales.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => router.replace(pathname, { locale: code })}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium border transition-colors',
                  code === locale
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Change Password */}
        <SectionCard>
          <SectionHeader
            icon={<Lock className="h-4 w-4" />}
            title={t('password.title')}
            iconColor="text-orange-500"
          />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">{t('password.current')}</Label>
              <PasswordInput
                id="currentPassword"
                placeholder={t('password.current_placeholder')}
                value={passwordForm.currentPassword}
                onChange={(v) => setPasswordForm({ currentPassword: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">{t('password.new')}</Label>
              <PasswordInput
                id="newPassword"
                placeholder={t('password.new_placeholder')}
                value={passwordForm.newPassword}
                onChange={(v) => setPasswordForm({ newPassword: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t('password.confirm')}</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder={t('password.confirm_placeholder')}
                value={passwordForm.confirmPassword}
                onChange={(v) => setPasswordForm({ confirmPassword: v })}
              />
            </div>

            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {t('password.update_success')}
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => void handleChangePassword()}
              disabled={
                passwordSaving ||
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword
              }
              className="rounded-xl"
            >
              {passwordSaving ? t('password.updating') : t('password.update')}
            </Button>
          </div>
        </SectionCard>

        {/* Sign Out */}
        <SectionCard>
          <h2 className="text-base font-semibold text-destructive mb-1">{t('signout.title')}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t('signout.description')}</p>
          <Button
            variant="destructive"
            onClick={() => void handleSignOut()}
            className="rounded-xl gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t('signout.button')}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}
