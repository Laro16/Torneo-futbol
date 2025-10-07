import React, { useEffect, useState, useRef, useCallback } from 'react';
import './index.css';
import stadiumImage from './images/stadium.jpg'; // Importa la imagen desde la carpeta src

/*
  Proyecto: Liga Local (Versión Final Definitiva)
  - La imagen de fondo se importa y se aplica directamente desde JavaScript
    para garantizar que Vercel la encuentre durante el build.
*/

// --- DATOS INICIALES Y URLs ---
const initialStandingsData = [{ equipo: 'LA-PLEBE', jj: 6, pg: 6, pe: 0, pp: 0, gf: 24, gc: 7, pts: 18 }];
const initialScorersData = [{ jugador: 'Juan Perez', equipo: 'LA-PLEBE', goles: 9 }];
const initialNewsData = [];
const STANDINGS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=0&single=true&output=csv';
const SCORERS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1191349899&single=true&output=csv';
const NEWS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=747825916&single=true&output=csv';
const BRACKET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1728980058&single=true&output=csv';

// --- Helpers ---
const safeNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? v : n;
};
const normalizeHeader = (h) => String(h || '').trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').toLowerCase();
const NUMERIC_HEADERS = ['jj', 'pg', 'pe', 'pp', 'gf', 'gc', 'pts', 'goles', 'equipo1_marcador', 'equipo2_marcador', 'id', 'ronda_number'];
const parseCSV = (csvText) => {
  if (!csvText) return [];
  csvText = csvText.replace(/^\uFEFF/, '');
  const lines = csvText.split(/\r\n|\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map(normalizeHeader);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    if (row.length !== headers.length) continue;
    const entry = {};
    headers.forEach((h, idx) => {
      const val = row[idx] === undefined ? '' : row[idx].trim();
      if (NUMERIC_HEADERS.includes(h)) {
        entry[h] = safeNumber(val);
      } else {
        entry[h] = val;
      }
    });
    data.push(entry);
  }
  return data;
};
function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}
const fetchWithTimeout = async (url, timeout = 10_000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(id);
    return res;
  } catch (e) { clearTimeout(id); throw e; }
};
const CACHE_PREFIX = 'liga_local_cache_v3_';
const cacheGet = (key, maxAgeMs = 1000 * 60 * 5) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key); if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > maxAgeMs) { localStorage.removeItem(CACHE_PREFIX + key); return null; }
    return parsed.data;
  } catch (e) { return null; }
};
const cacheSet = (key, data) => { try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data })); } catch (e) { } };
const cacheClear = (key) => { localStorage.removeItem(CACHE_PREFIX + key); };
const callGeminiAPI = async (prompt, signal) => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) throw new Error('API key for Gemini not configured. Set REACT_APP_GEMINI_API_KEY');
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal, });
  if (!res.ok) { const body = await res.text(); throw new Error(`Gemini API error: ${res.status} - ${body}`); }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
};

