import { PropsWithChildren } from 'react';
import Header from './Header';
import { ThemeProvider } from '../context/ThemeContext';

function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-midnight-bg text-ink-primary transition-colors selection:bg-midnight-accent selection:text-midnight-bg">
        <Header />
        <main className="flex-1 w-full" id="main-content">
          <div className="container-shell">{children}</div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default Layout;
