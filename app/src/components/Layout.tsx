import { PropsWithChildren } from 'react';
import Header from './Header';
import { ThemeProvider } from '../context/ThemeContext';

function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col text-primary bg-gradient-to-br from-[#0B0F14] via-[#0d1320] to-[#0B0F14] transition-colors">
        <Header />
        <main className="flex-1 w-full">
          <div className="container-shell space-y-10 pb-16">{children}</div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default Layout;
