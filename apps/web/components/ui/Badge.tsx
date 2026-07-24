type Tone = 'neutral' | 'clinical' | 'signal';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-canvas text-ink-muted',
  clinical: 'bg-clinical-light text-clinical-dark',
  signal: 'bg-signal-light text-signal',
};

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium text-xs px-2.5 py-1 rounded-badge ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
