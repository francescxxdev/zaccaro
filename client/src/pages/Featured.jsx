import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Featured({ type = 'mvp' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { authFetch, imageUrl } = useAuth();
  const isMvp = type === 'mvp';

  useEffect(() => {
    authFetch(`/api/featured/${type}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type]);

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

  const themeClass = isMvp ? 'featured-mvp' : 'featured-potm';
  const title = isMvp ? 'MVP' : 'POTM';
  const subtitle = isMvp ? 'Miglior giocatore della giornata' : 'Giocatore del mese';
  const emptyMsg = isMvp ? 'Nessun MVP selezionato.' : 'Nessun POTM selezionato.';

  return (
    <div className="app-layout">
      <Navbar />
      <main className={`main-content featured-page ${themeClass}`}>
        <div className="page-header">
          <h1>
            <span className="title-icon">{isMvp ? '⭐' : '🏅'}</span>
            {title}
          </h1>
          <p className="page-subtitle">
            {subtitle}
          </p>
        </div>

        {!data || !data.player_id || !data.player ? (
          <div className="empty-state">
            <div className="empty-icon">{isMvp ? '⭐' : '🏅'}</div>
            <p>{emptyMsg}</p>
          </div>
        ) : (
          <div className="featured-card">
            <div className="featured-image-wrap">
              {data.image ? (
                <img src={imageUrl(data.image)} alt={data.player.name} className="featured-image" />
              ) : (
                <div className="featured-avatar-placeholder">
                  {data.player.name.split(' ').map((n) => n[0]).join('')}
                </div>
              )}
            </div>
            <div className="featured-body">
              {data.title && <h2 className="featured-title">{data.title}</h2>}
              <h3 className="featured-player-name">{data.player.name}</h3>
              <div className="featured-stats">
                <span className="featured-stat">⚽ {data.player.goals ?? 0} goal</span>
                <span className="featured-stat">🟢 {data.player.matches ?? 0} partite</span>
              </div>
              {data.description && (
                <p className="featured-description">{data.description}</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
