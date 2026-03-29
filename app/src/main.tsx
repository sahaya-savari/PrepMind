import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Practice from './pages/Practice';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import { AuthProvider } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import './index.css';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <AuthProvider>
        <ExamProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<Home />} />
                <Route path="chat" element={<Chat />} />
                <Route path="practice" element={<Practice />} />
                <Route path="progress" element={<Progress />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ExamProvider>
      </AuthProvider>
    </StrictMode>,
  );
}
