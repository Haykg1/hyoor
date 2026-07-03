export type SeedImageDef = {
  key: string;
  sourceUrl: string;
};

function picsumPhoto(seed: string, width = 1200, height = 800): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

function picsumAvatar(seed: string): string {
  return picsumPhoto(seed, 256, 256);
}

export const SEED_AVATAR_KEYS = {
  admin: 'avatars/seed/admin.jpg',
  staff: 'avatars/seed/staff.jpg',
  host1: 'avatars/seed/armen.jpg',
  host2: 'avatars/seed/nare.jpg',
  host3: 'avatars/seed/lilit.jpg',
  guest1: 'avatars/seed/maria.jpg',
  guest2: 'avatars/seed/david.jpg',
  guest3: 'avatars/seed/sophie.jpg',
  guest4: 'avatars/seed/narek.jpg',
} as const;

export const SEED_LOGO_KEY = 'logos/seed/rentstar-hospitality.jpg';

export const SEED_IMAGES: SeedImageDef[] = [
  { key: SEED_AVATAR_KEYS.admin, sourceUrl: picsumAvatar('rentstar-avatar-admin') },
  { key: SEED_AVATAR_KEYS.staff, sourceUrl: picsumAvatar('rentstar-avatar-staff') },
  { key: SEED_AVATAR_KEYS.host1, sourceUrl: picsumAvatar('rentstar-avatar-armen') },
  { key: SEED_AVATAR_KEYS.host2, sourceUrl: picsumAvatar('rentstar-avatar-nare') },
  { key: SEED_AVATAR_KEYS.host3, sourceUrl: picsumAvatar('rentstar-avatar-lilit') },
  { key: SEED_AVATAR_KEYS.guest1, sourceUrl: picsumAvatar('rentstar-avatar-maria') },
  { key: SEED_AVATAR_KEYS.guest2, sourceUrl: picsumAvatar('rentstar-avatar-david') },
  { key: SEED_AVATAR_KEYS.guest3, sourceUrl: picsumAvatar('rentstar-avatar-sophie') },
  { key: SEED_AVATAR_KEYS.guest4, sourceUrl: picsumAvatar('rentstar-avatar-narek') },
  { key: SEED_LOGO_KEY, sourceUrl: picsumPhoto('rentstar-logo', 256, 256) },
  { key: 'properties/seed/1/photo-0.jpg', sourceUrl: picsumPhoto('rentstar-property-1-0') },
  { key: 'properties/seed/1/photo-1.jpg', sourceUrl: picsumPhoto('rentstar-property-1-1') },
  { key: 'properties/seed/1/photo-2.jpg', sourceUrl: picsumPhoto('rentstar-property-1-2') },
  { key: 'properties/seed/2/photo-0.jpg', sourceUrl: picsumPhoto('rentstar-property-2-0') },
  { key: 'properties/seed/2/photo-1.jpg', sourceUrl: picsumPhoto('rentstar-property-2-1') },
  { key: 'properties/seed/3/photo-0.jpg', sourceUrl: picsumPhoto('rentstar-property-3-0') },
  { key: 'properties/seed/3/photo-1.jpg', sourceUrl: picsumPhoto('rentstar-property-3-1') },
  { key: 'properties/seed/3/photo-2.jpg', sourceUrl: picsumPhoto('rentstar-property-3-2') },
  { key: 'properties/seed/3/photo-3.jpg', sourceUrl: picsumPhoto('rentstar-property-3-3') },
  { key: 'properties/seed/4/photo-0.jpg', sourceUrl: picsumPhoto('rentstar-property-4-0') },
  { key: 'properties/seed/4/photo-1.jpg', sourceUrl: picsumPhoto('rentstar-property-4-1') },
  { key: 'properties/seed/4/photo-2.jpg', sourceUrl: picsumPhoto('rentstar-property-4-2') },
  { key: 'properties/seed/5/photo-0.jpg', sourceUrl: picsumPhoto('rentstar-property-5-0') },
  { key: 'properties/seed/5/photo-1.jpg', sourceUrl: picsumPhoto('rentstar-property-5-1') },
  { key: 'properties/seed/5/photo-2.jpg', sourceUrl: picsumPhoto('rentstar-property-5-2') },
  { key: 'properties/seed/6/photo-0.jpg', sourceUrl: picsumPhoto('rentstar-property-6-0') },
  { key: 'properties/seed/6/photo-1.jpg', sourceUrl: picsumPhoto('rentstar-property-6-1') },
  { key: 'properties/seed/6/photo-2.jpg', sourceUrl: picsumPhoto('rentstar-property-6-2') },
  { key: 'properties/seed/6/photo-3.jpg', sourceUrl: picsumPhoto('rentstar-property-6-3') },
];
