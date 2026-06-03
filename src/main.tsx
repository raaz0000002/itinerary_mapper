import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Polyfills for browser environment
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <App />
);
