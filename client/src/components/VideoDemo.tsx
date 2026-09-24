import { useState } from 'react';

// Lightweight, privacy-friendly YouTube embed: shows the video thumbnail as a
// facade and only loads the (no-cookie) player iframe once the user clicks play,
// so the page stays fast and doesn't ping YouTube on every visit.
export default function VideoDemo({ id, title = 'MedDroid demo' }: { id: string; title?: string }) {
  const [play, setPlay] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const thumbFallback = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-ink-900 shadow-lg ring-1 ring-ink-900/10" style={{ aspectRatio: '16 / 9' }}>
      {play ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          className="group absolute inset-0 h-full w-full cursor-pointer"
          aria-label={`Play video: ${title}`}
        >
          <img
            src={thumb}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = thumbFallback; }}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-xl transition group-hover:scale-110 sm:h-20 sm:w-20">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 sm:h-9 sm:w-9" fill="#2F6FE0" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
