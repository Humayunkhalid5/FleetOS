import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/fonts.css';
import './index.css';
import App from './App.jsx';
import { Public } from './routes';

// The first screen is a lazy route chunk. Waiting for it behind the boot
// splash means the page is painted once, in place, instead of painting an
// empty fallback and then pushing everything down (which registers as a large
// layout shift). Later navigations keep using the normal fallback.
const PUBLIC_ROUTES = {
  '/': Public.Home,
  '/login': Public.Login,
  '/register': Public.Register,
  '/company/register': Public.CompanyRegister,
  '/about': Public.About,
  '/contact': Public.Contact,
};

const root = createRoot(document.getElementById('root'));
const firstRoute = PUBLIC_ROUTES[window.location.pathname];

Promise.resolve(firstRoute?.preload?.()).catch(() => {}).then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
