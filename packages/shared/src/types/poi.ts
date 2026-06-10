export const MAX_FEATURED_POIS = 5;

export interface PoiNameLabels {
  en: string;
  hy: string;
  ru: string;
}

export interface PoiStation {
  id: string;
  sortOrder: number;
  category: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  nameLabels: PoiNameLabels;
}

export interface PoiDestination extends PoiStation {
  wikipediaTitle?: string;
  wikipediaUrl?: string;
}

export interface PoiDataset {
  citySlug: string;
  city: string;
  region: string;
  country: string;
  category: string;
  stations: PoiStation[];
}

export interface DestinationDataset {
  citySlug: string;
  city: string;
  region: string;
  country: string;
  destinations: PoiDestination[];
}

export interface NearestMetroStation {
  id: string;
  nameLabels: PoiNameLabels;
  latitude: number;
  longitude: number;
}

export interface NearestMetroResponse {
  station: NearestMetroStation | null;
  distanceMeters: number | null;
  distanceKm: number | null;
  approximate: true;
}

export interface NearbyPoiItem {
  id: string;
  category: string;
  nameLabels: PoiNameLabels;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceKm: number;
}

export interface NearbyPoisResponse {
  citySlug: string | null;
  pois: NearbyPoiItem[];
}

export interface PropertyFeaturedPoiView {
  id: string;
  sortOrder: number;
  category: string;
  nameLabels: PoiNameLabels;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceKm: number;
}
