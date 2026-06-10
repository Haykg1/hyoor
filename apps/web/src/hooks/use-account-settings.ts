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
  avatarError: string | null;
  profileForm: ProfileForm;
  profileSaving: boolean;
  profileError: string | null;
  profileSuccess: boolean;
  isHost: boolean;
  hostDescription: string;
  hostDescriptionSaving: boolean;
  hostDescriptionError: string | null;
  hostDescriptionSuccess: boolean;
  passwordForm: PasswordForm;
  passwordSaving: boolean;
  passwordError: string | null;
  passwordSuccess: boolean;
  setProfileForm: (form: Partial<ProfileForm>) => void;
  setPasswordForm: (form: Partial<PasswordForm>) => void;
  setHostDescription: (description: string) => void;
  handleSaveProfile: () => Promise<void>;
  handleSaveHostDescription: () => Promise<void>;
  handleChangePassword: () => Promise<void>;
  handleAvatarChange: (file: File) => Promise<void>;
  handleRemoveAvatar: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export function useAccountSettings(): AccountSettingsState {
  const {
    profile,
    loading,
    avatarUrl,
    avatarUploading,
    avatarError,
    profileForm,
    profileSaving,
    profileError,
    profileSuccess,
    isHost,
    hostDescription,
    hostDescriptionSaving,
    hostDescriptionError,
    hostDescriptionSuccess,
    passwordForm,
    passwordSaving,
    passwordError,
    passwordSuccess,
    fetchProfile,
    setProfileForm,
    setPasswordForm,
    setHostDescription,
    saveProfile,
    saveHostDescription,
    saveNewPassword,
    uploadAvatarFile,
    removeAvatar,
  } = useAccountSettingsStore();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  useEffect(() => {
    useAccountSettingsStore.getState().reset();
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
    avatarError,
    profileForm,
    profileSaving,
    profileError,
    profileSuccess,
    isHost,
    hostDescription,
    hostDescriptionSaving,
    hostDescriptionError,
    hostDescriptionSuccess,
    passwordForm,
    passwordSaving,
    passwordError,
    passwordSuccess,
    setProfileForm,
    setPasswordForm,
    setHostDescription,
    handleSaveProfile: saveProfile,
    handleSaveHostDescription: saveHostDescription,
    handleChangePassword: saveNewPassword,
    handleAvatarChange: uploadAvatarFile,
    handleRemoveAvatar: removeAvatar,
    handleSignOut,
  };
}
