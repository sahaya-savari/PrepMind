import { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import { ThemeProvider } from '../context/ThemeContext';
import { ClickSpark } from './reactbits/ClickSpark';

function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ClickSpark sparkColor="#C792EA" sparkSize={2} sparkCount={4}>
        {/* Accessibility Skip Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-50 px-4 py-2 bg-[var(--surface-elevated)] text-[var(--accent)] border border-[var(--accent)] rounded-lg font-mono text-xs shadow-lg"
        >
          Skip to main content
        </a>

        <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text-primary)] selection:bg-[var(--accent)]/30 selection:text-[var(--text-primary)] transition-colors">
          <Header />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8" id="main-content">
            {children}
          </main>
          
          {/* Subtle Terminal Footer */}
          <footer className="w-full border-t border-[var(--border)] bg-[var(--surface)] py-6 mt-12 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-wide text-[var(--text-primary)]">
                  PrepMind AI
                </span>
                <span aria-hidden="true" className="text-[var(--border)]">·</span>
                <span className="text-[var(--text-secondary)]">Terminal Edition</span>
                <span aria-hidden="true" className="text-[var(--border)]">·</span>
                <span className="font-mono text-[11px] text-[var(--accent)]">Obsidian & Lilac</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <Link to="/practice" className="hover:text-[var(--text-primary)] transition-colors">Practice</Link>
                <span aria-hidden="true" className="text-[var(--border)]">·</span>
                <Link to="/chat" className="hover:text-[var(--text-primary)] transition-colors">AI Tutor</Link>
                <span aria-hidden="true" className="text-[var(--border)]">·</span>
                <Link to="/progress" className="hover:text-[var(--text-primary)] transition-colors">Progress</Link>
                <span aria-hidden="true" className="text-[var(--border)]">·</span>
                <Link to="/profile" className="hover:text-[var(--text-primary)] transition-colors">Profile</Link>
              </div>
            </div>
          </footer>
        </div>
      </ClickSpark>
    </ThemeProvider>
  );
}

export default Layout;
