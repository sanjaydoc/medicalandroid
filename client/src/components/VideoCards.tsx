import { useState } from 'react';

// Compact "watch" cards for the home hero. Each card shows a video thumbnail and
// title; clicking opens a lightweight modal that plays the (no-cookie) player, so
// nothing loads from YouTube until the user actually clicks.
const VIDEOS = [
  { id: 'dZZ9j9gV-pE', title: 'How MedDroid reads a lab report' },
  { id: 'lzNpJzLYV3Y', title: 'Read an X-ray & child dosage' },
  { id: 'KAw2xkIu-cA', title: 'Understand your prescription' },
];

export default function VideoCards() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="vc-row">
        {VIDEOS.map((v) => (
          <button key={v.id} type="button" className="vc-card" onClick={() => setOpen(v.id)}>
            <span className="vc-thumb">
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt={v.title} loading="lazy" />
              <span className="vc-play" aria-hidden>
                <svg viewBox="0 0 24 24" fill="#2F6FE0"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </span>
            <span className="vc-title">{v.title}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="vc-modal" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="vc-modal-inner" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="vc-close" onClick={() => setOpen(null)} aria-label="Close video">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <div className="vc-player">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${open}?autoplay=1&rel=0&modestbranding=1`}
                title="MedDroid video"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
