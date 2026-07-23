type Tone = 'neutral' | 'clinical' | 'signal';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-paper text-ink-muted border-hairline',
  clinical: 'bg-clinical-light text-clinical-dark border-clinical/30',
  signal: 'bg-signal-light text-signal border-signal/30',
};

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-badge border ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
