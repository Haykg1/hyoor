const EARTH_RADIUS_METERS = 6371000;

export function computeDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const latDelta = ((latitudeB - latitudeA) * Math.PI) / 180;
  const lngDelta = ((longitudeB - longitudeA) * Math.PI) / 180;
  const latARad = (latitudeA * Math.PI) / 180;
  const latBRad = (latitudeB * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latARad) * Math.cos(latBRad) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

export function computeDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const meters = computeDistanceMeters(latitudeA, longitudeA, latitudeB, longitudeB);
  return Math.round((meters / 1000) * 1000) / 1000;
}
