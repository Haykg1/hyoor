'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  changePassword,
  getMyProfile,
  type MyProfile,
  updateMyProfile,
  uploadAvatar,
} from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';

interface ProfileForm {
  fullName: string;
  phone: string;
  bio: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AccountSettingsState {
  profile: MyProfile | null;
  loading: boolean;
  avatarUrl: string | null;
  avatarUploading: boolean;
  profileForm: ProfileForm;
  profileSaving: boolean;
  profileError: string | null;
  profileSuccess: boolean;
  passwordForm: PasswordForm;
  passwordSaving: boolean;
  passwordError: string | null;
  passwordSuccess: boolean;
  setProfileForm: (form: Partial<ProfileForm>) => void;
  setPasswordForm: (form: Partial<PasswordForm>) => void;
  handleSaveProfile: () => Promise<void>;
  handleChangePassword: () => Promise<void>;
  handleAvatarChange: (file: File) => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export function useAccountSettings(): AccountSettingsState {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [profileForm, setProfileFormState] = useState<ProfileForm>({
    fullName: '',
    phone: '',
    bio: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [passwordForm, setPasswordFormState] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const profileSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        const first = p.profile?.firstName ?? '';
        const last = p.profile?.lastName ?? '';
        setProfileFormState({
          fullName: [first, last].filter(Boolean).join(' '),
          phone: p.profile?.phone ?? '',
          bio: p.profile?.bio ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => {
      if (profileSuccessTimer.current) clearTimeout(profileSuccessTimer.current);
      if (passwordSuccessTimer.current) clearTimeout(passwordSuccessTimer.current);
    };
  }, []);

  const setProfileForm = useCallback((partial: Partial<ProfileForm>) => {
    setProfileFormState((prev) => ({ ...prev, ...partial }));
    setProfileError(null);
    setProfileSuccess(false);
  }, []);

  const setPasswordForm = useCallback((partial: Partial<PasswordForm>) => {
    setPasswordFormState((prev) => ({ ...prev, ...partial }));
    setPasswordError(null);
    setPasswordSuccess(false);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const words = profileForm.fullName.trim().split(/\s+/);
      const firstName = words[0] ?? '';
      const lastName = words.slice(1).join(' ');
      const updated = await updateMyProfile({
        firstName,
        lastName,
        phone: profileForm.phone.trim() || undefined,
        bio: profileForm.bio.trim() || undefined,
      });
      setProfile(updated);
      setProfileSuccess(true);
      profileSuccessTimer.current = setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError('Failed to save profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  }, [profileForm]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordFormState({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess(true);
      passwordSuccessTimer.current = setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError('Failed to update password. Check your current password and try again.');
    } finally {
      setPasswordSaving(false);
    }
  }, [passwordForm]);

  const handleAvatarChange = useCallback(async (file: File) => {
    setAvatarUploading(true);
    try {
      const result = await uploadAvatar(file);
      setAvatarUrl(result.avatarUrl);
    } catch {
      // Avatar upload silently fails — S3 may not be configured in dev
    } finally {
      setAvatarUploading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await logout();
    router.push('/');
  }, [logout, router]);

  return {
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
  };
}
