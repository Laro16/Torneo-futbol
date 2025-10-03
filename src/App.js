import React, { useState, useEffect } from 'react';

// --- DATOS INICIALES ---
const initialStandingsData = [
    { equipo: "LA-PLEBE", jj: 6, pg: 6, pe: 0, pp: 0, gf: 24, gc: 7, pts: 18 },
    { equipo: "JUVENTUD-SAMALA", jj: 6, pg: 5, pe: 0, pp: 1, gf: 31, gc: 6, pts: 15 },
    // ... (el resto de tus datos iniciales)
];
const initialScorersData = [ { jugador: 'Juan Perez', equipo: 'LA-PLEBE', goles: 9 }, /* ... */ ];
// DEJAMOS EL ARRAY DE NOTICIAS VACÍO PARA PROBAR EL MENSAJE
const initialNewsData = [];

// --- URLs CORREGIDAS ---
// Apunta a la primera hoja (gid=0) que es la de Posiciones
const STANDINGS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=0&single=true&output=csv';

// Usa el link de publicación (no el de edición) con el gid de Goleadores
const SCORERS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=1191349899&single=true&output=csv';

// Este ya estaba bien, lo dejamos como está
const NEWS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfPgrAnVvcoHmUhsIWAw3RksYuqMfwwocIUQpga26AqlRyOcqWVFoit_haKgJ3d2FU9FoU6G2Swoao/pub?gid=747825916&single=true&output=csv';

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
const Navbar = ({ activeView, setActiveView }) => ( <nav className="navbar"> <button onClick={() => setActiveView('standings')} className={activeView === 'standings' ? 'active' : ''}>Posiciones</button> <button onClick={() => setActiveView('scorers')} className={activeView === 'scorers' ? 'active' : ''}>Goleadores</button> <button onClick={() => setActiveView('news')} className={activeView === 'news' ? 'active' : ''}>Noticias</button> </nav> );

const StandingsTable = ({ data, onTeamClick }) => {
    const sortedData = [...data].sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));
    return ( <div className="table-wrap"> <table> <thead> <tr> <th className="col-rank">#</th> <th className="col-team">Equipo</th> <th>JJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>+/-</th> <th className="col-pts">PTS</th> </tr> </thead> <tbody> {sortedData.map((team, index) => { const goalDifference = team.gf - team.gc; return ( <tr key={team.equipo} onClick={() => onTeamClick(team)} style={{cursor: 'pointer'}} title={`Click para ver análisis de ${team.equipo}`}> <td className={`col-rank rank-${index + 1}`}>{index + 1}</td> <td className="col-team">{team.equipo}</td> <td>{team.jj}</td><td>{team.pg}</td><td>{team.pe}</td><td>{team.pp}</td> <td>{team.gf}</td><td>{team.gc}</td> <td className={goalDifference >= 0 ? 'pos-positive' : 'pos-negative'}> {goalDifference > 0 ? `+${goalDifference}` : goalDifference} </td> <td className="col-pts">{team.pts}</td> </tr> ); })} </tbody> </table> </div> );
};

const ScorersTable = ({ data }) => {
    const sortedData = [...data].sort((a, b) => b.goles - a.goles);
    return ( <div className="table-wrap"> <table> <thead> <tr> <th className="col-rank">#</th> <th className="col-team">Jugador</th> <th>Equipo</th> <th className="col-pts">Goles</th> </tr> </thead> <tbody> {sortedData.map((player, index) => ( <tr key={player.jugador}> <td className={`col-rank rank-${index + 1}`}>{index + 1}</td> <td className="col-team">{player.jugador}</td> <td>{player.equipo}</td> <td className="col-pts">{player.goles}</td> </tr> ))} </tbody> </table> </div> );
};

// --- Componente de Noticias MODIFICADO ---
const NewsSection = ({ data }) => {
    // Si no hay datos, muestra el mensaje
    if (!data || data.length === 0) {
        return (
            <div className="news-container" style={{ textAlign: 'center', padding: '40px' }}>
                <p>NO HAY NOTICIAS NUEVAS, VUELVE MÁS TARDE</p>
            </div>
        );
    }

    const sortedData = [...data].sort((a, b) => new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-')));
    
    return (
        <div className="news-container">
            {sortedData.map((item, index) => (
                <div className="news-card" key={index}>
                    <h2>{item.titulo}</h2>
                    <p className="news-date">{item.fecha}</p>
                    <p>{item.contenido}</p>
                </div>
            ))}
        </div>
    );
};

const LoadingSpinner = () => ( <div className="spinner-container"> <div className="spinner"></div> <p>Cargando datos...</p> </div> );

// --- Modal de Análisis MODIFICADO para cerrar correctamente ---
const GeminiAnalysisModal = ({ team, analysis, isLoading, onClose }) => {
    if (!team) return null;
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>&times;</button>
                <h2>Análisis de {team.equipo}</h2>
                <div className="stats-grid">
                    <div><strong>Puntos:</strong> {team.pts}</div>
                    <div><strong>Partidos:</strong> {team.jj}</div>
                    <div><strong>Victorias:</strong> {team.pg}</div>
                    <div><strong>Empates:</strong> {team.pe}</div>
                    <div><strong>Derrotas:</strong> {team.pp}</div>
                    <div><strong>Goles a Favor:</strong> {team.gf}</div>
                    <div><strong>Goles en Contra:</strong> {team.gc}</div>
                    <div><strong>Diferencia:</strong> {team.gf - team.gc > 0 ? `+${team.gf - team.gc}`: team.gf-team.gc}</div>
                </div>
                <div className="analysis-box">
                    <h3>Análisis con IA ✨</h3>
                    {isLoading ? <div className="mini-spinner"></div> : <p>{analysis}</p>}
                </div>
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---
export default function App() {
    const [standingsData, setStandingsData] = useState([]);
    const [scorersData, setScorersData] = useState([]);
    const [newsData, setNewsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('standings');
    
    // State para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamAnalysis, setTeamAnalysis] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    
    useEffect(() => {
        // ... (tu código para cargar datos sigue igual)
        const loadAllData = async () => {
             // Simulación de carga para que veas los cambios
             setLoading(true);
             setStandingsData(initialStandingsData);
             setScorersData(initialScorersData);
             setNewsData(initialNewsData);
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
            // --- Llamada al componente de noticias MODIFICADO ---
            case 'news': return <NewsSection data={newsData} />;
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
            
            {/* El modal solo se muestra si isModalOpen es true */}
            {isModalOpen && <GeminiAnalysisModal 
                team={selectedTeam} 
                analysis={teamAnalysis}
                isLoading={isAnalysisLoading}
                onClose={() => setIsModalOpen(false)} 
            />}
        </>
    );
}
