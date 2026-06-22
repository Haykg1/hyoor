import { buildGuestInstructionsEmail } from './guest-instructions.template';

const baseData = {
  propertyTitle: 'Cascade View Apartment',
  propertyCity: 'Yerevan',
  propertyRegion: 'Yerevan',
  checkInDate: 'Mon, 17 Jun 2026',
  checkOutDate: 'Thu, 20 Jun 2026',
  checkInTime: '14:00',
  checkOutTime: '11:00',
  guestCount: 2,
  guestFirstName: 'Anna',
  formattedAddress: '10 Tamanyan Street, Yerevan',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=40.19,44.51',
  guestInstructionsHtml: '<p>Enter through the main gate. Lockbox code: <strong>8824</strong>.</p>',
  smokingAllowed: false,
  petsAllowed: false,
  partiesAllowed: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  additionalRules: 'No shoes indoors',
  hostName: 'Armen Host',
  hostPhone: '+37491111001',
  hostEmail: 'host@rentstar.am',
  frontendUrl: 'https://rentstar.am',
};

describe('buildGuestInstructionsEmail', () => {
  it('builds subject and body with property and booking details', () => {
    const email = buildGuestInstructionsEmail(baseData);
    expect(email.subject).toBe('Your check-in instructions for Cascade View Apartment');
    expect(email.html).toContain('Cascade View Apartment');
    expect(email.html).toContain('Anna');
    expect(email.html).toContain('10 Tamanyan Street, Yerevan');
    expect(email.html).toContain('Lockbox code');
    expect(email.html).toContain('No smoking indoors');
    expect(email.html).toContain('Quiet hours 22:00 – 08:00');
    expect(email.text).toContain('Anna');
    expect(email.text).toContain('Lockbox code: 8824');
  });

  it('includes house rules from property flags', () => {
    const email = buildGuestInstructionsEmail({
      ...baseData,
      additionalRules: null,
      quietHoursStart: null,
      quietHoursEnd: null,
    });
    expect(email.html).toContain('No smoking indoors');
    expect(email.html).toContain('No parties or events');
  });
});
