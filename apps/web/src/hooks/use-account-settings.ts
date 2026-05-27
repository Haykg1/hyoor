'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import type { MyProfile } from '@/lib/api/users';
import {
  useAccountSettingsStore,
  type PasswordForm,
  type ProfileForm,
} from '@/store/account-settings.store';
import { useAuthStore } from '@/store/auth.store';

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
    fetchProfile,
    setProfileForm,
    setPasswordForm,
    saveProfile,
    saveNewPassword,
    uploadAvatarFile,
  } = useAccountSettingsStore();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

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
    handleSaveProfile: saveProfile,
    handleChangePassword: saveNewPassword,
    handleAvatarChange: uploadAvatarFile,
    handleSignOut,
  };
}
