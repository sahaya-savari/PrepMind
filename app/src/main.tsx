import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Chat from './pages/Chat';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/practice', element: <Practice /> },
          { path: '/chat', element: <Chat /> },
          { path: '/progress', element: <Progress /> },
          { path: '/profile', element: <Profile /> },
        ],
      },
    ],
  },
]);

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StrictMode>,
  );
}
