export interface GeoInfo {
  countryCode: string | null;
  countryName: string | null;
  regionName: string | null;
  cityName: string | null;
  geoAccuracy: 'none' | 'country' | 'region' | 'city' | 'unknown';
}

const UNKNOWN_GEO: GeoInfo = {
  countryCode: null,
  countryName: null,
  regionName: null,
  cityName: null,
  geoAccuracy: 'none',
};

export function resolveGeo(_ipAddress: string | null): GeoInfo {
  return UNKNOWN_GEO;
}

export function resolveGeoFromHeaders(_headers: {
  'cf-ipcountry'?: string;
  'x-forwarded-for'?: string;
  'x-real-ip'?: string;
}): GeoInfo {
  return UNKNOWN_GEO;
}