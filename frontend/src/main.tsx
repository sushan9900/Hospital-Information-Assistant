// ==============================================================================
// Hospital Information Assistance — Application Bootstrapper Mount Point
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This is the entrypoint that Vite compiles.
//   It binds the React root virtual DOM to the physical `#root` div element
//   declared inside `index.html`.
// ==============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
