import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Detectamos tamaño inicial y aplicamos escala si es necesario
function setInitialAppScale() {
  try {
    const width = window.innerWidth || document.documentElement.clientWidth;
    // Ajusta este umbral si prefieres otro punto de corte
    if (width <= 420) {
      document.documentElement.style.setProperty('--app-scale', '0.75');
    } else {
      document.documentElement.style.setProperty('--app-scale', '1');
    }
  } catch (e) {
    // si algo falla, no hacemos nada
  }
}

// Ejecutar al cargar
setInitialAppScale();

// Opcional: actualizar al redimensionar (debounced simple)
let resizeTimeout = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    setInitialAppScale();
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
