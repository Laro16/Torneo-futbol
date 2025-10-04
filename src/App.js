import React, { useState, useEffect } from 'react';

// --- DATOS INICIALES (SOLO SE USAN SI FALLA LA CARGA) ---
const initialStandingsData = [ { equipo: "LA-PLEBE", jj: 6, pg: 6, pe: 0, pp: 0, gf: 24, gc: 7, pts: 18 } ];
const initialScorersData = [ { jugador: 'Juan Perez', equipo: 'LA-PLEBE', goles: 9 } ];
const initialNewsData = [];

// --- URLs ---
const STANDINGS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=0&single=true&output=csv';
const SCORERS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1191349899&single=true&output=csv';
const NEWS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=747825916&single=true&output=csv';
// ===== ESTA ES LA URL CORREGIDA PARA LAS LLAVES =====
const BRACKET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1815552549&single=true&output=csv'; // <-- VERIFICA QUE ESTE gid SEA EL DE TU HOJA LLAVES

// --- Gemini API Helper ---
const callGeminiAPI = async (prompt) => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("API key for Gemini is not configured.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.json();
        console.error("API Error:", errorBody);
        throw new Error("Failed to fetch from Gemini API.");
    }
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text;
};

// --- COMPONENTES ---
const Navbar = ({ activeView, setActiveView }) => (
    <nav className="navbar">
        <button onClick={() => setActiveView('standings')} className={activeView === 'standings' ? 'active' : ''}>Posiciones</button>
        <button onClick={() => setActiveView('scorers')} className={activeView === 'scorers' ? 'active' : ''}>Goleadores</button>
        <button onClick={() => setActiveView('news')} className={activeView === 'news' ? 'active' : ''}>Noticias</button>
        <button onClick={() => setActiveView('bracket')} className={activeView === 'bracket' ? 'active' : ''}>Llaves</button>
    </nav>
);

const StandingsTable = ({ data, onTeamClick }) => {
    if (!data || data.length === 0) return <p style={{textAlign: 'center'}}>No hay datos de posiciones disponibles.</p>;
    const sortedData = [...data].sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));
    return ( <div className="table-wrap"> <table> <thead> <tr> <th className="col-rank">#</th> <th className="col-team">Equipo</th> <th>JJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>+/-</th> <th className="col-pts">PTS</th> </tr> </thead> <tbody> {sortedData.map((team, index) => { const goalDifference = team.gf - team.gc; return ( <tr key={team.equipo} onClick={() => onTeamClick(team)} style={{cursor: 'pointer'}} title={`Click para ver análisis de ${team.equipo}`}> <td className={`col-rank rank-${index + 1}`}>{index + 1}</td> <td className="col-team">{team.equipo}</td> <td>{team.jj}</td><td>{team.pg}</td><td>{team.pe}</td><td>{team.pp}</td> <td>{team.gf}</td><td>{team.gc}</td> <td className={goalDifference >= 0 ? 'pos-positive' : 'pos-negative'}> {goalDifference > 0 ? `+${goalDifference}` : goalDifference} </td> <td className="col-pts">{team.pts}</td> </tr> ); })} </tbody> </table> </div> );
};

