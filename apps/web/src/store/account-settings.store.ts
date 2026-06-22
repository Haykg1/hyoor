import { toast } from 'sonner';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { getMyHostProfile, updateMyHostProfile } from '@/lib/api/host-profiles';
import {
  changePassword,
  deleteAvatar,
  getMyProfile,
  type MyProfile,
  updateMyProfile,
  uploadAvatar,
} from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';

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
  avatarError: string | null;
  profileForm: ProfileForm;
  profileSaving: boolean;
  profileError: string | null;
  profileSuccess: boolean;
  hostDescription: string;
  hostDescriptionSaving: boolean;
  hostDescriptionError: string | null;
  hostDescriptionSuccess: boolean;
  isHost: boolean;
  spokenLanguages: string[];
  spokenLanguagesSaving: boolean;
  spokenLanguagesSuccess: boolean;
  passwordForm: PasswordForm;
  passwordSaving: boolean;
  passwordError: string | null;
  passwordSuccess: boolean;
}

interface AccountSettingsActions {
  fetchProfile: () => Promise<void>;
  setProfileForm: (partial: Partial<ProfileForm>) => void;
  setPasswordForm: (partial: Partial<PasswordForm>) => void;
  setHostDescription: (description: string) => void;
  setSpokenLanguages: (langs: string[]) => void;
  saveProfile: () => Promise<void>;
  saveHostDescription: () => Promise<void>;
  saveSpokenLanguages: () => Promise<void>;
  saveNewPassword: () => Promise<void>;
  uploadAvatarFile: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
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
let hostDescriptionSuccessTimer: ReturnType<typeof setTimeout> | null = null;
let spokenLanguagesSuccessTimer: ReturnType<typeof setTimeout> | null = null;

function profileFormFromApi(profile: MyProfile): ProfileForm {
  const first = profile.profile?.firstName ?? '';
  const last = profile.profile?.lastName ?? '';
  return {
    fullName: [first, last].filter(Boolean).join(' '),
    phone: profile.profile?.phone ?? '',
    bio: profile.profile?.bio ?? '',
  };
}

function isHostRole(role: string): boolean {
  return role === 'HOST' || role === 'ADMIN' || role === 'STAFF';
}

export const useAccountSettingsStore = create<AccountSettingsState & AccountSettingsActions>()(
  devtools(
    (set, get) => ({
      profile: null,
      loading: true,
      initialized: false,
      avatarUrl: null,
      avatarUploading: false,
      avatarError: null,
      profileForm: EMPTY_PROFILE_FORM,
      profileSaving: false,
      profileError: null,
      profileSuccess: false,
      hostDescription: '',
      hostDescriptionSaving: false,
      hostDescriptionError: null,
      hostDescriptionSuccess: false,
      isHost: false,
      spokenLanguages: [],
      spokenLanguagesSaving: false,
      spokenLanguagesSuccess: false,
      passwordForm: EMPTY_PASSWORD_FORM,
      passwordSaving: false,
      passwordError: null,
      passwordSuccess: false,

      fetchProfile: async () => {
        set({ loading: true, profileError: null });
        try {
          const profile = await getMyProfile();
          const hostRole = isHostRole(profile.role);
          let hostDescription = '';
          if (hostRole) {
            try {
              const hostProfile = await getMyHostProfile();
              hostDescription = hostProfile.description ?? '';
            } catch {
              hostDescription = '';
            }
          }
          set({
            profile,
            profileForm: profileFormFromApi(profile),
            avatarUrl: profile.avatarUrl,
            isHost: hostRole,
            hostDescription,
            spokenLanguages: profile.profile?.spokenLanguages ?? [],
            loading: false,
            initialized: true,
          });
        } catch {
          set({ loading: false, initialized: true });
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

      setHostDescription: (description) =>
        set({
          hostDescription: description,
          hostDescriptionError: null,
          hostDescriptionSuccess: false,
        }),

      setSpokenLanguages: (langs) => set({ spokenLanguages: langs, spokenLanguagesSuccess: false }),

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
          set({
            profile: updated,
            avatarUrl: updated.avatarUrl ?? get().avatarUrl,
            profileSuccess: true,
          });
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

      saveSpokenLanguages: async () => {
        const { spokenLanguages } = get();
        set({ spokenLanguagesSaving: true, spokenLanguagesSuccess: false });
        try {
          await updateMyProfile({ spokenLanguages });
          set({ spokenLanguagesSuccess: true });
          if (spokenLanguagesSuccessTimer) clearTimeout(spokenLanguagesSuccessTimer);
          spokenLanguagesSuccessTimer = setTimeout(
            () => set({ spokenLanguagesSuccess: false }),
            SUCCESS_FLAG_TIMEOUT_MS,
          );
        } finally {
          set({ spokenLanguagesSaving: false });
        }
      },

      saveHostDescription: async () => {
        const { hostDescription } = get();
        set({
          hostDescriptionSaving: true,
          hostDescriptionError: null,
          hostDescriptionSuccess: false,
        });
        try {
          await updateMyHostProfile({
            description: hostDescription.trim() || undefined,
          });
          set({ hostDescriptionSuccess: true });
          if (hostDescriptionSuccessTimer) clearTimeout(hostDescriptionSuccessTimer);
          hostDescriptionSuccessTimer = setTimeout(
            () => set({ hostDescriptionSuccess: false }),
            SUCCESS_FLAG_TIMEOUT_MS,
          );
        } catch {
          set({ hostDescriptionError: 'Failed to save host description. Please try again.' });
        } finally {
          set({ hostDescriptionSaving: false });
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
        set({ avatarUploading: true, avatarError: null });
        try {
          const result = await uploadAvatar(file);
          set({ avatarUrl: result.avatarUrl });
          useAuthStore.getState().setAvatarUrl(result.avatarUrl);
          toast.success('Profile photo updated');
        } catch {
          set({ avatarError: 'Failed to upload photo. Try a JPEG, PNG, or WebP under 5MB.' });
          toast.error('Failed to upload profile photo');
        } finally {
          set({ avatarUploading: false });
        }
      },

      removeAvatar: async () => {
        set({ avatarUploading: true, avatarError: null });
        try {
          await deleteAvatar();
          set({ avatarUrl: null });
          useAuthStore.getState().setAvatarUrl(null);
          toast.success('Profile photo removed');
        } catch {
          set({ avatarError: 'Failed to remove photo.' });
          toast.error('Failed to remove profile photo');
        } finally {
          set({ avatarUploading: false });
        }
      },

      reset: () => {
        if (profileSuccessTimer) clearTimeout(profileSuccessTimer);
        if (passwordSuccessTimer) clearTimeout(passwordSuccessTimer);
        if (hostDescriptionSuccessTimer) clearTimeout(hostDescriptionSuccessTimer);
        if (spokenLanguagesSuccessTimer) clearTimeout(spokenLanguagesSuccessTimer);
        profileSuccessTimer = null;
        passwordSuccessTimer = null;
        hostDescriptionSuccessTimer = null;
        spokenLanguagesSuccessTimer = null;
        set({
          profile: null,
          loading: true,
          initialized: false,
          avatarUrl: null,
          avatarUploading: false,
          avatarError: null,
          profileForm: EMPTY_PROFILE_FORM,
          profileSaving: false,
          profileError: null,
          profileSuccess: false,
          hostDescription: '',
          hostDescriptionSaving: false,
          hostDescriptionError: null,
          hostDescriptionSuccess: false,
          isHost: false,
          spokenLanguages: [],
          spokenLanguagesSaving: false,
          spokenLanguagesSuccess: false,
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
