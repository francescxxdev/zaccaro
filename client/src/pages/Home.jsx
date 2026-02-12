import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Home() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authFetch } = useAuth();
  const location = useLocation();
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const defaultNextMatch = {
    match_date: '17/02/2026',
    team1_score: null,
    team2_score: null,
    team1_lineup: Array(7).fill(null).map(() => ({ playerId: null, playerName: '', vote: '', mvp: false })),
    team2_lineup: Array(7).fill(null).map(() => ({ playerId: null, playerName: '', vote: '', mvp: false })),
  };
  const [nextMatch, setNextMatch] = useState(defaultNextMatch);

  const fetchNextMatch = useCallback(() => {
    authFetch('/api/next-match', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || typeof data !== 'object') return;
        const t1 = (data.team1_lineup || []).slice(0, 7);
        const t2 = (data.team2_lineup || []).slice(0, 7);
        while (t1.length < 7) t1.push({ playerId: null, playerName: '', vote: '', mvp: false });
        while (t2.length < 7) t2.push({ playerId: null, playerName: '', vote: '', mvp: false });
        setNextMatch({
          match_date: data.match_date || '17/02/2026',
          team1_score: data.team1_score,
          team2_score: data.team2_score,
          team1_lineup: t1,
          team2_lineup: t2,
        });
      })
      .catch(() => {});
  }, [authFetch]);

  useEffect(() => { fetchNextMatch(); }, [fetchNextMatch]);

  useEffect(() => {
    if (location.pathname === '/') fetchNextMatch();
  }, [location.pathname, fetchNextMatch]);

  useEffect(() => {
    const onFocus = () => fetchNextMatch();
    window.addEventListener('focus', onFocus);
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchNextMatch(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchNextMatch]);

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

          {/* Riquadro Matchday: titolo Matchday, sotto data; sinistra Squadra 1, destra Squadra 2 (voti aggiungibili dopo) */}
          <div className="next-match-box matchday-box">
            <h3 className="next-match-title">Matchday</h3>
            <p className="next-match-date-only">{nextMatch.match_date || '—'}</p>
            {(() => {
              const hasResult = nextMatch.team1_score != null && nextMatch.team2_score != null;
              const hasPlayers = nextMatch.team1_lineup?.some(s => s.playerName) || nextMatch.team2_lineup?.some(s => s.playerName);
              const mvpSlot = [...(nextMatch.team1_lineup || []), ...(nextMatch.team2_lineup || [])].find(s => s.mvp);
              return (
                <>
                  {hasResult && (
                    <div className="next-match-result-wrap">
                      <p className="next-match-result-home">
                        {nextMatch.team1_score} — {nextMatch.team2_score}
                      </p>
                    </div>
                  )}
                  {hasPlayers && (
                    <div className="next-match-lineups-home">
                      <div className="next-match-col-home">
                        <p className="next-match-col-label">Squadra 1</p>
                        {(nextMatch.team1_lineup || []).map((slot, i) => (
                          slot.playerName ? (
                            <div key={`t1-${i}`} className={`next-match-row-home ${slot.mvp ? 'is-mvp' : ''}`}>
                              <span className="next-match-name-home">{slot.playerName}</span>
                              {slot.vote && <span className="next-match-vote-home">{slot.vote}</span>}
                              {slot.mvp && <span className="next-match-mvp-badge">MVP</span>}
                            </div>
                          ) : null
                        ))}
                      </div>
                      <div className="next-match-col-home">
                        <p className="next-match-col-label">Squadra 2</p>
                        {(nextMatch.team2_lineup || []).map((slot, i) => (
                          slot.playerName ? (
                            <div key={`t2-${i}`} className={`next-match-row-home ${slot.mvp ? 'is-mvp' : ''}`}>
                              <span className="next-match-name-home">{slot.playerName}</span>
                              {slot.vote && <span className="next-match-vote-home">{slot.vote}</span>}
                              {slot.mvp && <span className="next-match-mvp-badge">MVP</span>}
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}
                  {mvpSlot && (
                    <p className="next-match-mvp">⭐ MVP: <span className="next-match-mvp-name">{mvpSlot.playerName}</span></p>
                  )}
                </>
              );
            })()}
          </div>

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
