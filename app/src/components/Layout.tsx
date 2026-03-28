import { PropsWithChildren } from 'react';
import Header from './Header';

function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col text-white bg-slate-950">
      <Header />
      <main className="flex-1 w-full">
        <div className="container-shell space-y-10">{children}</div>
      </main>
    </div>
  );
}

export default Layout;
