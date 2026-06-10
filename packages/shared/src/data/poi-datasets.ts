import type { DestinationDataset, PoiDataset, PoiDestination } from '../types/poi';
import { normalizePoiCitySlug } from '../utils/poi-city';

import armeniaPois from './armenia_pois.json';
import yerevanMetroStations from './yerevan-metro-stations.json';
import yerevanPois from './yerevan_pois.json';

const YEREVAN_NEARBY_CITY_KEYS = ['Abovyan', 'Vagharshapat'] as const;

function toMetroDataset(citySlug: string, source: typeof yerevanMetroStations): PoiDataset {
  return {
    citySlug,
    city: source.city,
    region: source.region,
    country: source.country,
    category: source.category,
    stations: source.stations,
  };
}

function dedupeDestinations(destinations: PoiDestination[]): PoiDestination[] {
  const byId = new Map<string, PoiDestination>();
  for (const destination of destinations) {
    byId.set(destination.id, destination);
  }
  return [...byId.values()].sort((left, right) => left.sortOrder - right.sortOrder);
}

function buildYerevanDestinations(): PoiDestination[] {
  const merged: PoiDestination[] = [...(yerevanPois as PoiDestination[])];
  for (const cityKey of YEREVAN_NEARBY_CITY_KEYS) {
    const regional = (armeniaPois as Record<string, PoiDestination[]>)[cityKey] ?? [];
    merged.push(...regional);
  }
  return dedupeDestinations(merged);
}

function buildDestinationDataset(
  citySlug: string,
  city: string,
  region: string,
  destinations: PoiDestination[],
): DestinationDataset {
  return {
    citySlug,
    city,
    region,
    country: 'AM',
    destinations,
  };
}

const yerevanDestinations = buildYerevanDestinations();

export const METRO_POI_DATASETS: readonly PoiDataset[] = [
  toMetroDataset(normalizePoiCitySlug('Yerevan', 'Yerevan') ?? 'yerevan', yerevanMetroStations),
];

export const DESTINATION_DATASETS: readonly DestinationDataset[] = [
  buildDestinationDataset('yerevan', 'Yerevan', 'Yerevan', yerevanDestinations),
  ...Object.entries(armeniaPois as Record<string, PoiDestination[]>).map(([cityName, pois]) => {
    const citySlug = normalizePoiCitySlug(cityName) ?? slugFromCityName(cityName);
    const sample = pois[0];
    return buildDestinationDataset(
      citySlug,
      sample?.city ?? cityName,
      sample?.region ?? cityName,
      dedupeDestinations(pois),
    );
  }),
];

/** @deprecated Use METRO_POI_DATASETS */
export const POI_DATASETS = METRO_POI_DATASETS;

function slugFromCityName(cityName: string): string {
  return cityName.trim().toLowerCase().replace(/\s+/g, '-');
}

const destinationBySlug = new Map(
  DESTINATION_DATASETS.map((dataset) => [dataset.citySlug, dataset]),
);

const poiById = new Map<string, PoiDestination>();
for (const dataset of DESTINATION_DATASETS) {
  for (const destination of dataset.destinations) {
    poiById.set(destination.id, destination);
  }
}

export function listDestinationCitySlugs(): string[] {
  return DESTINATION_DATASETS.map((dataset) => dataset.citySlug);
}

export function getDestinationDataset(citySlug: string): DestinationDataset | null {
  return destinationBySlug.get(citySlug) ?? null;
}

export function findPoiById(poiId: string): PoiDestination | null {
  return poiById.get(poiId) ?? null;
}

export function findPoisByIds(poiIds: readonly string[]): PoiDestination[] {
  const results: PoiDestination[] = [];
  for (const poiId of poiIds) {
    const poi = findPoiById(poiId);
    if (poi) results.push(poi);
  }
  return results;
}