const ScorersTable = ({ data }) => {
    if (!data || data.length === 0) return <p style={{textAlign: 'center'}}>No hay datos de goleadores disponibles.</p>;
    const sortedData = [...data].sort((a, b) => b.goles - a.goles);
    return ( <div className="table-wrap"> <table> <thead> <tr> <th className="col-rank">#</th> <th className="col-team">Jugador</th> <th>Equipo</th> <th className="col-pts">Goles</th> </tr> </thead> <tbody> {sortedData.map((player, index) => ( <tr key={player.jugador}> <td className={`col-rank rank-${index + 1}`}>{index + 1}</td> <td className="col-team">{player.jugador}</td> <td>{player.equipo}</td> <td className="col-pts">{player.goles}</td> </tr> ))} </tbody> </table> </div> );
};

const NewsSection = ({ data }) => {
    if (!data || data.length === 0) {
        return ( <div className="news-container" style={{ textAlign: 'center', padding: '40px' }}><p>NO HAY NOTICIAS NUEVAS, VUELVE MÁS TARDE</p></div> );
    }
    const sortedData = [...data].sort((a, b) => new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-')));
    return ( <div className="news-container">{sortedData.map((item, index) => ( <div className="news-card" key={index}><h2>{item.titulo}</h2><p className="news-date">{item.fecha}</p><p>{item.contenido}</p></div> ))}</div> );
};

const BracketView = ({ data }) => {
    if (!data || data.length === 0) {
        return <p style={{ textAlign: 'center', padding: '40px' }}>La fase de llaves aún no ha comenzado.</p>;
    }
    const rounds = data.reduce((acc, match) => {
        const round = match.ronda;
        if (!acc[round]) { acc[round] = []; }
        acc[round].push(match);
        return acc;
    }, {});
    const roundOrder = ['Octavos', 'Cuartos', 'Semifinal', 'Final'];
    const orderedRounds = roundOrder.filter(roundName => rounds[roundName]);

    return (
        <div className="bracket-container">
            {orderedRounds.map(roundName => (
                <div className="round" key={roundName}>
                    <h2>{roundName}</h2>
                    <div className="matches">
                        {rounds[roundName].map(match => {
                            const isTeam1Winner = parseInt(match.equipo1_marcador) > parseInt(match.equipo2_marcador);
                            const isTeam2Winner = parseInt(match.equipo2_marcador) > parseInt(match.equipo1_marcador);
                            return (
                                <div className="match" key={match.id}>
                                    <div className={`team ${match.estado === 'Jugado' && isTeam1Winner ? 'winner' : ''}`}>
                                        <span>{match.equipo1_nombre || '??'}</span>
                                        <span>{match.equipo1_marcador}</span>
                                    </div>
                                    <div className={`team ${match.estado === 'Jugado' && isTeam2Winner ? 'winner' : ''}`}>
                                        <span>{match.equipo2_nombre || '??'}</span>
                                        <span>{match.equipo2_marcador}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const LoadingSpinner = () => ( <div className="spinner-container"> <div className="spinner"></div> <p>Cargando datos...</p> </div> );

const GeminiAnalysisModal = ({ team, analysis, isLoading, onClose }) => {
    if (!team) return null;
    return ( <div className="modal-backdrop" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}><button className="close-button" onClick={onClose}>&times;</button><h2>Análisis de {team.equipo}</h2><div className="stats-grid"><div><strong>Puntos:</strong> {team.pts}</div><div><strong>Partidos:</strong> {team.jj}</div><div><strong>Victorias:</strong> {team.pg}</div><div><strong>Empates:</strong> {team.pe}</div><div><strong>Derrotas:</strong> {team.pp}</div><div><strong>Goles a Favor:</strong> {team.gf}</div><div><strong>Goles en Contra:</strong> {team.gc}</div><div><strong>Diferencia:</strong> {team.gf - team.gc > 0 ? `+${team.gf - team.gc}`: team.gf-team.gc}</div></div><div className="analysis-box"><h3>Análisis con IA ✨</h3>{isLoading ? <div className="mini-spinner"></div> : <p>{analysis}</p>}</div></div></div> );
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
    const [standingsData, setStandingsData] = useState([]);
    const [scorersData, setScorersData] = useState([]);
    const [newsData, setNewsData] = useState([]);
    const [bracketData, setBracketData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('standings');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamAnalysis, setTeamAnalysis] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    
    useEffect(() => {
        const parseCSV = (csvText) => {
            if (!csvText) return [];
            const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
            const lines = csvText.trim().split(/\r\n|\n/);
            if (lines.length < 2) return [];
            const headers = lines[0].split(',').map(h => h.trim());
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue;
                const values = [];
                let match;
                while (match = regex.exec(line)) {
                    let value = match[1];
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1).replace(/""/g, '"');
                    }
                    values.push(value.trim());
                }
                if (values.length === headers.length) {
                    const entry = {};
                    headers.forEach((header, index) => {
                        const value = values[index];
                        entry[header] = !isNaN(Number(value)) && value.trim() !== '' ? Number(value) : value;
                    });
                    data.push(entry);
                }
            }
            return data;
        };

        const fetchData = async (url, fallbackData) => {
            try {
                const response = await fetch(url);
                if (!response.ok) return fallbackData;
                const csvText = await response.text();
                const parsedData = parseCSV(csvText);
                return parsedData.length > 0 ? parsedData : fallbackData;
            } catch (e) {
                console.error(`Failed to fetch ${url}, using fallback data.`, e);
                return fallbackData;
            }
        };

        const loadAllData = async () => {
            setLoading(true);
            setError(null);
            const standings = await fetchData(STANDINGS_URL, initialStandingsData);
            const scorers = await fetchData(SCORERS_URL, initialScorersData);
            const news = await fetchData(NEWS_URL, initialNewsData);
            const bracket = await fetchData(BRACKET_URL, []);
            setStandingsData(standings);
            setScorersData(scorers);
            setNewsData(news);
            setBracketData(bracket);
            setLoading(false);
        };

        loadAllData();
    }, []);

    const handleTeamClick = async (team) => {
        setSelectedTeam(team);
        setIsModalOpen(true);
        setIsAnalysisLoading(true);
        setTeamAnalysis('');
        try {
            const prompt = `Eres un analista de fútbol experto y carismático. Proporciona un análisis breve (2-3 frases) sobre el rendimiento del equipo '${team.equipo}'. Sus estadísticas son: ${team.jj} partidos jugados, ${team.pg} victorias, ${team.pe} empates, ${team.pp} derrotas, ${team.gf} goles a favor, y ${team.gc} goles en contra. Destaca sus fortalezas y debilidades de forma sencilla y directa.`;
            const analysisText = await callGeminiAPI(prompt);
            setTeamAnalysis(analysisText || "No se pudo generar el análisis en este momento.");
        } catch (error) {
            console.error(error);
            setTeamAnalysis("Ocurrió un error al generar el análisis. Verifica la configuración de la API Key.");
        } finally {
            setIsAnalysisLoading(false);
        }
    };
    
    const renderContent = () => {
        if (loading) return <LoadingSpinner />;
        if (error) return <p className="error-message">{error}</p>;
        switch (activeView) {
            case 'standings': return <StandingsTable data={standingsData} onTeamClick={handleTeamClick} />;
            case 'scorers': return <ScorersTable data={scorersData} />;
            case 'news': return <NewsSection data={newsData} />;
            case 'bracket': return <BracketView data={bracketData} />;
            default: return <StandingsTable data={standingsData} onTeamClick={handleTeamClick} />;
        }
    };

    return (
        <>
            <div className="container">
                <h1 className="main-title">Liga Local</h1>
                <Navbar activeView={activeView} setActiveView={setActiveView} />
                {renderContent()}
            </div>
            
            {isModalOpen && <GeminiAnalysisModal 
                team={selectedTeam} 
                analysis={teamAnalysis}
                isLoading={isAnalysisLoading}
                onClose={() => setIsModalOpen(false)} 
            />}
        </>
    );
}
