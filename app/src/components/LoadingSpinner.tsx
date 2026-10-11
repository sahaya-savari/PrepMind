type Props = {
  label?: string;
};

function LoadingSpinner({ label = 'Loading' }: Props) {
  return (
    <div className="inline-flex items-center gap-2.5 text-ink-secondary text-xs font-medium" role="status" aria-live="polite">
      <span className="relative h-4 w-4 shrink-0">
        <span className="absolute inset-0 rounded-full border-2 border-midnight-accent/20"></span>
        <span className="absolute inset-0 rounded-full border-2 border-midnight-accent border-t-transparent animate-spin"></span>
      </span>
      <span>{label}…</span>
    </div>
  );
}

export default LoadingSpinner;
