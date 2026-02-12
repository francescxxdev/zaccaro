import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Home() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    authFetch('/api/players')
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    authFetch('/api/news')
      .then((r) => r.json())
      .then((data) => {
        const now = Date.now();
        const enriched = data.map(n => {
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
          <div className="page-header">
            <h1>
              <span className="title-icon">🏆</span>
              Classifica Marcatori
            </h1>
            <p className="page-subtitle">Zaccaro's World Cup — Stagione 2025/26</p>
          </div>

          {loading ? (
            <div className="loading-screen">
              <div className="spinner" />
              <p>Caricamento classifica...</p>
            </div>
          ) : players.length === 0 ? (
            <div className="empty-state">
              <p>Nessun giocatore presente</p>
            </div>
          ) : (
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
                      <td className="col-rank">
                        {i === 0 ? <span className="medal gold">🥇</span> : i === 1 ? <span className="medal silver">🥈</span> : i === 2 ? <span className="medal bronze">🥉</span> : <span className="rank-num">{i + 1}</span>}
                      </td>
                      <td className="col-name">
                        <Link to={`/giocatori/${p.id}`} className="player-name-link">{p.name}</Link>
                      </td>
                      <td className="col-number">{p.number || '-'}</td>
                      <td className="col-pos">{p.position || '-'}</td>
                      <td className="col-stat">{p.matches}</td>
                      <td className="col-stat col-goals">
                        <span className="goal-badge">{p.goals}</span>
                      </td>
                      <td className="col-stat">
                        {p.matches > 0 ? (p.goals / p.matches).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
