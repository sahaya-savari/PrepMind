type Props = {
  label?: string;
};

function LoadingSpinner({ label = 'Loading' }: Props) {
  return (
    <div className="flex items-center gap-3 text-ink-200">
      <span className="relative h-4 w-4">
        <span className="absolute inset-0 rounded-full border-2 border-accent-400 opacity-20"></span>
        <span className="absolute inset-0 rounded-full border-2 border-accent-400 border-t-transparent animate-spin"></span>
      </span>
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export default LoadingSpinner;
