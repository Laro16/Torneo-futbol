import React, { useEffect, useState, useRef, useCallback } from 'react';
import './index.css';
import stadiumImage from './images/stadium.jpg'; // <-- LÍNEA AÑADIDA

/*
  Proyecto: Liga Local (Solución Definitiva)
  - La imagen de fondo se importa y se aplica directamente desde JavaScript
    para garantizar que Vercel la encuentre durante el build.
*/

// --- DATOS INICIALES Y URLs (sin cambios) ---
// ... (el resto de tus constantes iniciales no cambia)
const initialStandingsData = [{ equipo: 'LA-PLEBE', jj: 6, pg: 6, pe: 0, pp: 0, gf: 24, gc: 7, pts: 18 }];
const initialScorersData = [{ jugador: 'Juan Perez', equipo: 'LA-PLEBE', goles: 9 }];
const initialNewsData = [];
const STANDINGS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=0&single=true&output=csv';
const SCORERS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1191349899&single=true&output=csv';
const NEWS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=747825916&single=true&output=csv';
const BRACKET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1728980058&single=true&output=csv';


// ... (todos tus helpers y componentes internos no cambian)
// safeNumber, normalizeHeader, parseCSV, splitCSVLine, etc.

// --- Componente Principal ---
export default function App() {
  const [standingsData, setStandingsData] = useState([]);
  const [scorersData, setScorersData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [bracketData, setBracketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('standings');
  // ... (el resto de tus useState hooks no cambia)
  const analysisControllerRef = useRef(null);

  // <-- BLOQUE AÑADIDO
  useEffect(() => {
    document.body.style.backgroundImage = `url(${stadiumImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center center';
    document.body.style.backgroundAttachment = 'fixed';
  
    // Limpia el estilo cuando el componente se desmonta
    return () => {
      document.body.style.backgroundImage = '';
    };
  }, []); // El array vacío asegura que esto solo se ejecute una vez

  // ... (el resto del código de tu componente App no cambia)
  // loadAll, useEffect, handleRefresh, handleSetView, etc.

  // ... (el return con todo el JSX no cambia)
}
