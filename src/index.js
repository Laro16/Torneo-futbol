// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

function applyAppScale(scale) {
  document.documentElement.style.setProperty('--app-scale', String(scale));
}

// Decide si aplicar escala 0.8 solo si el contenido no cabe en la ventana
function evaluateAndSetScale() {
  try {
    // Si aún no existe .app-wrap en el DOM, aplica 1 (por seguridad)
    const appWrap = document.querySelector('.app-wrap') || document.body;
    // Medimos el tamaño "natural" del contenido (sin scale)
    // Para obtener la altura y ancho real del contenido, comprobamos scrollHeight/scrollWidth del root
    const contentHeight = document.documentElement.scrollHeight;
    const contentWidth = document.documentElement.scrollWidth;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // Condición simple: si el contenido es mayor que el viewport por cualquier eje, escalamos.
    // Ajusta el umbral si quieres (por ejemplo: contentHeight > vh + 50)
    if (contentHeight > vh || contentWidth > vw) {
      // aplicar 0.8 (80%) — rápido y predecible
      applyAppScale(0.8);
    } else {
      applyAppScale(1);
    }
  } catch (e) {
    // si algo falla, dejar a 1
    applyAppScale(1);
  }
}

// Ejecutar en carga y en resize (debounced)
evaluateAndSetScale();
let resizeTimeout = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(evaluateAndSetScale, 140);
});

// Renderizar
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <div className="app-wrap">
      <App />
    </div>
  </React.StrictMode>
);
