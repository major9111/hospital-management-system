export function StatusBanner({ status }: { status: { kind: 'success' | 'error'; message: string } | null }) {
  if (!status) return null;
  const isError = status.kind === 'error';
  return (
    <p
      className={`text-sm px-3 py-2 rounded-sm border mb-4 ${
        isError
          ? 'text-signal bg-signal-light border-signal/30'
          : 'text-clinical-dark bg-clinical-light border-clinical/30'
      }`}
    >
      {status.message}
    </p>
  );
}
