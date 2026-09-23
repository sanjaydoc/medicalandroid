// Nearby hospital / clinic finder — powered by OpenStreetMap (free, no API key).
// SAFETY: every field here comes from real OSM data. We NEVER let the AI invent a
// hospital name, phone number or address — a wrong number in a medical emergency
// is dangerous. If OSM has no data we say so, rather than guessing.
//
//   - Geocoding a typed area  -> Nominatim   (https://nominatim.openstreetmap.org)
//   - Nearby health POIs      -> Overpass    (multiple mirrors for reliability)

export interface Clinic {
  id: string;
  name: string;
  kind: string;               // Hospital | Clinic | Doctor | Pharmacy
  specialty?: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
}

export interface GeoPoint {
  lat: number;
  lon: number;
  label?: string;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];
const OVERPASS_TIMEOUT_MS = 15000; // fail fast per mirror, then try the next one

/** Haversine distance in km. */
function distKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Browser GPS location (asks the user's permission). */
export function getBrowserLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not available on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'your location' }),
      (err) => reject(new Error(err.code === 1 ? 'Location permission was denied.' : 'Could not get your location.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}

/** Turn a typed area/city into coordinates via Nominatim. */
export async function geocodeArea(area: string): Promise<GeoPoint> {
  const q = area.trim();
  if (!q) throw new Error('Please type an area or city.');
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Could not look up that area. Please try again.');
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) throw new Error(`Couldn't find "${q}". Try a nearby town or a more specific area.`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name.split(',').slice(0, 2).join(', ') };
}

function tag(el: OverpassEl, ...keys: string[]): string | undefined {
  const t = el.tags || {};
  for (const k of keys) if (t[k]) return t[k];
  return undefined;
}

function buildAddress(el: OverpassEl): string | undefined {
  const t = el.tags || {};
  const parts = [
    [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
    t['addr:suburb'] || t['addr:neighbourhood'],
    t['addr:city'] || t['addr:town'] || t['addr:village'],
    t['addr:postcode'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function kindOf(el: OverpassEl): string {
  const t = el.tags || {};
  const a = t.amenity || t.healthcare || '';
  if (a.includes('hospital')) return 'Hospital';
  if (a.includes('clinic')) return 'Clinic';
  if (a.includes('pharmacy')) return 'Pharmacy';
  if (a.includes('doctor')) return 'Doctor';
  return 'Clinic';
}

function prettySpeciality(s?: string): string | undefined {
  if (!s) return undefined;
  return s
    .split(/[;,]/)[0]
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

interface OverpassEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function overpassQuery(body: string): Promise<OverpassEl[]> {
  let lastErr: unknown;
  for (const ep of OVERPASS_ENDPOINTS) {
    // Per-mirror timeout so one overloaded server can't hang the whole search —
    // on timeout/error we fail over to the next mirror instead of spinning forever.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), OVERPASS_TIMEOUT_MS);
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassEl[] };
      return json.elements || [];
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      // try the next mirror
    }
  }
  // Every mirror failed/timed out.
  throw lastErr
    ? new Error('The map service is busy right now — please tap "Use my location" or type your area to try again.')
    : new Error('Could not reach the map service. Please try again.');
}

/**
 * Find nearby hospitals / clinics / doctors around a point. Widens the search
 * radius until it finds a few results. Returns up to `limit`, nearest first.
 */
export async function findNearbyClinics(point: GeoPoint, specialtyHint = '', limit = 8): Promise<Clinic[]> {
  const { lat, lon } = point;
  const radii = [7000, 25000]; // 7km first, widen to 25km only if too few results
  let elements: OverpassEl[] = [];
  for (const r of radii) {
    const q = `[out:json][timeout:25];
(
  node["amenity"~"hospital|clinic|doctors"](around:${r},${lat},${lon});
  way["amenity"~"hospital|clinic|doctors"](around:${r},${lat},${lon});
  node["healthcare"~"hospital|clinic|doctor|centre"](around:${r},${lat},${lon});
  way["healthcare"~"hospital|clinic|doctor|centre"](around:${r},${lat},${lon});
);
out center ${limit * 6};`;
    elements = await overpassQuery(q);
    if (elements.length >= 4) break;
  }

  const seen = new Set<string>();
  const hint = specialtyHint.toLowerCase().trim();
  const clinics: Clinic[] = elements
    .map((el): Clinic | null => {
      const name = tag(el, 'name');
      if (!name) return null; // unnamed POIs are useless to a patient
      const plat = el.lat ?? el.center?.lat;
      const plon = el.lon ?? el.center?.lon;
      if (plat == null || plon == null) return null;
      const key = name.toLowerCase() + '|' + plat.toFixed(4);
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id: `${el.type}/${el.id}`,
        name,
        kind: kindOf(el),
        specialty: prettySpeciality(tag(el, 'healthcare:speciality', 'speciality')),
        lat: plat,
        lon: plon,
        distanceKm: distKm(lat, lon, plat, plon),
        address: buildAddress(el),
        phone: tag(el, 'phone', 'contact:phone', 'contact:mobile'),
        website: tag(el, 'website', 'contact:website', 'url'),
        hours: tag(el, 'opening_hours'),
      };
    })
    .filter((c): c is Clinic => c !== null);

  // If the user asked for a speciality, float matches to the top (name or tag).
  clinics.sort((a, b) => {
    if (hint) {
      const am = (a.specialty?.toLowerCase().includes(hint) || a.name.toLowerCase().includes(hint)) ? 0 : 1;
      const bm = (b.specialty?.toLowerCase().includes(hint) || b.name.toLowerCase().includes(hint)) ? 0 : 1;
      if (am !== bm) return am - bm;
    }
    return a.distanceKm - b.distanceKm;
  });

  return clinics.slice(0, limit);
}

/** A Google Maps directions link (works even without our own maps key). */
export function directionsUrl(c: Clinic): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`;
}

/** Google Maps hospital search centred on a point — a reliable fallback when the
 *  OSM query service is busy (no query params, so it survives markdown escaping). */
export function hospitalsNearUrl(point: GeoPoint): string {
  return `https://www.google.com/maps/search/hospitals+and+clinics/@${point.lat},${point.lon},14z`;
}
