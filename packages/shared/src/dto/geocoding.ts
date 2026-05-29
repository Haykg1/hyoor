export interface PlaceResult {
  name: string;
  fullName: string;
  description: string;
  lat: number;
  lng: number;
  country: string;
  region: string | null;
  city: string | null;
  street: string | null;
  buildingNumber: string | null;
  formattedAddress: string;
  placeKind: string;
}

export interface SearchPlacesResponse {
  places: PlaceResult[];
}

export type GeocodingSearchLevel = 'house' | 'any';

export const GeocodingSearchLevels = ['house', 'any'] as const;
