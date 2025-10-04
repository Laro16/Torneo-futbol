import React, { useState, useEffect, useMemo } from 'react';

// --- DATOS INICIALES (SOLO SE USAN SI FALLA LA CARGA) ---
const initialStandingsData = [ { equipo: "LA-PLEBE", jj: 6, pg: 6, pe: 0, pp: 0, gf: 24, gc: 7, pts: 18 } ];
const initialScorersData = [ { jugador: 'Juan Perez', equipo: 'LA-PLEBE', goles: 9 } ];
const initialNewsData = [];

// --- URLs ---
const URLS = {
    standings: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=0&single=true&output=csv',
    scorers: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1191349899&single=true&output=csv',
    news: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=747825916&single=true&output=csv',
    bracket: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1728980058&single=true&output=csv',
};

// --- Hook Personalizado para obtener datos de Google Sheets ---
const useGoogleSheetData = () => {
    const [data, setData] = useState({
        standings: [],
        scorers: [],
        news: [],
        bracket: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const parseCSV = (csvText) => {
            if (!csvText) return [];
            const lines = csvText.trim().split(/\r\n|\n/);
            if (lines.length < 2) return [];
            const headers = lines[0].split(',').map(h => h.trim());
            return lines.slice(1).map(line => {
                if (!line) return null;
                // Regex mejorada para manejar comillas correctamente
                const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (values.length !== headers.length) return null;
                const entry = {};
                headers.forEach((header, index) => {
                    let value = values[index].trim();
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1).replace(/""/g, '"');
                    }
                    entry[header] = !isNaN(Number(value)) && value.trim() !== '' ? Number(value) : value;
                });
                return entry;
            }).filter(Boolean); // Filtra entradas nulas
        };

        const fetchData = async (url, fallbackData) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Network response was not ok for ${url}`);
                const csvText = await response.text();
                const parsedData = parseCSV(csvText);
                return parsedData.length > 0 ? parsedData : fallbackData;
            } catch (e) {
                console.error(`Failed to fetch or parse ${url}, using fallback data.`, e);
                return fallbackData;
            }
        };

        const loadAllData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [standings, scorers, news, bracket] = await Promise.all([
                    fetchData(URLS.standings, initialStandingsData),
                    fetchData(URLS.scorers, initialScorersData),
                    fetchData(URLS.news, initialNewsData),
                    fetchData(URLS.bracket, [])
                ]);
                setData({ standings, scorers, news, bracket });
            } catch (e) {
                console.error("Error loading all data", e);
                setError("No se pudieron cargar los datos. Intenta de nuevo más tarde.");
            } finally {
                setLoading(false);
            }
        };

        loadAllData();
    }, []);

    return { ...data, loading, error };
};


// --- Gemini API Helper ---
const callGeminiAPI = async (prompt) => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("API key for Gemini is not configured. Make sure REACT_APP_GEMINI_API_KEY is set.");
        throw new Error("API key for Gemini is not configured.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Gemini API Error Response:", errorBody);
            throw new Error(errorBody.error?.message || "Failed to fetch from Gemini API.");
        }
        
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error; // Re-throw para que el componente que llama lo pueda manejar
    }
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
    const sortedData = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));
    }, [data]);

    if (sortedData.length === 0) return <p style={{textAlign: 'center'}}>No hay datos de posiciones disponibles.</p>;
    
    return ( <div className="table-wrap"> <table> <thead> <tr> <th className="col-rank">#</th> <th className="col-team">Equipo</th> <th>JJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>+/-</th> <th className="col-pts">PTS</th> </tr> </thead> <tbody> {sortedData.map((team, index) => { const goalDifference = team.gf - team.gc; return ( <tr key={team.equipo} onClick={() => onTeamClick(team)} onKeyDown={(e) => e.key === 'Enter' && onTeamClick(team)} tabIndex="0" role="button" title={`Click para ver análisis de ${team.equipo}`}> <td className={`col-rank rank-${index + 1}`}>{index + 1}</td> <td className="col-team">{team.equipo}</td> <td>{team.jj}</td><td>{team.pg}</td><td>{team.pe}</td><td>{team.pp}</td> <td>{team.gf}</td><td>{team.gc}</td> <td className={goalDifference >= 0 ? 'pos-positive' : 'pos-negative'}> {goalDifference > 0 ? `+${goalDifference}` : goalDifference} </td> <td className="col-pts">{team.pts}</td> </tr> ); })} </tbody> </table> </div> );
};

const ScorersTable = ({ data }) => {
    const sortedData = useMemo(() => {
       if (!data) return [];
       return [...data].sort((a, b) => b.goles - a.goles);
    }, [data]);
    
    if (sortedData.length === 0) return <p style={{textAlign: 'center'}}>No hay datos de goleadores disponibles.</p>;
    
    return ( <div className="table-wrap"> <table> <thead> <tr> <th className="col-rank">#</th> <th className="col-team">Jugador</th> <th>Equipo</th> <th className="col-pts">Goles</th> </tr> </thead> <tbody> {sortedData.map((player, index) => ( <tr key={`${player.jugador}-${index}`}> <td className={`col-rank rank-${index + 1}`}>{index + 1}</td> <td className="col-team">{player.jugador}</td> <td>{player.equipo}</td> <td className="col-pts">{player.goles}</td> </tr> ))} </tbody> </table> </div> );
};

const NewsSection = ({ data }) => {
    const sortedData = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => {
            const dateA = new Date(a.fecha.split('/').reverse().join('-'));
            const dateB = new Date(b.fecha.split('/').reverse().join('-'));
            return dateB - dateA;
        });
    }, [data]);

    if (sortedData.length === 0) {
        return <div className="news-container" style={{ textAlign: 'center', padding: '40px' }}><p>NO HAY NOTICIAS NUEVAS, VUELVE MÁS TARDE</p></div>;
    }
    
    return <div className="news-container">{sortedData.map((item, index) => <div className="news-card" key={index}><h2>{item.titulo}</h2><p className="news-date">{item.fecha}</p><p>{item.contenido}</p></div>)}</div>;
};

const BracketView = ({ data }) => {
    const rounds = useMemo(() => {
        if (!data || data.length === 0) return {};
        return data.reduce((acc, match) => {
            const round = match.ronda;
            if (!acc[round]) acc[round] = [];
            acc[round].push(match);
            return acc;
        }, {});
    }, [data]);

    const roundOrder = ['Octavos', 'Cuartos', 'Semifinal', 'Final'];
    const orderedRounds = roundOrder.filter(roundName => rounds[roundName]);

    if (orderedRounds.length === 0) {
        return <div className="bracket-section-background"><p className="empty-state-message">La fase de llaves aún no ha comenzado.</p></div>;
    }
    
    return ( <div className="bracket-section-background"> <div className="bracket-container-champions"> {orderedRounds.map(roundName => ( <div className="round-champions" key={roundName}> <h2>{roundName}</h2> <div className="matches-champions"> {rounds[roundName].map(match => { const isTeam1Winner = match.estado === 'Jugado' && parseInt(match.equipo1_marcador) > parseInt(match.equipo2_marcador); const isTeam2Winner = match.estado === 'Jugado' && parseInt(match.equipo2_marcador) > parseInt(match.equipo1_marcador); return ( <div className="match-champions" key={match.id}> <div className={`team-champions ${isTeam1Winner ? 'winner' : ''}`}> <span className="team-name">{match.equipo1_nombre || 'A definir'}</span> <span className="team-score">{match.equipo1_marcador}</span> </div> <div className={`team-champions ${isTeam2Winner ? 'winner' : ''}`}> <span className="team-name">{match.equipo2_nombre || 'A definir'}</span> <span className="team-score">{match.equipo2_marcador}</span> </div> </div> ); })} </div> </div> ))} </div> </div> );
};

const LoadingSpinner = () => ( <div className="spinner-container"> <div className="spinner"></div> <p>Cargando datos del torneo...</p> </div> );

const GeminiAnalysisModal = ({ team, analysis, isLoading, onClose }) => {
    if (!team) return null;
    return ( <div className="modal-backdrop" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}><button className="close-button" onClick={onClose} aria-label="Cerrar modal">&times;</button><h2>Análisis de {team.equipo}</h2><div className="stats-grid"><div><strong>Puntos:</strong> {team.pts}</div><div><strong>Partidos:</strong> {team.jj}</div><div><strong>Victorias:</strong> {team.pg}</div><div><strong>Empates:</strong> {team.pe}</div><div><strong>Derrotas:</strong> {team.pp}</div><div><strong>Goles a Favor:</strong> {team.gf}</div><div><strong>Goles en Contra:</strong> {team.gc}</div><div><strong>Diferencia:</strong> {team.gf - team.gc > 0 ? `+${team.gf - team.gc}`: team.gf-team.gc}</div></div><div className="analysis-box"><h3>Análisis con IA ✨</h3>{isLoading ? <div className="mini-spinner-container"><div className="mini-spinner"></div></div> : <p>{analysis}</p>}</div></div></div> );
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
    const { standings, scorers, news, bracket, loading, error } = useGoogleSheetData();
    const [activeView, setActiveView] = useState('standings');
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamAnalysis, setTeamAnalysis] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    const handleTeamClick = async (team) => {
        setSelectedTeam(team);
        setIsAnalysisLoading(true);
        setTeamAnalysis('');
        try {
            const prompt = `Eres un analista de fútbol experto y carismático. Proporciona un análisis breve (2-3 frases) sobre el rendimiento del equipo '${team.equipo}'. Sus estadísticas son: ${team.jj} partidos jugados, ${team.pg} victorias, ${team.pe} empates, ${team.pp} derrotas, ${team.gf} goles a favor, y ${team.gc} goles en contra. Destaca sus fortalezas y debilidades de forma sencilla y directa, con un tono emocionante.`;
            const analysisText = await callGeminiAPI(prompt);
            setTeamAnalysis(analysisText || "No se pudo generar el análisis en este momento.");
        } catch (err) {
            setTeamAnalysis("Ocurrió un error al generar el análisis. Verifica la consola para más detalles.");
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const closeModal = () => setSelectedTeam(null);
    
    const renderContent = () => {
        if (loading) return <LoadingSpinner />;
        if (error) return <p className="error-message">{error}</p>;
        switch (activeView) {
            case 'standings': return <StandingsTable data={standings} onTeamClick={handleTeamClick} />;
            case 'scorers': return <ScorersTable data={scorers} />;
            case 'news': return <NewsSection data={news} />;
            case 'bracket': return <BracketView data={bracket} />;
            default: return <StandingsTable data={standings} onTeamClick={handleTeamClick} />;
        }
    };

    return (
        <>
            <div className="container">
                <header>
                    <h1 className="main-title">Torneo "La Gloria del Barrio"</h1>
                </header>
                <Navbar activeView={activeView} setActiveView={setActiveView} />
                <main>
                    {renderContent()}
                </main>
            </div>
            
            {selectedTeam && <GeminiAnalysisModal 
                team={selectedTeam} 
                analysis={teamAnalysis}
                isLoading={isAnalysisLoading}
                onClose={closeModal} 
            />}
        </>
    );
}
