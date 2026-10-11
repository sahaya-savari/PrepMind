import { Component, ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PrepMind ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container-shell py-12">
          <div className="rounded-xl border border-midnight-border bg-midnight-surface p-6 sm:p-8 space-y-4 max-w-lg mx-auto text-center">
            <h1 className="text-xl font-bold font-display text-ink-primary">
              Something went wrong.
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              An unexpected error occurred during rendering. You can safely retry or return to your study dashboard.
            </p>
            <div className="pt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-bold bg-midnight-accent text-[#0B0D12] hover:bg-midnight-accentHover transition-colors"
                onClick={() => this.setState({ hasError: false })}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
