/* --- Variables y Estilos Globales --- */
:root {
  --bg-dark: #0f172a;
  --bg-medium: #1e293b;
  --bg-light: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --accent-blue: #38bdf8;
  --pos-positive: #22c55e;
  --pos-negative: #ef4444;
  --shadow-color: rgba(0, 0, 0, 0.6);
  --glow-color: rgba(56, 189, 248, 0.25);
  --particle-color: rgba(255, 255, 255, 0.1);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--bg-dark);
  color: var(--text-primary);
  overflow-x: hidden;
  position: relative;
}

/* --- Fondo de "Aurora Boreal" Dinámico --- */
body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: radial-gradient(circle at 15% 25%, rgba(56, 189, 248, 0.1), transparent 40%),
                radial-gradient(circle at 75% 85%, rgba(139, 92, 246, 0.1), transparent 40%),
                radial-gradient(circle at 45% 10%, rgba(34, 197, 94, 0.08), transparent 40%),
                linear-gradient(145deg, var(--bg-dark), #0d121c);
    background-size: 200% 200%;
    animation: moveAurora 30s ease-in-out infinite alternate;
    z-index: -2;
}

@keyframes moveAurora {
  from { background-position: 0% 0%; }
  to { background-position: 100% 100%; }
}

/* --- Partículas Flotantes (Adorno) --- */
.container::before, .container::after {
    content: '';
    position: absolute;
    background-color: var(--particle-color);
    border-radius: 50%;
    opacity: 0;
    z-index: -1;
    filter: blur(2px);
}
.container::before { width: 15px; height: 15px; top: 10%; left: 5%; animation: floatParticle 15s infinite ease-in-out; }
.container::after { width: 20px; height: 20px; bottom: 5%; right: 10%; animation: floatParticle 20s infinite ease-in-out reverse; }
body::after { content: ''; position: fixed; width: 10px; height: 10px; background-color: rgba(255, 255, 255, 0.08); border-radius: 50%; top: 20%; right: 20%; animation: floatParticle 18s infinite ease-in-out alternate; z-index: -1; filter: blur(1px); }
body::before { content: ''; position: fixed; width: 12px; height: 12px; background-color: rgba(255, 255, 255, 0.06); border-radius: 50%; bottom: 15%; left: 25%; animation: floatParticle 22s infinite ease-in-out; z-index: -1; filter: blur(1.5px); }

@keyframes floatParticle {
    0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
    25% { opacity: 0.5; }
    50% { transform: translate(50px, -50px) scale(1.1); opacity: 0.8; }
    75% { opacity: 0.5; }
    100% { transform: translate(100px, 0) scale(0.8); opacity: 0; }
}

/* --- Contenedor Principal --- */
.container {
  max-width: 950px;
  margin: 2rem auto;
  padding: 1rem;
  position: relative;
  z-index: 1;
}

.main-title {
  text-align: center;
  font-size: 3rem;
  text-shadow: 0 0 20px var(--glow-color);
  letter-spacing: 1px;
  margin-bottom: 2.5rem;
}

/* --- Navbar (Adaptada para nueva estructura) --- */
.navbar {
  display: flex;
  justify-content: space-between; /* MODIFICADO */
  align-items: center; /* MODIFICADO */
  margin-bottom: 2rem;
  background: rgba(31, 41, 55, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.5rem;
  position: sticky;
  top: 15px;
  z-index: 999;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
}

.nav-left, .nav-right { /* NUEVO */
  display: flex;
  align-items: center;
  gap: 8px;
}

.last-updated { /* NUEVO */
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.8;
  white-space: nowrap;
}

.navbar button {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 10px 18px;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease-out;
  display: flex;
  align-items: center;
  gap: 6px;
}

.navbar button:hover {
  background-color: var(--bg-light);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.navbar button.active {
  background-color: var(--accent-blue);
  color: var(--bg-dark);
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.6);
}

.nav-right button { /* Botón de refrescar */
  padding: 8px;
}

/* --- Controles de Búsqueda y Orden (NUEVO) --- */
.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap; /* Para que se adapte en pantallas pequeñas */
}

