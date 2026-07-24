export function StatusBanner({ status }: { status: { kind: 'success' | 'error'; message: string } | null }) {
  if (!status) return null;
  const isError = status.kind === 'error';
  return (
    <p
      className={`text-sm px-3.5 py-2.5 rounded-xl mb-4 font-medium ${
        isError ? 'text-signal bg-signal-light' : 'text-clinical-dark bg-clinical-light'
      }`}
    >
      {status.message}
    </p>
  );
}
