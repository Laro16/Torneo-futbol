import React, { useState, useEffect } from 'react';

// --- DATOS INICIALES ---
const initialStandingsData = [
  { equipo: "LA-PLEBE", jj: 6, pg: 6, pe: 0, pp: 0, gf: 24, gc: 7, pts: 18 },
  { equipo: "JUVENTUD-SAMALA", jj: 6, pg: 5, pe: 0, pp: 1, gf: 31, gc: 6, pts: 15 },
  { equipo: "FC-STO-DOMINGO", jj: 6, pg: 5, pe: 0, pp: 1, gf: 34, gc: 9, pts: 15 },
  { equipo: "DEP-MOM-FC-BLANCO", jj: 6, pg: 4, pe: 1, pp: 1, gf: 18, gc: 10, pts: 13 },
  { equipo: "FC-PARINOX", jj: 6, pg: 3, pe: 2, pp: 1, gf: 15, gc: 10, pts: 11 },
  { equipo: "TALLER-LA-BENDICION", jj: 6, pg: 3, pe: 2, pp: 1, gf: 14, gc: 10, pts: 11 },
  { equipo: "DEP-LOS-VAGOS", jj: 6, pg: 3, pe: 0, pp: 3, gf: 19, gc: 18, pts: 9 },
  { equipo: "MAQUINA-BALANECA", jj: 6, pg: 2, pe: 1, pp: 3, gf: 13, gc: 14, pts: 7 },
  { equipo: "DEP-SAMALA", jj: 6, pg: 2, pe: 0, pp: 4, gf: 10, gc: 8, pts: 6 },
  { equipo: "ATLETICO-PARINOX", jj: 6, pg: 2, pe: 0, pp: 4, gf: 9, gc: 18, pts: 6 },
  { equipo: "DEP-TAXISTAS", jj: 6, pg: 1, pe: 1, pp: 4, gf: 8, gc: 16, pts: 4 },
  { equipo: "DEP-DIVINO-REDENTOR", jj: 6, pg: 1, pe: 1, pp: 4, gf: 6, gc: 37, pts: 4 },
  { equipo: "GALAXY", jj: 6, pg: 1, pe: 0, pp: 5, gf: 5, gc: 20, pts: 3 },
  { equipo: "DEP-CALLEJON", jj: 6, pg: 0, pe: 0, pp: 6, gf: 6, gc: 33, pts: 0 },
];
const initialScorersData = [ { jugador: 'Juan Perez', equipo: 'LA-PLEBE', goles: 9 }, { jugador: 'Carlos Gonzalez', equipo: 'JUVENTUD-SAMALA', goles: 8 }, { jugador: 'Miguel Hernandez', equipo: 'FC-STO-DOMINGO', goles: 7 }, ];
const initialNewsData = [ { titulo: '¡LA-PLEBE sigue imparable!', fecha: '01/10/2025', contenido: 'El equipo de LA-PLEBE consiguió su sexta victoria consecutiva y se afianza en el liderato de la liga.' }, { titulo: 'Próxima jornada: Duelos clave', fecha: '28/09/2025', contenido: 'La jornada 7 nos trae enfrentamientos directos en la parte alta de la tabla que podrían definir el rumbo del campeonato.' }, ];

// --- URLs de Google Sheets (Publicado como CSV) ---
const STANDINGS_URL = 'https://docs.google.com/spreadsheets/d/1lewQR_Cr0ZtBBJpMs9UGGDr5h8xArjJ448j6ydRLV20/edit?gid=0#gid=0';
const SCORERS_URL = 'https://docs.google.com/spreadsheets/d/1lewQR_Cr0ZtBBJpMs9UGGDr5h8xArjJ448j6ydRLV20/edit?gid=1191349899#gid=1191349899';
const NEWS_URL = 'https://docs.google.com/spreadsheets/d/1lewQR_Cr0ZtBBJpMs9UGGDr5h8xArjJ448j6ydRLV20/edit?gid=747825916#gid=747825916';

