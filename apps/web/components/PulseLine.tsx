export function PulseLine() {
  return (
    <svg viewBox="0 0 400 100" className="w-full h-auto" fill="none" aria-hidden>
      <path
        d="M0 50 H120 L140 20 L160 80 L180 10 L200 90 L220 50 H400"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset="1"
        className="animate-pulse-draw motion-reduce:[stroke-dashoffset:0]"
      />
    </svg>
  );
}
