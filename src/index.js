import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

/**
 * Política:
 * - Computadoras de escritorio (anchura >= 1024px) => escala 1 (sin zoom)
 * - Otros dispositivos (móviles/tablets, anchura < 1024px) => escala 0.8 (80%)
 *
 * Esto se aplica al cargar y al redimensionar.
 */

function applyAppScale(scale) {
  document.documentElement.style.setProperty('--app-scale', String(scale));
}

function isDesktopWidth() {
  try {
    return window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
  } catch (e) {
    return false;
  }
}

function setScaleByDevice() {
  if (isDesktopWidth()) {
    applyAppScale(1);
  } else {
    applyAppScale(0.8);
  }
}

// Ejecutar al cargar
setScaleByDevice();

// Re-evaluar al redimensionar (debounce simple)
let resizeTimeout = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    setScaleByDevice();
  }, 150);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <div className="app-wrap">
      <App />
    </div>
  </React.StrictMode>
);
