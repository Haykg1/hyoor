import { hashSync } from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

const PASSWORD_HASH = hashSync('Password123!', 12);

function utcDate(daysFromNow = 0): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysFromNow));
}

async function main(): Promise<void> {
  console.log('🌱 Seeding RentStar demo data...');

  // ── Users ────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rentstar.am' },
    update: {},
    create: {
      email: 'admin@rentstar.am',
      role: 'ADMIN',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@rentstar.am' },
    update: {},
    create: {
      email: 'staff@rentstar.am',
      role: 'STAFF',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  const host1 = await prisma.user.upsert({
    where: { email: 'armen@rentstar.am' },
    update: {},
    create: {
      email: 'armen@rentstar.am',
      role: 'HOST',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  const host2 = await prisma.user.upsert({
    where: { email: 'nare@rentstar.am' },
    update: {},
    create: {
      email: 'nare@rentstar.am',
      role: 'HOST',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  const host3 = await prisma.user.upsert({
    where: { email: 'company@rentstar.am' },
    update: {},
    create: {
      email: 'company@rentstar.am',
      role: 'HOST',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  const guest1 = await prisma.user.upsert({
    where: { email: 'maria@rentstar.am' },
    update: {},
    create: {
      email: 'maria@rentstar.am',
      role: 'GUEST',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  const guest2 = await prisma.user.upsert({
    where: { email: 'david@rentstar.am' },
    update: {},
    create: {
      email: 'david@rentstar.am',
      role: 'GUEST',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  const guest3 = await prisma.user.upsert({
    where: { email: 'sophie@rentstar.am' },
    update: {},
    create: {
      email: 'sophie@rentstar.am',
      role: 'GUEST',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  const guest4 = await prisma.user.upsert({
    where: { email: 'narek@rentstar.am' },
    update: {},
    create: {
      email: 'narek@rentstar.am',
      role: 'GUEST',
      isEmailVerified: true,
      passwordHash: PASSWORD_HASH,
    },
  });

  // ── User Profiles ────────────────────────────────────────────────────────
  const profiles: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    phone: string;
    nationality: string;
    bio: string;
  }> = [
    {
      userId: admin.id,
      firstName: 'Anna',
      lastName: 'Admin',
      phone: '+37410000001',
      nationality: 'AM',
      bio: 'Platform administrator.',
    },
    {
      userId: staff.id,
      firstName: 'Suren',
      lastName: 'Staff',
      phone: '+37410000002',
      nationality: 'AM',
      bio: 'Platform support.',
    },
    {
      userId: host1.id,
      firstName: 'Armen',
      lastName: 'Petrosyan',
      phone: '+37491111001',
      nationality: 'AM',
      bio: 'Individual host with apartments in central Yerevan.',
    },
    {
      userId: host2.id,
      firstName: 'Naré',
      lastName: 'Karapetyan',
      phone: '+37491111002',
      nationality: 'AM',
      bio: 'Independent host in Yerevan and Gyumri.',
    },
    {
      userId: host3.id,
      firstName: 'Lilit',
      lastName: 'Sargsyan',
      phone: '+37477111003',
      nationality: 'AM',
      bio: 'Operations lead, RentStar Hospitality.',
    },
    {
      userId: guest1.id,
      firstName: 'Maria',
      lastName: 'Johnson',
      phone: '+447700900001',
      nationality: 'GB',
      bio: 'Frequent traveler exploring Armenia.',
    },
    {
      userId: guest2.id,
      firstName: 'David',
      lastName: 'Kim',
      phone: '+821012345678',
      nationality: 'KR',
      bio: 'Digital nomad and coffee enthusiast.',
    },
    {
      userId: guest3.id,
      firstName: 'Sophie',
      lastName: 'Müller',
      phone: '+4915112345678',
      nationality: 'DE',
      bio: 'Architecture lover and slow traveler.',
    },
    {
      userId: guest4.id,
      firstName: 'Narek',
      lastName: 'Hovhannisyan',
      phone: '+37499222333',
      nationality: 'AM',
      bio: 'Local explorer discovering Armenia from a guest perspective.',
    },
  ];

  for (const p of profiles) {
    await prisma.userProfile.upsert({ where: { userId: p.userId }, update: {}, create: p });
  }

  // ── Host Profiles ────────────────────────────────────────────────────────
  const hp1 = await prisma.hostProfile.upsert({
    where: { userId: host1.id },
    update: {},
    create: {
      userId: host1.id,
      hostType: 'INDIVIDUAL',
      isVerified: true,
      responseRatePercent: 98,
      responseTimeHours: 2,
      payoutEmail: 'armen@rentstar.am',
    },
  });

  const hp2 = await prisma.hostProfile.upsert({
    where: { userId: host2.id },
    update: {},
    create: {
      userId: host2.id,
      hostType: 'INDIVIDUAL',
      isVerified: true,
      responseRatePercent: 95,
      responseTimeHours: 4,
      payoutEmail: 'nare@rentstar.am',
    },
  });

  const hp3 = await prisma.hostProfile.upsert({
    where: { userId: host3.id },
    update: {},
    create: {
      userId: host3.id,
      hostType: 'COMPANY',
      isVerified: true,
      responseRatePercent: 100,
      responseTimeHours: 1,
      companyName: 'RentStar Hospitality',
      companyRegNumber: 'AM-12345678',
      vatNumber: 'AM-VAT-001',
      payoutEmail: 'finance@rentstar.am',
    },
  });

  // ── Properties ───────────────────────────────────────────────────────────
  const p1 = await prisma.property.upsert({
    where: { slug: 'cascade-view-apartment' },
    update: { featured: true, maxAdults: 2, maxChildren: 2, maxInfants: 1 },
    create: {
      hostId: hp1.id,
      status: 'ACTIVE',
      propertyType: 'APARTMENT',
      featured: true,
      title: 'Cascade View Apartment',
      slug: 'cascade-view-apartment',
      description:
        'Bright 2-bedroom apartment steps from the Cascade with city panorama, fast WiFi, and a fully equipped kitchen. Perfect for couples or small families.',
      cancellationPolicy: 'MODERATE',
      country: 'AM',
      region: 'Yerevan',
      city: 'Yerevan',
      addressLine: '10 Tamanyan Street',
      latitude: new Decimal('40.1904'),
      longitude: new Decimal('44.5152'),
      maxGuests: 4,
      maxAdults: 2,
      maxChildren: 2,
      maxInfants: 1,
      bedrooms: 2,
      beds: 2,
      bathrooms: new Decimal('1.0'),
      currency: 'AMD',
      pricePerNight: 28000,
      cleaningFee: 5000,
      securityDeposit: 20000,
      minNights: 2,
      maxNights: 30,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      smokingAllowed: false,
      petsAllowed: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    },
  });

  const p2 = await prisma.property.upsert({
    where: { slug: 'northern-avenue-studio' },
    update: { maxAdults: 2, maxChildren: 0, maxInfants: 1 },
    create: {
      hostId: hp1.id,
      status: 'ACTIVE',
      propertyType: 'STUDIO',
      title: 'Northern Avenue Studio',
      slug: 'northern-avenue-studio',
      description:
        'Cozy studio in the heart of Yerevan on the famous Northern Avenue. Walk to Republic Square, cafes, and museums.',
      cancellationPolicy: 'FLEXIBLE',
      country: 'AM',
      region: 'Yerevan',
      city: 'Yerevan',
      addressLine: '23 Northern Avenue',
      latitude: new Decimal('40.1836'),
      longitude: new Decimal('44.5128'),
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      maxInfants: 1,
      bedrooms: 0,
      beds: 1,
      bathrooms: new Decimal('1.0'),
      currency: 'AMD',
      pricePerNight: 18000,
      cleaningFee: 3000,
      securityDeposit: 10000,
      minNights: 1,
      maxNights: 14,
      checkInTime: '13:00',
      checkOutTime: '12:00',
      smokingAllowed: false,
      petsAllowed: false,
    },
  });

  const p3 = await prisma.property.upsert({
    where: { slug: 'kentron-heritage-house' },
    update: { featured: true, maxAdults: 4, maxChildren: 2, maxInfants: 1 },
    create: {
      hostId: hp2.id,
      status: 'ACTIVE',
      propertyType: 'HOUSE',
      featured: true,
      title: 'Kentron Heritage House',
      slug: 'kentron-heritage-house',
      description:
        'A lovingly restored Soviet-era apartment converted into a 3-bedroom townhouse in Kentron. Balcony, garden, full kitchen.',
      cancellationPolicy: 'MODERATE',
      country: 'AM',
      region: 'Yerevan',
      city: 'Yerevan',
      addressLine: '5 Moskovyan Street',
      latitude: new Decimal('40.1776'),
      longitude: new Decimal('44.5169'),
      maxGuests: 6,
      maxAdults: 4,
      maxChildren: 2,
      maxInfants: 1,
      bedrooms: 3,
      beds: 4,
      bathrooms: new Decimal('2.0'),
      currency: 'AMD',
      pricePerNight: 45000,
      cleaningFee: 8000,
      securityDeposit: 30000,
      minNights: 3,
      maxNights: 21,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      smokingAllowed: false,
      petsAllowed: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '07:00',
    },
  });

  const p4 = await prisma.property.upsert({
    where: { slug: 'ararat-mountain-guesthouse' },
    update: { featured: true, maxAdults: 3, maxChildren: 2, maxInfants: 1 },
    create: {
      hostId: hp2.id,
      status: 'ACTIVE',
      propertyType: 'GUESTHOUSE',
      featured: true,
      title: 'Ararat Mountain Guesthouse',
      slug: 'ararat-mountain-guesthouse',
      description:
        'Boutique guesthouse with iconic Mt. Ararat views. Homemade breakfast available on request. Ideal for hiking and photography lovers.',
      cancellationPolicy: 'STRICT',
      country: 'AM',
      region: 'Yerevan',
      city: 'Yerevan',
      addressLine: '88 Abovyan Street',
      latitude: new Decimal('40.1870'),
      longitude: new Decimal('44.5310'),
      maxGuests: 5,
      maxAdults: 3,
      maxChildren: 2,
      maxInfants: 1,
      bedrooms: 2,
      beds: 3,
      bathrooms: new Decimal('1.5'),
      currency: 'AMD',
      pricePerNight: 35000,
      cleaningFee: 6000,
      securityDeposit: 25000,
      minNights: 2,
      maxNights: 14,
      checkInTime: '14:00',
      checkOutTime: '10:00',
      smokingAllowed: false,
      petsAllowed: false,
    },
  });

  const p5 = await prisma.property.upsert({
    where: { slug: 'silk-road-penthouse' },
    update: { featured: true, maxAdults: 2, maxChildren: 2, maxInfants: 1 },
    create: {
      hostId: hp3.id,
      status: 'ACTIVE',
      propertyType: 'APARTMENT',
      featured: true,
      title: 'Silk Road Penthouse',
      slug: 'silk-road-penthouse',
      description:
        'Luxury penthouse on the 18th floor with 360° Yerevan views. Private rooftop terrace, jacuzzi, and concierge service.',
      cancellationPolicy: 'NON_REFUNDABLE',
      country: 'AM',
      region: 'Yerevan',
      city: 'Yerevan',
      addressLine: '1 Grigor Lusavorich Street',
      latitude: new Decimal('40.1781'),
      longitude: new Decimal('44.5121'),
      maxGuests: 4,
      maxAdults: 2,
      maxChildren: 2,
      maxInfants: 1,
      bedrooms: 2,
      beds: 2,
      bathrooms: new Decimal('2.0'),
      currency: 'AMD',
      pricePerNight: 85000,
      cleaningFee: 12000,
      securityDeposit: 50000,
      minNights: 2,
      maxNights: 30,
      checkInTime: '15:00',
      checkOutTime: '12:00',
      smokingAllowed: false,
      petsAllowed: false,
    },
  });

  const p6 = await prisma.property.upsert({
    where: { slug: 'dilijan-forest-villa' },
    update: { featured: true, maxAdults: 4, maxChildren: 3, maxInfants: 2 },
    create: {
      hostId: hp3.id,
      status: 'ACTIVE',
      propertyType: 'VILLA',
      featured: true,
      title: 'Dilijan Forest Villa',
      slug: 'dilijan-forest-villa',
      description:
        'Private villa surrounded by Dilijan national forest. Perfect for family retreats, remote work, and nature lovers.',
      cancellationPolicy: 'STRICT',
      country: 'AM',
      region: 'Tavush',
      city: 'Dilijan',
      addressLine: '28 Forest Lane',
      latitude: new Decimal('40.7414'),
      longitude: new Decimal('44.8631'),
      maxGuests: 8,
      maxAdults: 4,
      maxChildren: 3,
      maxInfants: 2,
      bedrooms: 4,
      beds: 5,
      bathrooms: new Decimal('2.5'),
      currency: 'AMD',
      pricePerNight: 65000,
      cleaningFee: 10000,
      securityDeposit: 40000,
      minNights: 3,
      maxNights: 28,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      smokingAllowed: false,
      petsAllowed: true,
    },
  });

  const p7 = await prisma.property.upsert({
    where: { slug: 'yerevan-city-loft-draft' },
    update: { maxAdults: 2, maxChildren: 1, maxInfants: 0 },
    create: {
      hostId: hp1.id,
      status: 'DRAFT',
      propertyType: 'APARTMENT',
      title: 'Yerevan City Loft',
      slug: 'yerevan-city-loft-draft',
      description:
        'Industrial-style loft in the Malatia-Sebastia district, still being set up for guests.',
      cancellationPolicy: 'MODERATE',
      country: 'AM',
      region: 'Yerevan',
      city: 'Yerevan',
      addressLine: '17 Varshavyan Street',
      latitude: new Decimal('40.1550'),
      longitude: new Decimal('44.4900'),
      maxGuests: 3,
      maxAdults: 2,
      maxChildren: 1,
      maxInfants: 0,
      bedrooms: 1,
      beds: 2,
      bathrooms: new Decimal('1.0'),
      currency: 'AMD',
      pricePerNight: 22000,
      cleaningFee: 4000,
      minNights: 1,
    },
  });

  const allActive = [p1, p2, p3, p4, p5, p6];

  // ── Photos ───────────────────────────────────────────────────────────────
  type PhotoSeed = {
    key: string;
    propertyId: string;
    caption: string;
    sortOrder: number;
    isCover: boolean;
  };
  const photos: PhotoSeed[] = [
    {
      key: 'properties/seed/1/photo-0.jpg',
      propertyId: p1.id,
      caption: 'Living room with Cascade view',
      sortOrder: 0,
      isCover: true,
    },
    {
      key: 'properties/seed/1/photo-1.jpg',
      propertyId: p1.id,
      caption: 'Primary bedroom',
      sortOrder: 1,
      isCover: false,
    },
    {
      key: 'properties/seed/1/photo-2.jpg',
      propertyId: p1.id,
      caption: 'Kitchen',
      sortOrder: 2,
      isCover: false,
    },
    {
      key: 'properties/seed/2/photo-0.jpg',
      propertyId: p2.id,
      caption: 'Studio overview',
      sortOrder: 0,
      isCover: true,
    },
    {
      key: 'properties/seed/2/photo-1.jpg',
      propertyId: p2.id,
      caption: 'Northern Avenue view',
      sortOrder: 1,
      isCover: false,
    },
    {
      key: 'properties/seed/3/photo-0.jpg',
      propertyId: p3.id,
      caption: 'Heritage house facade',
      sortOrder: 0,
      isCover: true,
    },
    {
      key: 'properties/seed/3/photo-1.jpg',
      propertyId: p3.id,
      caption: 'Garden and balcony',
      sortOrder: 1,
      isCover: false,
    },
    {
      key: 'properties/seed/3/photo-2.jpg',
      propertyId: p3.id,
      caption: 'Master bedroom',
      sortOrder: 2,
      isCover: false,
    },
    {
      key: 'properties/seed/3/photo-3.jpg',
      propertyId: p3.id,
      caption: 'Dining area',
      sortOrder: 3,
      isCover: false,
    },
    {
      key: 'properties/seed/4/photo-0.jpg',
      propertyId: p4.id,
      caption: 'Guesthouse exterior',
      sortOrder: 0,
      isCover: true,
    },
    {
      key: 'properties/seed/4/photo-1.jpg',
      propertyId: p4.id,
      caption: 'Ararat view from balcony',
      sortOrder: 1,
      isCover: false,
    },
    {
      key: 'properties/seed/4/photo-2.jpg',
      propertyId: p4.id,
      caption: 'Common lounge',
      sortOrder: 2,
      isCover: false,
    },
    {
      key: 'properties/seed/5/photo-0.jpg',
      propertyId: p5.id,
      caption: 'Penthouse rooftop terrace',
      sortOrder: 0,
      isCover: true,
    },
    {
      key: 'properties/seed/5/photo-1.jpg',
      propertyId: p5.id,
      caption: 'Living area with panoramic windows',
      sortOrder: 1,
      isCover: false,
    },
    {
      key: 'properties/seed/5/photo-2.jpg',
      propertyId: p5.id,
      caption: 'Jacuzzi',
      sortOrder: 2,
      isCover: false,
    },
    {
      key: 'properties/seed/6/photo-0.jpg',
      propertyId: p6.id,
      caption: 'Villa exterior in forest',
      sortOrder: 0,
      isCover: true,
    },
    {
      key: 'properties/seed/6/photo-1.jpg',
      propertyId: p6.id,
      caption: 'Master suite',
      sortOrder: 1,
      isCover: false,
    },
    {
      key: 'properties/seed/6/photo-2.jpg',
      propertyId: p6.id,
      caption: 'Living room with fireplace',
      sortOrder: 2,
      isCover: false,
    },
    {
      key: 'properties/seed/6/photo-3.jpg',
      propertyId: p6.id,
      caption: 'Outdoor terrace',
      sortOrder: 3,
      isCover: false,
    },
  ];

  for (const photo of photos) {
    await prisma.propertyPhoto.upsert({ where: { key: photo.key }, update: {}, create: photo });
  }

  // ── Amenities ────────────────────────────────────────────────────────────
  type AmenitySeed = { propertyId: string; name: string; category: string };
  const amenities: AmenitySeed[] = [
    // p1 — Cascade View Apartment
    { propertyId: p1.id, name: 'WiFi', category: 'Essentials' },
    { propertyId: p1.id, name: 'Air conditioning', category: 'Climate' },
    { propertyId: p1.id, name: 'Heating', category: 'Climate' },
    { propertyId: p1.id, name: 'Full kitchen', category: 'Kitchen' },
    { propertyId: p1.id, name: 'Washing machine', category: 'Laundry' },
    { propertyId: p1.id, name: 'Elevator', category: 'Building' },
    { propertyId: p1.id, name: 'City view', category: 'Views' },
    { propertyId: p1.id, name: 'Smart TV', category: 'Entertainment' },
    { propertyId: p1.id, name: 'Workspace desk', category: 'Work' },
    // p2 — Northern Avenue Studio
    { propertyId: p2.id, name: 'WiFi', category: 'Essentials' },
    { propertyId: p2.id, name: 'Air conditioning', category: 'Climate' },
    { propertyId: p2.id, name: 'Kitchenette', category: 'Kitchen' },
    { propertyId: p2.id, name: 'Smart TV', category: 'Entertainment' },
    { propertyId: p2.id, name: 'Elevator', category: 'Building' },
    { propertyId: p2.id, name: 'Iron & ironing board', category: 'Essentials' },
    { propertyId: p2.id, name: '24h check-in', category: 'Service' },
    { propertyId: p2.id, name: 'City centre location', category: 'Location' },
    // p3 — Kentron Heritage House
    { propertyId: p3.id, name: 'WiFi', category: 'Essentials' },
    { propertyId: p3.id, name: 'Heating', category: 'Climate' },
    { propertyId: p3.id, name: 'Full kitchen', category: 'Kitchen' },
    { propertyId: p3.id, name: 'Garden', category: 'Outdoor' },
    { propertyId: p3.id, name: 'Balcony', category: 'Outdoor' },
    { propertyId: p3.id, name: 'Free parking', category: 'Parking' },
    { propertyId: p3.id, name: 'Washing machine', category: 'Laundry' },
    { propertyId: p3.id, name: 'Baby cot available', category: 'Family' },
    { propertyId: p3.id, name: 'Pet friendly', category: 'Pets' },
    { propertyId: p3.id, name: 'BBQ grill', category: 'Outdoor' },
    // p4 — Ararat Mountain Guesthouse
    { propertyId: p4.id, name: 'WiFi', category: 'Essentials' },
    { propertyId: p4.id, name: 'Mountain view', category: 'Views' },
    { propertyId: p4.id, name: 'Heating', category: 'Climate' },
    { propertyId: p4.id, name: 'Shared kitchen', category: 'Kitchen' },
    { propertyId: p4.id, name: 'Breakfast available', category: 'Food' },
    { propertyId: p4.id, name: 'Luggage storage', category: 'Service' },
    { propertyId: p4.id, name: 'Tour desk', category: 'Service' },
    { propertyId: p4.id, name: 'Common area', category: 'Facilities' },
    // p5 — Silk Road Penthouse
    { propertyId: p5.id, name: 'WiFi (1 Gbps)', category: 'Essentials' },
    { propertyId: p5.id, name: 'Air conditioning', category: 'Climate' },
    { propertyId: p5.id, name: 'Jacuzzi', category: 'Wellness' },
    { propertyId: p5.id, name: 'Rooftop terrace', category: 'Outdoor' },
    { propertyId: p5.id, name: 'Full kitchen', category: 'Kitchen' },
    { propertyId: p5.id, name: 'Concierge service', category: 'Service' },
    { propertyId: p5.id, name: 'Smart TV 4K', category: 'Entertainment' },
    { propertyId: p5.id, name: 'Panoramic city view', category: 'Views' },
    { propertyId: p5.id, name: 'Private parking', category: 'Parking' },
    { propertyId: p5.id, name: 'Gym access', category: 'Wellness' },
    // p6 — Dilijan Forest Villa
    { propertyId: p6.id, name: 'WiFi', category: 'Essentials' },
    { propertyId: p6.id, name: 'Heating', category: 'Climate' },
    { propertyId: p6.id, name: 'Fireplace', category: 'Climate' },
    { propertyId: p6.id, name: 'Full kitchen', category: 'Kitchen' },
    { propertyId: p6.id, name: 'Free parking', category: 'Parking' },
    { propertyId: p6.id, name: 'Forest view', category: 'Views' },
    { propertyId: p6.id, name: 'Outdoor terrace', category: 'Outdoor' },
    { propertyId: p6.id, name: 'BBQ grill', category: 'Outdoor' },
    { propertyId: p6.id, name: 'Pet friendly', category: 'Pets' },
    { propertyId: p6.id, name: 'Washing machine', category: 'Laundry' },
    { propertyId: p6.id, name: 'Board games', category: 'Entertainment' },
  ];

  for (const amenity of amenities) {
    await prisma.propertyAmenity.upsert({
      where: { propertyId_name: { propertyId: amenity.propertyId, name: amenity.name } },
      update: {},
      create: amenity,
    });
  }

  // ── Availability (next 90 days for each active property) ─────────────────
  for (const property of allActive) {
    for (let day = 0; day < 90; day++) {
      const date = utcDate(day);
      await prisma.availability.upsert({
        where: { propertyId_date: { propertyId: property.id, date } },
        update: {},
        create: { propertyId: property.id, date, isAvailable: true },
      });
    }
  }

  // ── Bookings ─────────────────────────────────────────────────────────────

  // COMPLETED: guest1 stayed at p1 (needed for reviews)
  const completedBooking = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed' },
    update: {},
    create: {
      id: 'seed-booking-completed',
      propertyId: p1.id,
      guestId: guest1.id,
      status: 'COMPLETED',
      checkIn: utcDate(-20),
      checkOut: utcDate(-17),
      guestCount: 2,
      currency: 'AMD',
      nightlyRate: p1.pricePerNight,
      nightsCount: 3,
      cleaningFee: p1.cleaningFee,
      securityDeposit: p1.securityDeposit,
      totalAmount: p1.pricePerNight * 3 + p1.cleaningFee + p1.securityDeposit,
      externalPaymentRef: 'BANK-TRX-001',
    },
  });

  // CONFIRMED: guest1 past stay at p2
  const confirmedBooking1 = await prisma.booking.upsert({
    where: { id: 'seed-booking-confirmed-1' },
    update: {},
    create: {
      id: 'seed-booking-confirmed-1',
      propertyId: p2.id,
      guestId: guest1.id,
      status: 'CONFIRMED',
      checkIn: utcDate(-8),
      checkOut: utcDate(-6),
      guestCount: 1,
      currency: 'AMD',
      nightlyRate: p2.pricePerNight,
      nightsCount: 2,
      cleaningFee: p2.cleaningFee,
      securityDeposit: p2.securityDeposit,
      totalAmount: p2.pricePerNight * 2 + p2.cleaningFee + p2.securityDeposit,
    },
  });

  // CONFIRMED: guest1 upcoming stay at p3
  const confirmedBooking2 = await prisma.booking.upsert({
    where: { id: 'seed-booking-confirmed-2' },
    update: {},
    create: {
      id: 'seed-booking-confirmed-2',
      propertyId: p3.id,
      guestId: guest1.id,
      status: 'CONFIRMED',
      checkIn: utcDate(10),
      checkOut: utcDate(14),
      guestCount: 4,
      currency: 'AMD',
      nightlyRate: p3.pricePerNight,
      nightsCount: 4,
      cleaningFee: p3.cleaningFee,
      securityDeposit: p3.securityDeposit,
      totalAmount: p3.pricePerNight * 4 + p3.cleaningFee + p3.securityDeposit,
    },
  });

  // PENDING: guest2 at p4
  const pendingBooking = await prisma.booking.upsert({
    where: { id: 'seed-booking-pending' },
    update: {},
    create: {
      id: 'seed-booking-pending',
      propertyId: p4.id,
      guestId: guest2.id,
      status: 'PENDING',
      checkIn: utcDate(20),
      checkOut: utcDate(23),
      guestCount: 3,
      specialRequests: 'Could we get a late check-out if possible?',
      currency: 'AMD',
      nightlyRate: p4.pricePerNight,
      nightsCount: 3,
      cleaningFee: p4.cleaningFee,
      securityDeposit: p4.securityDeposit,
      totalAmount: p4.pricePerNight * 3 + p4.cleaningFee + p4.securityDeposit,
    },
  });

  // COMPLETED: guest3 stayed at p1 (Cascade View)
  const completedBooking2 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-2' },
    update: {},
    create: {
      id: 'seed-booking-completed-2',
      propertyId: p1.id,
      guestId: guest3.id,
      status: 'COMPLETED',
      checkIn: utcDate(-45),
      checkOut: utcDate(-42),
      guestCount: 2,
      currency: 'AMD',
      nightlyRate: p1.pricePerNight,
      nightsCount: 3,
      cleaningFee: p1.cleaningFee,
      securityDeposit: p1.securityDeposit,
      totalAmount: p1.pricePerNight * 3 + p1.cleaningFee + p1.securityDeposit,
    },
  });

  // COMPLETED: guest2 stayed at p2 (Northern Avenue Studio)
  const completedBooking3 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-3' },
    update: {},
    create: {
      id: 'seed-booking-completed-3',
      propertyId: p2.id,
      guestId: guest2.id,
      status: 'COMPLETED',
      checkIn: utcDate(-30),
      checkOut: utcDate(-28),
      guestCount: 2,
      currency: 'AMD',
      nightlyRate: p2.pricePerNight,
      nightsCount: 2,
      cleaningFee: p2.cleaningFee,
      securityDeposit: p2.securityDeposit,
      totalAmount: p2.pricePerNight * 2 + p2.cleaningFee + p2.securityDeposit,
    },
  });

  // COMPLETED: guest4 stayed at p3 (Kentron Heritage House)
  const completedBooking4 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-4' },
    update: {},
    create: {
      id: 'seed-booking-completed-4',
      propertyId: p3.id,
      guestId: guest4.id,
      status: 'COMPLETED',
      checkIn: utcDate(-60),
      checkOut: utcDate(-56),
      guestCount: 4,
      currency: 'AMD',
      nightlyRate: p3.pricePerNight,
      nightsCount: 4,
      cleaningFee: p3.cleaningFee,
      securityDeposit: p3.securityDeposit,
      totalAmount: p3.pricePerNight * 4 + p3.cleaningFee + p3.securityDeposit,
    },
  });

  // COMPLETED: guest3 stayed at p3 (Kentron Heritage House)
  const completedBooking5 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-5' },
    update: {},
    create: {
      id: 'seed-booking-completed-5',
      propertyId: p3.id,
      guestId: guest3.id,
      status: 'COMPLETED',
      checkIn: utcDate(-90),
      checkOut: utcDate(-86),
      guestCount: 3,
      currency: 'AMD',
      nightlyRate: p3.pricePerNight,
      nightsCount: 4,
      cleaningFee: p3.cleaningFee,
      securityDeposit: p3.securityDeposit,
      totalAmount: p3.pricePerNight * 4 + p3.cleaningFee + p3.securityDeposit,
    },
  });

  // COMPLETED: guest4 stayed at p4 (Ararat Mountain Guesthouse)
  const completedBooking6 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-6' },
    update: {},
    create: {
      id: 'seed-booking-completed-6',
      propertyId: p4.id,
      guestId: guest4.id,
      status: 'COMPLETED',
      checkIn: utcDate(-50),
      checkOut: utcDate(-47),
      guestCount: 2,
      currency: 'AMD',
      nightlyRate: p4.pricePerNight,
      nightsCount: 3,
      cleaningFee: p4.cleaningFee,
      securityDeposit: p4.securityDeposit,
      totalAmount: p4.pricePerNight * 3 + p4.cleaningFee + p4.securityDeposit,
    },
  });

  // COMPLETED: guest3 stayed at p5 (Silk Road Penthouse)
  const completedBooking7 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-7' },
    update: {},
    create: {
      id: 'seed-booking-completed-7',
      propertyId: p5.id,
      guestId: guest3.id,
      status: 'COMPLETED',
      checkIn: utcDate(-15),
      checkOut: utcDate(-12),
      guestCount: 2,
      currency: 'AMD',
      nightlyRate: p5.pricePerNight,
      nightsCount: 3,
      cleaningFee: p5.cleaningFee,
      securityDeposit: p5.securityDeposit,
      totalAmount: p5.pricePerNight * 3 + p5.cleaningFee + p5.securityDeposit,
    },
  });

  // COMPLETED: guest4 stayed at p5 (Silk Road Penthouse)
  const completedBooking8 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-8' },
    update: {},
    create: {
      id: 'seed-booking-completed-8',
      propertyId: p5.id,
      guestId: guest4.id,
      status: 'COMPLETED',
      checkIn: utcDate(-25),
      checkOut: utcDate(-22),
      guestCount: 2,
      currency: 'AMD',
      nightlyRate: p5.pricePerNight,
      nightsCount: 3,
      cleaningFee: p5.cleaningFee,
      securityDeposit: p5.securityDeposit,
      totalAmount: p5.pricePerNight * 3 + p5.cleaningFee + p5.securityDeposit,
    },
  });

  // COMPLETED: guest1 stayed at p6 (Dilijan Forest Villa)
  const completedBooking9 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-9' },
    update: {},
    create: {
      id: 'seed-booking-completed-9',
      propertyId: p6.id,
      guestId: guest1.id,
      status: 'COMPLETED',
      checkIn: utcDate(-40),
      checkOut: utcDate(-36),
      guestCount: 4,
      currency: 'AMD',
      nightlyRate: p6.pricePerNight,
      nightsCount: 4,
      cleaningFee: p6.cleaningFee,
      securityDeposit: p6.securityDeposit,
      totalAmount: p6.pricePerNight * 4 + p6.cleaningFee + p6.securityDeposit,
    },
  });

  // COMPLETED: guest2 stayed at p6 (Dilijan Forest Villa)
  const completedBooking10 = await prisma.booking.upsert({
    where: { id: 'seed-booking-completed-10' },
    update: {},
    create: {
      id: 'seed-booking-completed-10',
      propertyId: p6.id,
      guestId: guest2.id,
      status: 'COMPLETED',
      checkIn: utcDate(-70),
      checkOut: utcDate(-65),
      guestCount: 3,
      currency: 'AMD',
      nightlyRate: p6.pricePerNight,
      nightsCount: 5,
      cleaningFee: p6.cleaningFee,
      securityDeposit: p6.securityDeposit,
      totalAmount: p6.pricePerNight * 5 + p6.cleaningFee + p6.securityDeposit,
    },
  });

  // ── Conversations ────────────────────────────────────────────────────────
  const completedConversation = await prisma.conversation.upsert({
    where: { bookingId: completedBooking.id },
    update: {},
    create: { bookingId: completedBooking.id },
  });

  await prisma.conversation.upsert({
    where: { bookingId: confirmedBooking1.id },
    update: {},
    create: { bookingId: confirmedBooking1.id },
  });

  await prisma.conversation.upsert({
    where: { bookingId: confirmedBooking2.id },
    update: {},
    create: { bookingId: confirmedBooking2.id },
  });

  await prisma.conversation.upsert({
    where: { bookingId: pendingBooking.id },
    update: {},
    create: { bookingId: pendingBooking.id },
  });

  // ── Messages (3 in completed booking conversation) ───────────────────────
  await prisma.message.upsert({
    where: { id: 'seed-msg-001' },
    update: {},
    create: {
      id: 'seed-msg-001',
      conversationId: completedConversation.id,
      senderId: guest1.id,
      body: 'Hi Armen! Looking forward to the stay. Any parking tips nearby?',
      status: 'READ',
      readAt: utcDate(-22),
    },
  });

  await prisma.message.upsert({
    where: { id: 'seed-msg-002' },
    update: {},
    create: {
      id: 'seed-msg-002',
      conversationId: completedConversation.id,
      senderId: host1.id,
      body: 'Welcome Maria! There is free street parking on Tamanyan St after 18:00. See you soon!',
      status: 'READ',
      readAt: utcDate(-22),
    },
  });

  await prisma.message.upsert({
    where: { id: 'seed-msg-003' },
    update: {},
    create: {
      id: 'seed-msg-003',
      conversationId: completedConversation.id,
      senderId: guest1.id,
      body: 'Thank you for a wonderful stay! The view was incredible.',
      status: 'READ',
      readAt: utcDate(-16),
    },
  });

  // ── Reviews ──────────────────────────────────────────────────────────────
  // guest1 reviews property p1
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking.id,
        authorId: guest1.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking.id,
      authorId: guest1.id,
      subjectId: host1.id,
      target: 'PROPERTY',
      propertyId: p1.id,
      rating: 5,
      comment:
        'Stunning Cascade view, spotlessly clean, and Armen was a very responsive host. Highly recommend!',
    },
  });

  // host1 reviews guest1
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking.id,
        authorId: host1.id,
        target: 'GUEST',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking.id,
      authorId: host1.id,
      subjectId: guest1.id,
      target: 'GUEST',
      rating: 5,
      comment:
        'Maria was a perfect guest — communicative, tidy, and left the apartment in great condition.',
    },
  });

  // guest3 (Sophie) reviews p1 (Cascade View) — 4★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking2.id,
        authorId: guest3.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking2.id,
      authorId: guest3.id,
      subjectId: host1.id,
      target: 'PROPERTY',
      propertyId: p1.id,
      rating: 4,
      comment:
        'Beautiful apartment with an amazing view of the Cascade. Very clean and well-equipped. The only minor issue was the street noise at night.',
    },
  });

  // guest2 (David) reviews p2 (Northern Avenue Studio) — 4★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking3.id,
        authorId: guest2.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking3.id,
      authorId: guest2.id,
      subjectId: host1.id,
      target: 'PROPERTY',
      propertyId: p2.id,
      rating: 4,
      comment:
        'Perfect location right on Northern Avenue. Studio is compact but has everything you need. Great for a short city stay.',
    },
  });

  // guest4 (Narek) reviews p3 (Kentron Heritage House) — 5★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking4.id,
        authorId: guest4.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking4.id,
      authorId: guest4.id,
      subjectId: host2.id,
      target: 'PROPERTY',
      propertyId: p3.id,
      rating: 5,
      comment:
        'This historic house is absolutely stunning. Every detail has been thoughtfully preserved. Naré was an incredibly welcoming host.',
    },
  });

  // guest3 (Sophie) reviews p3 (Kentron Heritage House) — 5★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking5.id,
        authorId: guest3.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking5.id,
      authorId: guest3.id,
      subjectId: host2.id,
      target: 'PROPERTY',
      propertyId: p3.id,
      rating: 5,
      comment:
        'As an architecture lover I was blown away. The heritage details, the courtyard garden — simply perfect. Will definitely return.',
    },
  });

  // guest4 (Narek) reviews p4 (Ararat Mountain Guesthouse) — 3★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking6.id,
        authorId: guest4.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking6.id,
      authorId: guest4.id,
      subjectId: host2.id,
      target: 'PROPERTY',
      propertyId: p4.id,
      rating: 3,
      comment:
        'The Ararat view is genuinely spectacular. However, the heating was inconsistent and the Wi-Fi was slow. Decent for the price but room for improvement.',
    },
  });

  // guest3 (Sophie) reviews p5 (Silk Road Penthouse) — 5★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking7.id,
        authorId: guest3.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking7.id,
      authorId: guest3.id,
      subjectId: host3.id,
      target: 'PROPERTY',
      propertyId: p5.id,
      rating: 5,
      comment:
        'Wow. The penthouse exceeded every expectation. Floor-to-ceiling windows, impeccable interior, and a rooftop terrace to die for. RentStar Hospitality team was super professional.',
    },
  });

  // guest4 (Narek) reviews p5 (Silk Road Penthouse) — 4★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking8.id,
        authorId: guest4.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking8.id,
      authorId: guest4.id,
      subjectId: host3.id,
      target: 'PROPERTY',
      propertyId: p5.id,
      rating: 4,
      comment:
        'Great luxury property in the heart of the city. Check-in was seamless. Slight noise from the street below at night, otherwise outstanding.',
    },
  });

  // guest1 (Maria) reviews p6 (Dilijan Forest Villa) — 4★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking9.id,
        authorId: guest1.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking9.id,
      authorId: guest1.id,
      subjectId: host3.id,
      target: 'PROPERTY',
      propertyId: p6.id,
      rating: 4,
      comment:
        'A true forest escape. The villa is spacious and cozy with beautiful pine views. The drive from Yerevan is very doable. Would have given 5 stars if the hot tub had been working.',
    },
  });

  // guest2 (David) reviews p6 (Dilijan Forest Villa) — 5★
  await prisma.review.upsert({
    where: {
      bookingId_authorId_target: {
        bookingId: completedBooking10.id,
        authorId: guest2.id,
        target: 'PROPERTY',
      },
    },
    update: {},
    create: {
      bookingId: completedBooking10.id,
      authorId: guest2.id,
      subjectId: host3.id,
      target: 'PROPERTY',
      propertyId: p6.id,
      rating: 5,
      comment:
        'Perfect digital detox retreat. Strong enough Wi-Fi for work calls, total silence otherwise. The forest walks at dawn were magical. Already planning a return trip.',
    },
  });

  // ── Notifications ────────────────────────────────────────────────────────
  const notifications = [
    {
      id: 'seed-notif-001',
      userId: hp2.userId,
      type: 'BOOKING_REQUEST' as const,
      title: 'New booking request',
      body: 'David Kim requested Ararat Mountain Guesthouse for 3 nights.',
      refId: pendingBooking.id,
      refType: 'booking',
    },
    {
      id: 'seed-notif-002',
      userId: guest2.id,
      type: 'BOOKING_REQUEST' as const,
      title: 'Booking sent',
      body: 'Your request for Ararat Mountain Guesthouse is pending approval.',
      refId: pendingBooking.id,
      refType: 'booking',
    },
    {
      id: 'seed-notif-003',
      userId: guest1.id,
      type: 'BOOKING_CONFIRMED' as const,
      title: 'Booking confirmed',
      body: 'Your booking for Kentron Heritage House has been confirmed.',
      refId: confirmedBooking2.id,
      refType: 'booking',
    },
    {
      id: 'seed-notif-004',
      userId: guest1.id,
      type: 'NEW_REVIEW' as const,
      title: 'New review received',
      body: 'Armen left you a 5-star review.',
      refId: completedBooking.id,
      refType: 'booking',
    },
  ];

  for (const n of notifications) {
    await prisma.notification.upsert({ where: { id: n.id }, update: {}, create: n });
  }

  console.log('');
  console.log('✅ Seed complete.');
  console.log('');
  console.log('Demo accounts (password: Password123!):');
  console.log('  admin@rentstar.am    — ADMIN');
  console.log('  staff@rentstar.am    — STAFF');
  console.log('  armen@rentstar.am    — HOST (individual, verified)');
  console.log('  nare@rentstar.am     — HOST (individual, verified)');
  console.log('  company@rentstar.am  — HOST (company, verified)');
  console.log('  maria@rentstar.am    — GUEST');
  console.log('  david@rentstar.am    — GUEST');
  console.log('  sophie@rentstar.am   — GUEST');
  console.log('  narek@rentstar.am    — GUEST');
  console.log('');
  console.log('Properties seeded: 6 ACTIVE (5 Yerevan + 1 Dilijan) + 1 DRAFT');
  console.log('Bookings: 10 COMPLETED · 2 CONFIRMED · 1 PENDING');
  console.log('Reviews: 10 property reviews across all 6 active properties');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
