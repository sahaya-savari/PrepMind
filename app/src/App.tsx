import { Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import TabNavigation from './components/TabNavigation';
import { useDocumentTitle } from './hooks/useDocumentTitle';

function App() {
  useDocumentTitle();

  return (
    <Layout>
      <Outlet />
      <div className="h-16 md:hidden" />
      <TabNavigation />
    </Layout>
  );
}

export default App;
