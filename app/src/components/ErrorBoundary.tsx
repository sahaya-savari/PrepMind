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
    console.error('PrepMind ErrorBoundary caught', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container-shell">
          <div className="card-surface p-6">
            <h1 className="text-xl font-semibold text-white mb-2">Something went wrong.</h1>
            <p className="text-ink-200 mb-4">Please refresh or navigate back to continue.</p>
            <button className="soft-button" onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
