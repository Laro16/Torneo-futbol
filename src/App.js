// FILE: src/App.js
import React, { useEffect, useState, useRef } from 'react';
import './index.css';

/*
  Proyecto: Liga Local (mejorado)
  - App.js completo con mejoras: manejo robusto de CSV, caché en localStorage, refrescar manual,
    búsqueda/filtrado, ordenamiento, mejoras en UI y accesibilidad, manejo de la API Gemini con errores
    amigables y posibilidad de reintentar analisis.
  - Reemplaza tu App.js actual por este archivo (colócalo en src/)
  - Variables de entorno: REACT_APP_GEMINI_API_KEY (si quieres habilitar la generación de análisis)
*/

// --- DATOS INICIALES (SOLO SE USAN SI FALLA LA CARGA) ---
const initialStandingsData = [{ equipo: 'LA-PLEBE', jj: 6, pg: 6, pe: 0, pp: 0, gf: 24, gc: 7, pts: 18 }];
const initialScorersData = [{ jugador: 'Juan Perez', equipo: 'LA-PLEBE', goles: 9 }];
const initialNewsData = [];

// --- URLs (mantén los tuyos) ---
const STANDINGS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=0&single=true&output=csv';
const SCORERS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1191349899&single=true&output=csv';
const NEWS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=747825916&single=true&output=csv';
const BRACKET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1728980058&single=true&output=csv';

// --- Helpers: CSV parsing, normalización de headers, fetch con timeout y cache ---
const safeNumber = (v) => {
  if (v === null || v === undefined || v === '') return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? v : n;
};

const normalizeHeader = (h) => String(h || '').trim().normalize('NFKD').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').toLowerCase();

// CSV parser that supports quoted fields
const parseCSV = (csvText) => {
  if (!csvText) return [];
  // remove BOM if exists
  csvText = csvText.replace(/\uFEFF/g, '');
  const lines = csvText.split(/\r\n|\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return [];

  const headers = splitCSVLine(lines[0]).map(normalizeHeader);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    // if there are more cells than headers, join the extras into the last column
    if (row.length > headers.length) {
      const extra = row.splice(headers.length - 1).join(',');
      row[headers.length - 1] = extra;
    }
    if (row.length !== headers.length) continue;
    const entry = {};
    headers.forEach((h, idx) => {
      const val = row[idx] === undefined ? '' : row[idx].trim();
      entry[h] = safeNumber(val);
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
      if (inQuotes && line[i + 1] === '"') { // escaped quote
        cur += '"';
        i++; // skip next
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  result.push(cur);
  return result;
}

const fetchWithTimeout = async (url, timeout = 10_000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

const CACHE_PREFIX = 'liga_local_cache_v1_';
const cacheGet = (key, maxAgeMs = 1000 * 60 * 5) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.data;
  } catch (e) {
    return null;
  }
};
const cacheSet = (key, data) => {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data })); } catch (e) { }
};
const cacheClear = (key) => { localStorage.removeItem(CACHE_PREFIX + key); };

