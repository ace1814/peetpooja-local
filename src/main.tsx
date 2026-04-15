import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Firebase is initialized lazily inside src/lib/firebase.ts
// No provider wrapper needed — Firebase uses its own internal state

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
