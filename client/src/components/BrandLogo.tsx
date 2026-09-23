// The single source of truth for the MedDroid mark — a blue rounded square with a
// red medical cross and a white ECG pulse. Use this everywhere (navbar, footer,
// home) so the brand identity stays uniform across the app.
export default function BrandLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="MedDroid logo">
      <rect width="64" height="64" rx="14" fill="#4285F4" />
      <rect x="27.5" y="13" width="9" height="30" rx="4.5" fill="#EA4335" />
      <rect x="17" y="23.5" width="30" height="9" rx="4.5" fill="#EA4335" />
      <path d="M10 46 h11 l4 -9 5 16 4 -10 h20" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