// --- Gemini helper (opcional) ---
const callGeminiAPI = async (prompt, signal) => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) throw new Error('API key for Gemini not configured. Set REACT_APP_GEMINI_API_KEY');
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const payload = { content: { prompt } };
  // NOTE: minimal wrapper. If your environment or model differs, adapt payload accordingly.
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requested_output: [{ mime_type: 'text' }], prompt: { text: prompt } }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${body}`);
  }
  const data = await res.json();
  // Try to extract text safely
  const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.output?.[0]?.content?.text || null;
  return candidate;
};

// --- Small UI components inside same file for convenience ---
const IconRefresh = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M21 12a9 9 0 10-9 9v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Navbar = ({ activeView, setActiveView, onRefresh, lastUpdated }) => (
  <nav className="navbar" role="navigation" aria-label="Navegación principal">
    <div className="nav-left">
      <button onClick={() => setActiveView('standings')} className={activeView === 'standings' ? 'active' : ''}>Posiciones</button>
      <button onClick={() => setActiveView('scorers')} className={activeView === 'scorers' ? 'active' : ''}>Goleadores</button>
      <button onClick={() => setActiveView('news')} className={activeView === 'news' ? 'active' : ''}>Noticias</button>
      <button onClick={() => setActiveView('bracket')} className={activeView === 'bracket' ? 'active' : ''}>Llaves</button>
    </div>

    <div className="nav-right">
      <button onClick={onRefresh} title="Refrescar datos" aria-label="Refrescar">
        <IconRefresh />
      </button>
      <div className="last-updated" aria-live="polite">{lastUpdated ? `Actualizado: ${lastUpdated}` : ''}</div>
    </div>
  </nav>
);

const LoadingSpinner = ({ text = 'Cargando datos...' }) => (
  <div className="spinner-container">
    <div className="spinner" aria-hidden></div>
    <p>{text}</p>
  </div>
);

const GeminiAnalysisModal = ({ team, analysis, isLoading, onClose, onRegenerate }) => {
  if (!team) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Cerrar">&times;</button>
        <h2>Análisis de {team.equipo}</h2>
        <div className="stats-grid">
          <div><strong>Puntos:</strong> {team.pts}</div>
          <div><strong>Partidos:</strong> {team.jj}</div>
          <div><strong>Victorias:</strong> {team.pg}</div>
          <div><strong>Empates:</strong> {team.pe}</div>
          <div><strong>Derrotas:</strong> {team.pp}</div>
          <div><strong>Goles a Favor:</strong> {team.gf}</div>
          <div><strong>Goles en Contra:</strong> {team.gc}</div>
          <div><strong>Diferencia:</strong> {team.gf - team.gc > 0 ? `+${team.gf - team.gc}` : team.gf - team.gc}</div>
        </div>
        <div className="analysis-box">
          <h3>Análisis con IA ✨</h3>
          {isLoading ? <div className="mini-spinner"></div> : <p>{analysis}</p>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onRegenerate} className="small">Regenerar</button>
          <button onClick={onClose} className="small secondary">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const StandingsTable = ({ data, onTeamClick, search = '', sortBy, sortDir }) => {
  if (!data || data.length === 0) return <p style={{ textAlign: 'center' }}>No hay datos de posiciones disponibles.</p>;
  const filtered = data.filter(d => d.equipo && d.equipo.toLowerCase().includes(search.trim().toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'pts') return (b.pts || 0) - (a.pts || 0) || ((b.gf - b.gc) - (a.gf - a.gc));
    if (sortBy === 'gf') return (b.gf || 0) - (a.gf || 0);
    if (sortBy === 'gd') return ((b.gf || 0) - (b.gc || 0)) - ((a.gf || 0) - (a.gc || 0));
    // default equipo alphabetical
    const nameA = (a.equipo || '').toLowerCase();
    const nameB = (b.equipo || '').toLowerCase();
    return sortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-rank">#</th>
            <th className="col-team">Equipo</th>
            <th>JJ</th>
            <th>PG</th>
            <th>PE</th>
            <th>PP</th>
            <th>GF</th>
            <th>GC</th>
            <th>+/-</th>
            <th className="col-pts">PTS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, idx) => {
            const gd = (team.gf || 0) - (team.gc || 0);
            return (
              <tr key={team.equipo + idx} onClick={() => onTeamClick(team)} style={{ cursor: 'pointer' }} title={`Click para ver análisis de ${team.equipo}`}>
                <td className={`col-rank rank-${idx + 1}`}>{idx + 1}</td>
                <td className="col-team">{team.equipo}</td>
                <td>{team.jj ?? '-'}</td>
                <td>{team.pg ?? '-'}</td>
                <td>{team.pe ?? '-'}</td>
                <td>{team.pp ?? '-'}</td>
                <td>{team.gf ?? '-'}</td>
                <td>{team.gc ?? '-'}</td>
                <td className={gd >= 0 ? 'pos-positive' : 'pos-negative'}>{gd > 0 ? `+${gd}` : gd}</td>
                <td className="col-pts">{team.pts ?? '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ScorersTable = ({ data, search = '' }) => {
  if (!data || data.length === 0) return <p style={{ textAlign: 'center' }}>No hay datos de goleadores disponibles.</p>;
  const filtered = data.filter(p => (p.jugador || '').toLowerCase().includes(search.toLowerCase()) || (p.equipo || '').toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => (b.goles || 0) - (a.goles || 0));
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-rank">#</th>
            <th className="col-team">Jugador</th>
            <th>Equipo</th>
            <th className="col-pts">Goles</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, idx) => (
            <tr key={p.jugador + idx}>
              <td className={`col-rank rank-${idx + 1}`}>{idx + 1}</td>
              <td className="col-team">{p.jugador}</td>
              <td>{p.equipo}</td>
              <td className="col-pts">{p.goles ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const NewsSection = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="news-container" style={{ textAlign: 'center', padding: 40 }}>
        <p>NO HAY NOTICIAS NUEVAS, VUELVE MÁS TARDE</p>
      </div>
    );
  }
  const sorted = [...data].sort((a, b) => {
    // supports fecha in formats dd/mm/yyyy or ISO
    const parse = (s) => {
      if (!s) return 0;
      const iso = s.includes('/') ? s.split('/').reverse().join('-') : s;
      const t = Date.parse(iso);
      return Number.isNaN(t) ? 0 : t;
    };
    return parse(b.fecha) - parse(a.fecha);
  });
  return (
    <div className="news-container">
      {sorted.map((item, idx) => (
        <article className="news-card" key={idx} aria-labelledby={`news-title-${idx}`}>
          <h2 id={`news-title-${idx}`}>{item.titulo}</h2>
          <p className="news-date">{item.fecha}</p>
          <div>{item.contenido}</div>
        </article>
      ))}
    </div>
  );
};

const BracketView = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bracket-section-background">
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-primary)' }}>La fase de llaves aún no ha comenzado.</p>
      </div>
    );
  }
  const rounds = data.reduce((acc, m, i) => {
    const r = m.ronda || `Ronda ${m.ronda_number || 'X'}`;
    if (!acc[r]) acc[r] = [];
    acc[r].push({ ...m, __id: i });
    return acc;
  }, {});
  const order = Object.keys(rounds);
  return (
    <div className="bracket-section-background">
      <div className="bracket-container-champions">
        {order.map(rn => (
          <div className="round-champions" key={rn}>
            <h2>{rn}</h2>
            <div className="matches-champions">
              {rounds[rn].map(match => {
                const s1 = Number(match.equipo1_marcador || 0);
                const s2 = Number(match.equipo2_marcador || 0);
                const t1win = s1 > s2;
                const t2win = s2 > s1;
                return (
                  <div className="match-wrapper" key={match.__id}>
                    <div className="match-champions">
                      <div className={`team-champions ${match.estado === 'Jugado' && t1win ? 'winner' : ''}`}>
                        <span className="team-name">{match.equipo1_nombre || 'A definir'}</span>
                        <span className="team-score">{match.equipo1_marcador ?? '-'}</span>
                      </div>
                      <div className={`team-champions ${match.estado === 'Jugado' && t2win ? 'winner' : ''}`}>
                        <span className="team-name">{match.equipo2_nombre || 'A definir'}</span>
                        <span className="team-score">{match.equipo2_marcador ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN APP ---
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

  const loadDataset = async (url, fallback, cacheKey) => {
    // try cache first
    const cached = cacheGet(cacheKey, 1000 * 60 * 10); // 10 min
    if (cached) return cached;
    try {
      const res = await fetchWithTimeout(url, 12_000);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const parsed = parseCSV(text);
      if (!parsed || parsed.length === 0) throw new Error('parsedEmpty');
      cacheSet(cacheKey, parsed);
      return parsed;
    } catch (e) {
      console.warn('fetch failed for', url, e);
      return fallback;
    }
  };

  const loadAll = async (force = false) => {
    setLoading(true);
    try {
      if (force) {
        cacheClear('standings'); cacheClear('scorers'); cacheClear('news'); cacheClear('bracket');
      }
      const [s, sc, n, b] = await Promise.all([
        loadDataset(STANDINGS_URL, initialStandingsData, 'standings'),
        loadDataset(SCORERS_URL, initialScorersData, 'scorers'),
        loadDataset(NEWS_URL, initialNewsData, 'news'),
        loadDataset(BRACKET_URL, [], 'bracket'),
      ]);
      setStandingsData(s);
      setScorersData(sc);
      setNewsData(n);
      setBracketData(b);
      const now = new Date();
      setLastUpdated(now.toLocaleString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // auto-refresh cada 10 minutos (opcional)
    const id = setInterval(() => loadAll(false), 10 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => loadAll(true);

  const handleTeamClick = async (team) => {
    setSelectedTeam(team);
    setModalOpen(true);
    setAnalysisLoading(true);
    setTeamAnalysis('');
    // abort previous
    if (analysisControllerRef.current) analysisControllerRef.current.abort();
    const controller = new AbortController();
    analysisControllerRef.current = controller;

    const prompt = `Eres un analista de fútbol breve y directo. Da 2-3 frases sobre el rendimiento del equipo '${team.equipo}'. Estadísticas: ${team.jj} partidos, ${team.pg} victorias, ${team.pe} empates, ${team.pp} derrotas, ${team.gf} goles a favor, ${team.gc} en contra. Menciona fortalezas y una debilidad.`;

    try {
      const text = await callGeminiAPI(prompt, controller.signal);
      setTeamAnalysis(text || 'No se obtuvo resultado del servicio IA.');
    } catch (e) {
      console.error(e);
      setTeamAnalysis(String(e.message).includes('API key') ? 'La clave de API de Gemini no está configurada. Agrega REACT_APP_GEMINI_API_KEY en tus variables de entorno.' : 'Error al generar análisis. Intenta luego.');
    } finally {
      setAnalysisLoading(false);
      analysisControllerRef.current = null;
    }
  };

  const handleRegenerateAnalysis = () => {
    if (!selectedTeam) return;
    handleTeamClick(selectedTeam);
  };

  const renderContent = () => {
    if (loading) return <LoadingSpinner />;

    switch (activeView) {
      case 'standings':
        return (
          <>
            <div className="controls-row">
              <div className="search-box">
                <input placeholder="Buscar equipo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Buscar equipo" />
              </div>
              <div className="sort-box">
                <label>Orden:</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="pts">Puntos</option>
                  <option value="gd">Diferencia</option>
                  <option value="gf">Goles a favor</option>
                  <option value="name">Nombre</option>
                </select>
                <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="small">{sortDir === 'asc' ? 'Asc' : 'Desc'}</button>
              </div>
            </div>
            <StandingsTable data={standingsData} onTeamClick={handleTeamClick} search={searchQuery} sortBy={sortBy} sortDir={sortDir} />
          </>
        );

      case 'scorers':
        return (
          <>
            <div className="controls-row">
              <div className="search-box">
                <input placeholder="Buscar jugador o equipo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Buscar goleador" />
              </div>
            </div>
            <ScorersTable data={scorersData} search={searchQuery} />
          </>
        );

      case 'news':
        return <NewsSection data={newsData} />;

      case 'bracket':
        return <BracketView data={bracketData} />;

      default:
        return <StandingsTable data={standingsData} onTeamClick={handleTeamClick} search={searchQuery} />;
    }
  };

  return (
    <div className="container">
      <h1 className="main-title">Liga Local</h1>
      <Navbar activeView={activeView} setActiveView={setActiveView} onRefresh={handleRefresh} lastUpdated={lastUpdated} />

      {renderContent()}

      {modalOpen && (
        <GeminiAnalysisModal team={selectedTeam} analysis={teamAnalysis} isLoading={analysisLoading} onClose={() => setModalOpen(false)} onRegenerate={handleRegenerateAnalysis} />
      )}

      <footer className="app-footer">
        <small>Powered by tu comunidad — Datos: Google Sheets • UI mejorada</small>
      </footer>
    </div>
  );
}

// End of App.js
