import { Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import TabNavigation from './components/TabNavigation';

function App() {
  return (
    <Layout>
      <Outlet />
      <div className="h-16" />
      <TabNavigation />
    </Layout>
  );
}

export default App;
