import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </StrictMode>
);