// --- Gemini API Helper ---
const callGeminiAPI = async (prompt) => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY; // ¡Más seguro!
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    let response;
    let retries = 3;
    let delay = 1000;

    for (let i = 0; i < retries; i++) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                return result.candidates?.[0]?.content?.parts?.[0]?.text;
            }
        } catch (error) {
            console.error("API call failed:", error);
        }
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
    }
    throw new Error("API request failed after multiple retries.");
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

const NewsSection = ({ data, onGenerateSummary, summary, isSummaryLoading }) => {
    const sortedData = [...data].sort((a, b) => new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-')));
    return ( <div className="news-container"> <div className="summary-generator"> <button onClick={onGenerateSummary} disabled={isSummaryLoading}> {isSummaryLoading ? 'Generando...' : '✨ Generar Resumen de la Jornada'} </button> {summary && <div className="summary-card"><p>{summary}</p></div>} </div> {sortedData.map((item, index) => ( <div className="news-card" key={index}> <h2>{item.titulo}</h2> <p className="news-date">{item.fecha}</p> <p>{item.contenido}</p> </div> ))} </div> );
};

const LoadingSpinner = () => ( <div className="spinner-container"> <div className="spinner"></div> <p>Cargando datos...</p> </div> );

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
    
    // State for Gemini Features
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamAnalysis, setTeamAnalysis] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [journalSummary, setJournalSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    useEffect(() => {
        const parseCSV = (csvText) => {
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            return lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const entry = {};
                headers.forEach((header, index) => {
                    entry[header] = isNaN(Number(values[index])) || values[index] === '' ? values[index] : Number(values[index]);
                });
                return entry;
            });
        };

        const fetchData = async (url, fallbackData) => {
            try {
                // Para desarrollo, puedes comentar el fetch y simplemente retornar fallbackData
                // return fallbackData; 
                const response = await fetch(url);
                if (!response.ok) return fallbackData;
                const csvText = await response.text();
                return parseCSV(csvText);
            } catch (e) {
                console.error(`Failed to fetch ${url}, using fallback data.`, e);
                return fallbackData;
            }
        };

        const loadAllData = async () => {
            setLoading(true);
            setError(null);
            try {
                const standings = await fetchData(STANDINGS_URL, initialStandingsData);
                const scorers = await fetchData(SCORERS_URL, initialScorersData);
                const news = await fetchData(NEWS_URL, initialNewsData);
                setStandingsData(standings);
                setScorersData(scorers);
                setNewsData(news);
            } catch (e) {
                setError("No se pudieron cargar los datos.");
            } finally {
                setLoading(false);
            }
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
            setTeamAnalysis("Ocurrió un error al generar el análisis.");
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const handleGenerateSummary = async () => {
        setIsSummaryLoading(true);
        setJournalSummary('');
        const topTeams = standingsData.slice(0, 5).map(t => `${t.equipo} (${t.pts} pts)`).join(', ');
        try {
            const prompt = `Eres un periodista deportivo para una liga de fútbol local. La tabla de posiciones después de la última jornada tiene en los primeros puestos a: ${topTeams}. Escribe un resumen emocionante y breve (un párrafo de 4-5 frases) sobre la situación actual de la liga. Menciona al líder, alguna sorpresa, y crea expectación para los próximos partidos.`;
            const summaryText = await callGeminiAPI(prompt);
            setJournalSummary(summaryText || "No se pudo generar el resumen en este momento.");
        } catch (error) {
            setJournalSummary("Ocurrió un error al generar el resumen.");
        } finally {
            setIsSummaryLoading(false);
        }
    };
    
    const renderContent = () => {
        if (loading) return <LoadingSpinner />;
        if (error) return <p className="error-message">{error}</p>;
        switch (activeView) {
            case 'standings': return <StandingsTable data={standingsData} onTeamClick={handleTeamClick} />;
            case 'scorers': return <ScorersTable data={scorersData} />;
            case 'news': return <NewsSection data={newsData} onGenerateSummary={handleGenerateSummary} summary={journalSummary} isSummaryLoading={isSummaryLoading}/>;
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
            
            <GeminiAnalysisModal 
                team={selectedTeam} 
                analysis={teamAnalysis}
                isLoading={isAnalysisLoading}
                onClose={() => setIsModalOpen(false)} 
            />
        </>
    );
}