.search-box, .sort-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-box input, .sort-box select {
  background-color: var(--bg-medium);
  border: 1px solid var(--bg-light);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.search-box input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.sort-box label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* --- Botones Pequeños (NUEVO) --- */
button.small {
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--bg-light);
  background: var(--bg-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
button.small:hover {
  background: var(--bg-light);
  color: var(--text-primary);
  border-color: var(--accent-blue);
}
button.small.secondary {
  background: transparent;
  border-color: transparent;
}
button.small.secondary:hover {
  background: var(--bg-light);
  border-color: var(--bg-light);
}


/* Estilo de foco para accesibilidad */
:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 3px;
    border-radius: 6px;
}

/* --- Tablas --- */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background-color: var(--bg-medium); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px var(--shadow-color); }
th, td { padding: 14px 18px; text-align: center; border-bottom: 1px solid var(--bg-light); white-space: nowrap; }
th { background-color: var(--bg-light); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }
tr { transition: background-color 0.2s ease-in-out; }
tr[style*="cursor: pointer"]:hover { background-color: #2b3a4a; }
.col-rank { font-weight: 700; }
.col-team { text-align: left; }
.col-pts { font-weight: 700; color: var(--accent-blue); }
.pos-positive { color: var(--pos-positive); }
.pos-negative { color: var(--pos-negative); }
.rank-1, .rank-2, .rank-3 { background-color: rgba(56, 189, 248, 0.08); }

/* Ícono de Copa para el primer lugar */
.rank-1 ~ .col-team::before {
    content: '🏆';
    font-size: 1.2em;
    margin-right: 8px;
    animation: bounceCup 1s infinite alternate;
}
@keyframes bounceCup { from { transform: translateY(0); } to { transform: translateY(-3px); } }

/* --- Modal de Análisis --- */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10, 10, 10, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); }
.modal-content { background: rgba(31, 41, 55, 0.8); padding: 2rem; border-radius: 16px; max-width: 550px; width: 90%; box-shadow: 0 15px 50px var(--shadow-color); border: 1px solid rgba(255, 255, 255, 0.15); position: relative; }
.close-button { position: absolute; top: 15px; right: 20px; background: none; border: none; color: var(--text-secondary); font-size: 32px; cursor: pointer; line-height: 1; transition: color 0.2s, transform 0.2s; }
.close-button:hover { color: var(--accent-blue); transform: rotate(90deg); }
.modal-content h2 { margin-top: 0; color: var(--accent-blue); text-shadow: 0 0 8px rgba(56, 189, 248, 0.4); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1.5rem; }
.stats-grid div strong { color: var(--accent-blue); }
.analysis-box { background: rgba(0,0,0,0.35); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
.analysis-box h3 { margin-top: 0; font-size: 1rem; color: var(--text-primary); }
.analysis-box p { margin-bottom: 0; font-style: italic; color: var(--text-secondary); line-height: 1.6; }
.mini-spinner { width: 24px; height: 24px; border: 3px solid var(--bg-light); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }

/* --- Sección de Noticias --- */
.news-container { display: flex; flex-direction: column; gap: 1rem; }
.news-card { background: var(--bg-medium); padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px var(--shadow-color); border: 1px solid rgba(255,255,255,0.08); transition: transform 0.2s ease-in-out; }
.news-card:hover { transform: translateY(-5px); }
.news-card h2 { margin-top: 0; color: var(--accent-blue); text-shadow: 0 0 5px rgba(56, 189, 248, 0.3); }
.news-date { font-size: 0.9em; color: var(--text-secondary); margin-bottom: 10px; }
.news-card p { line-height: 1.6; }

/* --- Spinner de Carga Principal --- */
.spinner-container { text-align: center; padding: 50px; }
.spinner { width: 50px; height: 50px; border: 5px solid var(--bg-light); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

/* --- Estilos para las Llaves --- */
.bracket-section-background { background: linear-gradient(145deg, #1a202c, #0f172a); padding: 2rem; border-radius: 15px; box-shadow: 0 8px 30px var(--shadow-color); border: 1px solid rgba(255,255,255,0.08); position: relative; overflow: hidden; }
.bracket-container-champions { display: flex; justify-content: flex-start; align-items: center; overflow-x: auto; padding: 1rem; gap: 50px; position: relative; z-index: 1; }
.round-champions { display: flex; flex-direction: column; gap: 50px; min-width: 220px; position: relative; }
.round-champions h2 { text-align: center; margin: 0 0 1rem 0; color: var(--accent-blue); text-transform: uppercase; font-size: 1.2em; text-shadow: 0 0 10px rgba(56, 189, 248, 0.5); }
.matches-champions { display: flex; flex-direction: column; gap: 50px; }
.round-champions:not(:last-child)::after { content: ''; position: absolute; right: -25px; top: 50%; transform: translateY(-50%); width: 2px; height: 30%; background: var(--bg-light); border-radius: 1px; opacity: 0.7; }
.match-champions { background-color: var(--bg-medium); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); overflow: hidden; transition: transform 0.2s ease-in-out; }
.match-champions:hover { transform: translateY(-3px); box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5); }
.team-champions { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; color: var(--text-secondary); }
.team-champions:first-child { border-bottom: 1px solid var(--bg-light); }
.team-name { font-size: 0.9em; }
.team-score { font-size: 1em; font-weight: 700; background-color: var(--bg-light); padding: 4px 10px; border-radius: 6px; }
.team-champions.winner { color: var(--text-primary); font-weight: 700; }
.team-champions.winner .team-name { color: var(--accent-blue); }
.team-champions.winner .team-score { background-color: var(--pos-positive); color: var(--bg-dark); }

/* --- Pie de Página (NUEVO) --- */
.app-footer {
  text-align: center;
  margin-top: 3rem;
  padding: 1rem;
  color: var(--text-secondary);
  opacity: 0.6;
  font-size: 0.8rem;
}

/* --- Media Queries para Móviles --- */
@media (max-width: 768px) {
    body { font-size: 14px; }
    .container { padding: 0.5rem; margin: 1rem auto; }
    .main-title { font-size: 2rem; }
    .navbar { flex-direction: column; gap: 8px; padding: 8px; top: 8px; }
    .controls-row { flex-direction: column; gap: 1rem; align-items: stretch; }
    .search-box, .sort-box { justify-content: space-between; }
    .search-box input { width: 100%; }
    th, td { padding: 10px 8px; font-size: 0.85rem; }
    .modal-content { padding: 1.5rem; }
    .stats-grid { grid-template-columns: 1fr; }
    .bracket-section-background { padding: 1rem 0.5rem; }
    .bracket-container-champions { gap: 30px; }
    .round-champions { min-width: 160px; }
    .round-champions:not(:last-child)::after { right: -14px; }
    .rank-1 ~ .col-team::before { font-size: 1em; }
    .container::before, .container::after, body::after { display: none; }
}
