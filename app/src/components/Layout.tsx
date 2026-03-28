import { PropsWithChildren } from 'react';
import Header from './Header';
import TabNavigation from './TabNavigation';

function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-ink-50">
      <Header />
      <main className="flex-1 w-full">
        <div className="container-shell">{children}</div>
      </main>
      <TabNavigation />
    </div>
  );
}

export default Layout;
