import { type Clinic, directionsUrl } from '../api/clinics';

// Ferry-style provider cards, but every field is REAL OpenStreetMap data.
// No invented names/phones, no fake "booking in 1 week" or insurance badges.

function KindIcon({ kind }: { kind: string }) {
  const isHospital = kind === 'Hospital';
  return (
    <span
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
        isHospital ? 'bg-clay-100 text-clay-600' : 'bg-cream-200 text-ink-700'
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
        {isHospital ? (
          <>
            <path d="M3 21h18M5 21V7l7-4 7 4v14" strokeLinejoin="round" />
            <path d="M12 9v6M9 12h6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M8 3v4M16 3v4M6 7h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
            <path d="M12 12v4M10 14h4" strokeLinecap="round" />
          </>
        )}
      </svg>
    </span>
  );
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

export default function ClinicCards({
  clinics,
  locationLabel,
  center,
  specialty,
}: {
  clinics: Clinic[];
  locationLabel?: string;
  center?: { lat: number; lon: number };
  specialty?: string;
}) {
  if (!clinics.length) return null;

  // Deep-links to the authoritative sources (real photos, reviews, doctor names,
  // booking) — the user sees the real listing; we never copy/guess that data.
  const listingUrl = (c: Clinic) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + (locationLabel ? ', ' + locationLabel : ''))}`;
  const near = locationLabel || 'me';
  const allOnMapsUrl = center
    ? `https://www.google.com/maps/search/${encodeURIComponent(specialty || 'hospitals and clinics')}/@${center.lat},${center.lon},14z`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((specialty || 'hospitals and clinics') + ' near ' + near)}`;
  const doctorsUrl = `https://www.google.com/search?q=${encodeURIComponent((specialty ? specialty + ' ' : '') + 'doctors near ' + near)}`;
  return (
    <div className="mt-1">
      <p className="mb-2 text-xs font-semibold text-ink-700/60">
        {clinics.length} option{clinics.length > 1 ? 's' : ''} near {locationLabel || 'you'} · tap Directions or Call
      </p>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {clinics.map((c, i) => (
          <div
            key={c.id}
            className="flex w-[80%] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-cream-300 bg-white p-4 shadow-sm sm:w-[280px]"
          >
            <div className="flex items-start gap-3">
              <KindIcon kind={c.kind} />
              <div className="min-w-0 flex-1">
                {i === 0 && (
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-bold text-clay-700">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    Nearest
                  </span>
                )}
                <a
                  href={listingUrl(c)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-display text-[15px] font-bold leading-snug text-ink-900 underline-offset-2 hover:text-clay-700 hover:underline"
                  title={`${c.name} — view photos, reviews & phone on Google`}
                >
                  {c.name}
                </a>
                <p className="text-xs font-semibold text-clay-600">
                  {c.kind}
                  {c.specialty ? ` · ${c.specialty}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-ink-700/80">
              <p className="flex items-start gap-1.5">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-700/50" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span>
                  <strong className="font-semibold text-ink-900">{fmtDist(c.distanceKm)}</strong>
                  {c.address ? <span className="block text-ink-700/60">{c.address}</span> : null}
                </span>
              </p>
              {c.hours && (
                <p className="flex items-center gap-1.5 text-ink-700/60">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" />
                  </svg>
                  <span className="truncate">{c.hours}</span>
                </p>
              )}
            </div>

            <div className="mt-auto flex gap-2 pt-3">
              <a
                href={directionsUrl(c)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-clay-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-clay-600"
              >
                Directions
              </a>
              {c.phone ? (
                <a
                  href={`tel:${c.phone.replace(/\s+/g, '')}`}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-cream-300 px-3 py-2 text-xs font-bold text-ink-800 transition hover:border-clay-400 hover:text-clay-600"
                >
                  Call
                </a>
              ) : (
                <span className="flex flex-1 items-center justify-center rounded-xl border border-cream-200 px-3 py-2 text-[11px] font-semibold text-ink-700/40">
                  No number listed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        <a
          href={allOnMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3 py-1.5 text-xs font-bold text-ink-800 transition hover:border-clay-400 hover:text-clay-600"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
          View all on Google Maps
        </a>
        <a
          href={doctorsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3 py-1.5 text-xs font-bold text-ink-800 transition hover:border-clay-400 hover:text-clay-600"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          Search doctors, photos &amp; reviews
        </a>
      </div>
      <p className="mt-2 text-[11px] text-ink-700/50">
        Nearby list from OpenStreetMap; tap a name or the buttons above for photos, reviews, doctor
        details &amp; booking on Google/Practo. Always call ahead to confirm they treat your condition.
      </p>
    </div>
  );
}
