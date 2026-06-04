import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  changePassword,
  getMyProfile,
  type MyProfile,
  updateMyProfile,
  uploadAvatar,
} from '@/lib/api/users';

export interface ProfileForm {
  fullName: string;
  phone: string;
  bio: string;
}

export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AccountSettingsState {
  profile: MyProfile | null;
  loading: boolean;
  initialized: boolean;
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
}

interface AccountSettingsActions {
  fetchProfile: () => Promise<void>;
  setProfileForm: (partial: Partial<ProfileForm>) => void;
  setPasswordForm: (partial: Partial<PasswordForm>) => void;
  saveProfile: () => Promise<void>;
  saveNewPassword: () => Promise<void>;
  uploadAvatarFile: (file: File) => Promise<void>;
  reset: () => void;
}

const EMPTY_PROFILE_FORM: ProfileForm = { fullName: '', phone: '', bio: '' };
const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const SUCCESS_FLAG_TIMEOUT_MS = 3000;

let profileSuccessTimer: ReturnType<typeof setTimeout> | null = null;
let passwordSuccessTimer: ReturnType<typeof setTimeout> | null = null;

function profileFormFromApi(profile: MyProfile): ProfileForm {
  const first = profile.profile?.firstName ?? '';
  const last = profile.profile?.lastName ?? '';
  return {
    fullName: [first, last].filter(Boolean).join(' '),
    phone: profile.profile?.phone ?? '',
    bio: profile.profile?.bio ?? '',
  };
}

export const useAccountSettingsStore = create<AccountSettingsState & AccountSettingsActions>()(
  devtools(
    (set, get) => ({
      profile: null,
      loading: true,
      initialized: false,
      avatarUrl: null,
      avatarUploading: false,
      profileForm: EMPTY_PROFILE_FORM,
      profileSaving: false,
      profileError: null,
      profileSuccess: false,
      passwordForm: EMPTY_PASSWORD_FORM,
      passwordSaving: false,
      passwordError: null,
      passwordSuccess: false,

      fetchProfile: async () => {
        if (get().initialized) return;
        set({ loading: true, initialized: true });
        try {
          const profile = await getMyProfile();
          set({ profile, profileForm: profileFormFromApi(profile), loading: false });
        } catch {
          set({ loading: false });
        }
      },

      setProfileForm: (partial) =>
        set((s) => ({
          profileForm: { ...s.profileForm, ...partial },
          profileError: null,
          profileSuccess: false,
        })),

      setPasswordForm: (partial) =>
        set((s) => ({
          passwordForm: { ...s.passwordForm, ...partial },
          passwordError: null,
          passwordSuccess: false,
        })),

      saveProfile: async () => {
        const { profileForm } = get();
        set({ profileSaving: true, profileError: null, profileSuccess: false });
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
          set({ profile: updated, profileSuccess: true });
          if (profileSuccessTimer) clearTimeout(profileSuccessTimer);
          profileSuccessTimer = setTimeout(
            () => set({ profileSuccess: false }),
            SUCCESS_FLAG_TIMEOUT_MS,
          );
        } catch {
          set({ profileError: 'Failed to save profile. Please try again.' });
        } finally {
          set({ profileSaving: false });
        }
      },

      saveNewPassword: async () => {
        const { passwordForm } = get();
        set({ passwordError: null, passwordSuccess: false });
        if (passwordForm.newPassword.length < 6) {
          set({ passwordError: 'New password must be at least 6 characters.' });
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          set({ passwordError: 'Passwords do not match.' });
          return;
        }
        set({ passwordSaving: true });
        try {
          await changePassword({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          });
          set({ passwordForm: EMPTY_PASSWORD_FORM, passwordSuccess: true });
          if (passwordSuccessTimer) clearTimeout(passwordSuccessTimer);
          passwordSuccessTimer = setTimeout(
            () => set({ passwordSuccess: false }),
            SUCCESS_FLAG_TIMEOUT_MS,
          );
        } catch {
          set({
            passwordError: 'Failed to update password. Check your current password and try again.',
          });
        } finally {
          set({ passwordSaving: false });
        }
      },

      uploadAvatarFile: async (file) => {
        set({ avatarUploading: true });
        try {
          const result = await uploadAvatar(file);
          set({ avatarUrl: result.avatarUrl });
        } catch {
          // Avatar upload silently fails — S3 may not be configured in dev
        } finally {
          set({ avatarUploading: false });
        }
      },

      reset: () => {
        if (profileSuccessTimer) clearTimeout(profileSuccessTimer);
        if (passwordSuccessTimer) clearTimeout(passwordSuccessTimer);
        profileSuccessTimer = null;
        passwordSuccessTimer = null;
        set({
          profile: null,
          loading: true,
          initialized: false,
          avatarUrl: null,
          avatarUploading: false,
          profileForm: EMPTY_PROFILE_FORM,
          profileSaving: false,
          profileError: null,
          profileSuccess: false,
          passwordForm: EMPTY_PASSWORD_FORM,
          passwordSaving: false,
          passwordError: null,
          passwordSuccess: false,
        });
      },
    }),
    { name: 'account-settings-store' },
  ),
);
