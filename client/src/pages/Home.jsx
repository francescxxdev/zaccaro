import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Home() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authFetch } = useAuth();
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [nextMatch, setNextMatch] = useState(null);

  useEffect(() => {
    authFetch('/api/next-match')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setNextMatch(data))
      .catch(() => setNextMatch(null));
  }, []);

  useEffect(() => {
    setError(null);
    authFetch('/api/players')
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Sessione scaduta' : `Errore ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || 'Impossibile caricare i dati. Avvia il server (npm run dev) e ricarica.');
        setPlayers([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    authFetch('/api/news')
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((data) => {
        const now = Date.now();
        const list = Array.isArray(data) ? data : [];
        const enriched = list.map(n => {
          const ts = new Date((n.created_at || '') + 'Z').getTime();
          const isNew = now - ts < 48 * 60 * 60 * 1000;
          return { ...n, isNew };
        });
        setNews(enriched);
        setLoadingNews(false);
      })
      .catch(() => setLoadingNews(false));
  }, []);

  const isNew = (n) => n.isNew;

  return (
    <div className="app-layout">
      <Navbar />
      <div className="home-bg">
        <div className="home-bg-image" />
        <main className="main-content home-content">
          {!loadingNews && news.length > 0 && (
            <Link to="/news" className="home-news-box home-news-popup">
              <div className="home-news-box-header">
                <img src="/logo.png" alt="Zaccaro World Cup" className="home-news-logo" />
                <span className="home-news-title">{news[0].title}</span>
                {isNew(news[0]) && <span className="new-dot" />}
              </div>
              <p className="home-news-desc">
                {news[0].content.length > 160 ? `${news[0].content.slice(0, 160)}…` : news[0].content}
              </p>
              <span className="home-news-cta">Vai alle News →</span>
            </Link>
          )}

          {/* Riquadro Prossimo match: sotto news, sopra classifica */}
          {nextMatch && (
            <div className="next-match-box">
              <h3 className="next-match-title">Prossimo match</h3>
              {(!nextMatch.team1_name && !nextMatch.team2_name) ? (
                <p className="next-match-date-only">{nextMatch.match_date || '17/02/2026'}</p>
              ) : (
                <>
                  <div className="next-match-content">
                    <div className="next-match-team next-match-team-left">
                      <span className="next-match-formation">{nextMatch.team1_formation || '—'}</span>
                      <span className="next-match-name">{nextMatch.team1_name}</span>
                      {(nextMatch.team1_rating !== '' && nextMatch.team1_rating != null) && (
                        <span className="next-match-rating">{nextMatch.team1_rating}</span>
                      )}
                    </div>
                    <div className="next-match-vs">
                      <span className="next-match-score">
                        {nextMatch.team1_score != null && nextMatch.team2_score != null
                          ? `${nextMatch.team1_score} - ${nextMatch.team2_score}`
                          : 'VS'}
                      </span>
                    </div>
                    <div className="next-match-team next-match-team-right">
                      <span className="next-match-formation">{nextMatch.team2_formation || '—'}</span>
                      <span className="next-match-name">{nextMatch.team2_name}</span>
                      {(nextMatch.team2_rating !== '' && nextMatch.team2_rating != null) && (
                        <span className="next-match-rating">{nextMatch.team2_rating}</span>
                      )}
                    </div>
                  </div>
                  {nextMatch.mvp_name && (
                    <p className="next-match-mvp">⭐ MVP: <span className="next-match-mvp-name">{nextMatch.mvp_name}</span></p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="page-header">
            <h1>
              <span className="title-icon">🏆</span>
              Classifica Marcatori
            </h1>
            <p className="page-subtitle">Zaccaro's World Cup — Stagione 2025/26</p>
          </div>

          {error ? (
            <div className="empty-state">
              <p className="error-message">{error}</p>
              <p style={{ marginTop: 12, fontSize: 14, color: 'var(--gray)' }}>
                In locale: avvia <strong>npm run dev</strong> dalla cartella del progetto (così partono backend e frontend). Poi registrati o fai login.
              </p>
            </div>
          ) : loading ? (
            <div className="loading-screen">
              <div className="spinner" />
              <p>Caricamento classifica...</p>
            </div>
          ) : players.length === 0 ? (
            <div className="empty-state">
              <p>Nessun giocatore presente</p>
            </div>
          ) : (
            <div className="table-scroll-wrap">
              <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-rank">#</th>
                    <th className="col-name">Giocatore</th>
                    <th className="col-number">N°</th>
                    <th className="col-pos">Posizione</th>
                    <th className="col-stat">Partite</th>
                    <th className="col-stat col-goals">Goal</th>
                    <th className="col-stat">Media</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} className={i === 0 ? 'row-first' : ''}>
                      <td className="col-rank" data-label="#">
                        {i === 0 ? <span className="medal gold">🥇</span> : i === 1 ? <span className="medal silver">🥈</span> : i === 2 ? <span className="medal bronze">🥉</span> : <span className="rank-num">{i + 1}</span>}
                      </td>
                      <td className="col-name" data-label="Giocatore">
                        <Link to={`/giocatori/${p.id}`} className="player-name-link">{p.name}</Link>
                      </td>
                      <td className="col-number" data-label="N°">{p.number || '-'}</td>
                      <td className="col-pos" data-label="Posizione">{p.position || '-'}</td>
                      <td className="col-stat" data-label="Partite">{p.matches}</td>
                      <td className="col-stat col-goals" data-label="Goal">
                        <span className="goal-badge">{p.goals}</span>
                      </td>
                      <td className="col-stat" data-label="Media">
                        {p.matches > 0 ? (p.goals / p.matches).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">{players.length}</div>
              <div className="stat-label">Giocatori</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{players.filter(p => p.position === 'Attaccante').length}</div>
              <div className="stat-label">Numero Attaccanti</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{players.filter(p => p.position === 'Difensore').length}</div>
              <div className="stat-label">Numero Difensori</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{players.filter(p => p.position === 'Centrocampista').length}</div>
              <div className="stat-label">Numero Centrocampisti</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
