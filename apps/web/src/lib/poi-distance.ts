export const MAX_METRO_DISTANCE_METERS = 2000;
const METERS_PER_KM = 1000;
const WHOLE_KM_THRESHOLD = 10;
const WALK_MAX_METERS = 1000;
const WALK_MINUTES_PER_KM = 14;
const MIN_TRAVEL_MINUTES = 2;
const VEHICLE_MIN_MINUTES_PER_KM = 6;
const VEHICLE_MAX_MINUTES_PER_KM = 10;

export type MetroTravelMode = 'walk' | 'vehicle';

export interface MetroTravelEstimate {
  mode: MetroTravelMode;
  travelTime: string;
}

function formatSingleMinutes(minutes: number): string {
  return `~${minutes} min`;
}

function formatMinuteRange(minMinutes: number, maxMinutes: number): string {
  if (minMinutes === maxMinutes) {
    return formatSingleMinutes(minMinutes);
  }
  return `~${minMinutes}–${maxMinutes} min`;
}

function formatWalkMinutes(distanceMeters: number): string {
  const minutes = Math.max(
    MIN_TRAVEL_MINUTES,
    Math.ceil((distanceMeters / METERS_PER_KM) * WALK_MINUTES_PER_KM),
  );
  return formatSingleMinutes(minutes);
}

function formatVehicleMinutes(distanceMeters: number): string {
  const km = distanceMeters / METERS_PER_KM;
  const minMinutes = Math.max(MIN_TRAVEL_MINUTES, Math.ceil(km * VEHICLE_MIN_MINUTES_PER_KM));
  const maxMinutes = Math.max(MIN_TRAVEL_MINUTES, Math.ceil(km * VEHICLE_MAX_MINUTES_PER_KM));
  return formatMinuteRange(minMinutes, maxMinutes);
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm >= WHOLE_KM_THRESHOLD) {
    return String(Math.round(distanceKm));
  }
  const rounded = Math.round(distanceKm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function getMetroTravelEstimate(distanceMeters: number): MetroTravelEstimate {
  const mode: MetroTravelMode = distanceMeters <= WALK_MAX_METERS ? 'walk' : 'vehicle';
  const travelTime =
    mode === 'walk' ? formatWalkMinutes(distanceMeters) : formatVehicleMinutes(distanceMeters);
  return { mode, travelTime };
}