// --- Componentes de UI ---
const IconRefresh = ({ size = 16 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> );
const Navbar = ({ activeView, setActiveView, onRefresh, lastUpdated }) => ( <nav className="navbar" role="navigation" aria-label="Navegación principal"><div className="nav-left"><button onClick={() => setActiveView('standings')} className={activeView === 'standings' ? 'active' : ''}>Posiciones</button><button onClick={() => setActiveView('scorers')} className={activeView === 'scorers' ? 'active' : ''}>Goleadores</button><button onClick={() => setActiveView('news')} className={activeView === 'news' ? 'active' : ''}>Noticias</button><button onClick={() => setActiveView('bracket')} className={activeView === 'bracket' ? 'active' : ''}>Llaves</button></div><div className="nav-right"><button onClick={onRefresh} title="Refrescar datos" aria-label="Refrescar"> <IconRefresh /> </button><div className="last-updated" aria-live="polite">{lastUpdated ? `Actualizado: ${lastUpdated}` : ''}</div></div></nav> );
const LoadingSpinner = ({ text = 'Cargando datos...' }) => ( <div className="spinner-container"> <div className="spinner" aria-hidden></div> <p>{text}</p> </div> );
const GeminiAnalysisModal = ({ team, analysis, isLoading, onClose, onRegenerate }) => { if (!team) return null; return ( <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true"><div className="modal-content" onClick={(e) => e.stopPropagation()}><button className="close-button" onClick={onClose} aria-label="Cerrar">&times;</button><h2>Análisis de {team.equipo}</h2><div className="stats-grid"><div><strong>Puntos:</strong> {team.pts}</div><div><strong>Partidos:</strong> {team.jj}</div><div><strong>Victorias:</strong> {team.pg}</div><div><strong>Empates:</strong> {team.pe}</div><div><strong>Derrotas:</strong> {team.pp}</div><div><strong>Goles a Favor:</strong> {team.gf}</div><div><strong>Goles en Contra:</strong> {team.gc}</div><div><strong>Diferencia:</strong> {team.gf - team.gc > 0 ? `+${team.gf - team.gc}` : team.gf - team.gc}</div></div><div className="analysis-box"><h3>Análisis con IA ✨</h3>{isLoading ? <div className="mini-spinner"></div> : <p>{analysis}</p>}</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}><button onClick={onRegenerate} className="small" disabled={isLoading}>{isLoading ? 'Generando...' : 'Regenerar'}</button><button onClick={onClose} className="small secondary">Cerrar</button></div></div></div> ); };
const StandingsTable = ({ data, onTeamClick, search, sortBy, sortDir }) => { if (!data || data.length === 0) return <p style={{ textAlign: 'center' }}>No hay datos de posiciones disponibles.</p>; const filtered = search ? data.filter(d => d.equipo && d.equipo.toLowerCase().includes(search.trim().toLowerCase())) : data; const sorted = [...filtered].sort((a, b) => { if (sortBy === 'pts') return (b.pts || 0) - (a.pts || 0) || ((b.gf || 0) - (b.gc || 0)) - ((a.gf || 0) - (a.gc || 0)); if (sortBy === 'gf') return (b.gf || 0) - (a.gf || 0); if (sortBy === 'gd') return ((b.gf || 0) - (b.gc || 0)) - ((a.gf || 0) - (a.gc || 0)); const nameA = (a.equipo || '').toLowerCase(); const nameB = (b.equipo || '').toLowerCase(); return sortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA); }); return ( <div className="table-wrap"><table><thead><tr><th className="col-rank">#</th><th className="col-team">Equipo</th><th>JJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>+/-</th><th className="col-pts">PTS</th></tr></thead><tbody className="standings-body">{sorted.map((team, idx) => { const gd = (team.gf || 0) - (team.gc || 0); return ( <tr key={`${team.equipo}-${idx}`} onClick={() => onTeamClick(team)} className="clickable-row" title={`Click para ver análisis de ${team.equipo}`}><td className={`col-rank rank-${idx + 1}`}>{idx + 1}</td><td className="col-team">{team.equipo || '[Dato no disponible]'}</td><td>{team.jj ?? '-'}</td><td>{team.pg ?? '-'}</td><td>{team.pe ?? '-'}</td><td>{team.pp ?? '-'}</td><td>{team.gf ?? '-'}</td><td>{team.gc ?? '-'}</td><td className={gd >= 0 ? 'pos-positive' : 'pos-negative'}>{gd > 0 ? `+${gd}` : gd}</td><td className="col-pts">{team.pts ?? '-'}</td></tr> ); })}</tbody></table></div> ); };
const ScorersTable = ({ data, search }) => { if (!data || data.length === 0) return <p style={{ textAlign: 'center' }}>No hay datos de goleadores disponibles.</p>; const filtered = search ? data.filter(p => (p.jugador || '').toLowerCase().includes(search.toLowerCase()) || (p.equipo || '').toLowerCase().includes(search.toLowerCase())) : data; const sorted = [...filtered].sort((a, b) => (b.goles || 0) - (a.goles || 0)); return ( <div className="table-wrap"><table><thead><tr><th className="col-rank">#</th><th className="col-team">Jugador</th><th>Equipo</th><th className="col-pts">Goles</th></tr></thead><tbody>{sorted.map((p, idx) => ( <tr key={`${p.jugador}-${idx}`}><td className={`col-rank rank-${idx + 1}`}>{idx + 1}</td><td className="col-team">{p.jugador || '[Dato no disponible]'}</td><td>{p.equipo || '[Dato no disponible]'}</td><td className="col-pts">{p.goles ?? 0}</td></tr> ))}</tbody></table></div> ); };
const NewsSection = ({ data }) => { if (!data || data.length === 0) return <div className="news-container" style={{ textAlign: 'center', padding: 40 }}><p>NO HAY NOTICIAS NUEVAS, VUELVE MÁS TARDE</p></div>; const sorted = [...data].sort((a, b) => { const parse = (s) => s ? new Date(String(s).includes('/') ? String(s).split('/').reverse().join('-') : s).getTime() : 0; return (parse(b.fecha) || 0) - (parse(a.fecha) || 0); }); return ( <div className="news-container">{sorted.map((item, idx) => ( <article className="news-card" key={idx} aria-labelledby={`news-title-${idx}`}><h2 id={`news-title-${idx}`}>{item.titulo || '[Título no disponible]'}</h2><p className="news-date">{item.fecha}</p><div>{item.contenido}</div></article> ))}</div> ); };
const BracketView = ({ data }) => { if (!data || data.length === 0) { return <div className="bracket-section-background"><p className="empty-state-message">La fase de llaves aún no ha comenzado.</p></div>; } const rounds = data.reduce((acc, m, i) => { const r = m.ronda || `Ronda ${m.ronda_number || 'X'}`; if (!acc[r]) acc[r] = []; acc[r].push({ ...m, __id: i }); return acc; }, {}); const order = ['Octavos', 'Cuartos', 'Semifinal', 'Final'].filter(r => rounds[r] && rounds[r].length > 0); if (order.length === 0) { return <div className="bracket-section-background"><p className="empty-state-message">Las rondas de las llaves no están definidas aún.</p></div>; } return ( <div className="bracket-section-background"><div className="bracket-container-champions">{order.map(rn => ( <div className="round-champions" key={rn}><h2>{rn}</h2><div className="matches-champions">{rounds[rn].map(match => { const s1 = Number(match.equipo1_marcador); const s2 = Number(match.equipo2_marcador); const t1win = match.estado === 'Jugado' && s1 > s2; const t2win = match.estado === 'Jugado' && s2 > s1; return ( <div className="match-champions" key={match.__id}><div className={`team-champions ${t1win ? 'winner' : ''}`}><span className="team-name">{match.equipo1_nombre || 'A definir'}</span><span className="team-score">{match.equipo1_marcador ?? '-'}</span></div><div className={`team-champions ${t2win ? 'winner' : ''}`}><span className="team-name">{match.equipo2_nombre || 'A definir'}</span><span className="team-score">{match.equipo2_marcador ?? '-'}</span></div></div> ); })}</div></div> ))}</div></div> ); };

// --- Componente Principal ---
export default function App() {
  const [standingsData, setStandingsData] = useState([]);
  const [scorersData, setScorersData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [bracketData, setBracketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('standings');
  const [lastUpdated, setLastUpdated] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('pts');
  const [sortDir, setSortDir] = useState('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamAnalysis, setTeamAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const analysisControllerRef = useRef(null);

  useEffect(() => {
    // AHORA APLICAMOS UN DEGRADADO OSCURO ENCIMA DE LA IMAGEN
    document.body.style.backgroundImage = `linear-gradient(145deg, rgba(15, 23, 42, 0.4), rgba(13, 18, 28, 0.8)), url(${stadiumImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center center';
    document.body.style.backgroundAttachment = 'fixed';
  
    return () => {
      document.body.style.backgroundImage = '';
    };
  }, []);

  const loadAll = useCallback(async (force = false) => {
    setLoading(true);
    const loadDataset = async (url, fallback, cacheKey) => {
      if (!force) {
        const cached = cacheGet(cacheKey);
        if (cached) return cached;
      }
      try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        const parsed = parseCSV(text);
        if (parsed && parsed.length > 0) {
          cacheSet(cacheKey, parsed);
          return parsed;
        }
        return fallback;
      } catch (e) {
        console.warn('fetch failed for', url, e);
        if (force) cacheClear(cacheKey);
        return fallback;
      }
    };
    if (force) { ['standings', 'scorers', 'news', 'bracket'].forEach(cacheClear); }
    const [s, sc, n, b] = await Promise.all([
      loadDataset(STANDINGS_URL, initialStandingsData, 'standings'),
      loadDataset(SCORERS_URL, initialScorersData, 'scorers'),
      loadDataset(NEWS_URL, initialNewsData, 'news'),
      loadDataset(BRACKET_URL, [], 'bracket'),
    ]);
    setStandingsData(s); setScorersData(sc); setNewsData(n); setBracketData(b);
    setLastUpdated(new Date().toLocaleString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true }));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll(false);
    const id = setInterval(() => loadAll(false), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadAll]);

  const handleRefresh = () => loadAll(true);
  const handleSetView = (view) => { setSearchQuery(''); setActiveView(view); };
  const handleTeamClick = async (team) => {
    setSelectedTeam(team); setModalOpen(true); setAnalysisLoading(true); setTeamAnalysis('');
    if (analysisControllerRef.current) analysisControllerRef.current.abort();
    const controller = new AbortController(); analysisControllerRef.current = controller;
    const prompt = `Eres un analista de fútbol experto y carismático de Guatemala. Proporciona un análisis breve (2-3 frases) sobre el rendimiento del equipo '${team.equipo}'. Sus estadísticas son: ${team.jj} partidos jugados, ${team.pg} victorias, ${team.pe} empates, ${team.pp} derrotas, ${team.gf} goles a favor, y ${team.gc} goles en contra. Destaca sus fortalezas y debilidades de forma sencilla y directa, con un tono emocionante y local.`;
    try {
      const text = await callGeminiAPI(prompt, controller.signal);
      setTeamAnalysis(text || 'No se obtuvo resultado del servicio de IA.');
    } catch (e) {
      console.error(e); if (e.name === 'AbortError') return;
      setTeamAnalysis(String(e.message).includes('API key') ? 'La clave de API de Gemini no está configurada.' : 'Error al generar análisis. Intenta de nuevo.');
    } finally { setAnalysisLoading(false); analysisControllerRef.current = null; }
  };
  const handleRegenerateAnalysis = () => { if (selectedTeam) handleTeamClick(selectedTeam); };

  const renderContent = () => {
    if (loading) return <LoadingSpinner />;
    switch (activeView) {
      case 'standings': return (<><div className="controls-row"><div className="search-box"><input placeholder="Buscar equipo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Buscar equipo" /></div><div className="sort-box"><label htmlFor="sort-select">Orden:</label><select id="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="pts">Puntos</option><option value="gd">Diferencia</option><option value="gf">Goles a favor</option><option value="name">Nombre</option></select><button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="small">{sortDir === 'asc' ? 'Asc' : 'Desc'}</button></div></div><StandingsTable data={standingsData} onTeamClick={handleTeamClick} search={searchQuery} sortBy={sortBy} sortDir={sortDir} /></>);
      case 'scorers': return (<><div className="controls-row"><div className="search-box"><input placeholder="Buscar jugador o equipo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Buscar goleador" /></div></div><ScorersTable data={scorersData} search={searchQuery} /></>);
      case 'news': return <NewsSection data={newsData} />;
      case 'bracket': return <BracketView data={bracketData} />;
      default: return <StandingsTable data={standingsData} onTeamClick={handleTeamClick} search={searchQuery} sortBy={sortBy} sortDir={sortDir} />;
    }
  };

  return (
    <div className="container">
      <h1 className="main-title">Torneo "La Gloria del Barrio"</h1>
      <Navbar activeView={activeView} setActiveView={handleSetView} onRefresh={handleRefresh} lastUpdated={lastUpdated} />
      {renderContent()}
      {modalOpen && <GeminiAnalysisModal team={selectedTeam} analysis={teamAnalysis} isLoading={analysisLoading} onClose={() => setModalOpen(false)} onRegenerate={handleRegenerateAnalysis} />}
      <footer className="app-footer"><small>Hecho en Guate 🇬🇹 — Datos: Google Sheets • UI Mejorada</small></footer>
    </div>
  );
}
