import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function GiocatoreDetail() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const { authFetch, imageUrl } = useAuth();

  useEffect(() => {
    authFetch(`/api/players/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setPlayer(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <div className="loading-screen"><div className="spinner" /><p>Caricamento...</p></div>
        </main>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <div className="empty-state">
            <p>Giocatore non trovato</p>
            <Link to="/giocatori" className="btn btn-primary">Torna ai giocatori</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Link to="/giocatori" className="back-link">← Torna ai giocatori</Link>

        <div className="player-detail">
          <div className="player-detail-header">
            <div className="player-detail-avatar">
              {player.image ? (
                <img src={imageUrl(player.image)} alt={player.name} className="player-detail-img" />
              ) : (
                <span className="avatar-text-lg">{player.name.split(' ').map(n => n[0]).join('')}</span>
              )}
            </div>
            <div className="player-detail-title">
              <h1>{player.name}</h1>
              <div className="player-detail-meta">
                {player.position && <span className="badge badge-pos">{player.position}</span>}
              </div>
              <div className="player-detail-extra">
                <span>Numero di maglia: <strong>{player.number || '-'}</strong></span>
              </div>
            </div>
          </div>

          <div className="player-detail-stats">
            <div className="detail-stat">
              <span className="detail-stat-value">{player.goals}</span>
              <span className="detail-stat-label">Goal</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-value">{player.matches}</span>
              <span className="detail-stat-label">Partite</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-value">{player.matches > 0 ? (player.goals / player.matches).toFixed(2) : '0.00'}</span>
              <span className="detail-stat-label">Media Goal</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-value">{player.height || 'N/D'}</span>
              <span className="detail-stat-label">Altezza</span>
            </div>
          </div>

          {player.description && (
            <div className="player-detail-desc">
              <h3>Descrizione</h3>
              <p>{player.description}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
