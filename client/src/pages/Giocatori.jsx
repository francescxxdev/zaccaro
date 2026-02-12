import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Giocatori() {
  const [players, setPlayers] = useState([]);
  const [ranking, setRanking] = useState({});
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch('/api/players')
      .then((r) => r.json())
      .then((data) => {
        const byGoals = [...data].sort((a, b) => b.goals - a.goals);
        const rankMap = {};
        byGoals.forEach((p, i) => { rankMap[p.id] = i + 1; });
        setRanking(rankMap);
        setPlayers(byGoals);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <h1>
            <span className="title-icon">👥</span>
            Giocatori
          </h1>
          <p className="page-subtitle">Tutti i giocatori della competizione</p>
        </div>

        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
            <p>Caricamento giocatori...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="empty-state">
            <p>Nessun giocatore presente</p>
          </div>
        ) : (
          <div className="players-grid">
            {players.map((p) => (
              <Link to={`/giocatori/${p.id}`} key={p.id} className="player-card">
                <div className="player-card-top">
                  <div className="player-card-avatar">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="player-card-img" />
                    ) : (
                      <span className="avatar-text">{p.name.split(' ').map(n => n[0]).join('')}</span>
                    )}
                  </div>
                </div>
                <div className="player-card-info">
                  <h3>{p.name}</h3>
                  <span className="player-card-pos">{p.position || 'N/D'}</span>
                  <div className="player-card-details">
                    <span className="player-card-detail">Numero di maglia: <strong>{p.number || '-'}</strong></span>
                    <span className="player-card-detail">Posizione classifica marcatori: <strong>{ranking[p.id] || '-'}°</strong></span>
                  </div>
                </div>
                <div className="player-card-stats">
                  <div className="pcs">
                    <span className="pcs-value">{p.goals}</span>
                    <span className="pcs-label">Goal</span>
                  </div>
                  <div className="pcs">
                    <span className="pcs-value">{p.matches}</span>
                    <span className="pcs-label">Partite</span>
                  </div>
                </div>
                <div className="player-card-arrow">→</div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
