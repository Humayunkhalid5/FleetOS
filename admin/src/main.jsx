import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are self-hosted from the shared client dependency runtime.
import '../../client/node_modules/@fontsource-variable/inter/wght.css';
import '../../client/node_modules/@fontsource/jetbrains-mono/500.css';
import '../../client/src/styles/fonts.css';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
