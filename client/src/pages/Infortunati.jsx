import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Infortunati() {
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch('/api/injuries')
      .then((r) => r.json())
      .then((data) => { setInjuries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const statusColor = (s) => {
    if (s === 'Recuperato') return 'status-recovered';
    if (s === 'In Dubbio') return 'status-doubt';
    return 'status-injured';
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <h1>
            <span className="title-icon">🏥</span>
            Infortunati
          </h1>
          <p className="page-subtitle">Situazione infortuni dei giocatori</p>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Caricamento...</p></div>
        ) : injuries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>Nessun giocatore infortunato!</p>
          </div>
        ) : (
          <div className="injuries-list">
            {injuries.map((inj) => (
              <div key={inj.id} className="injury-card">
                <div className="injury-status-bar">
                  <span className={`injury-status ${statusColor(inj.status)}`}>{inj.status}</span>
                </div>
                <div className="injury-info">
                  <h3>{inj.player_name}</h3>
                  <p className="injury-type">🩹 {inj.injury}</p>
                  {inj.expected_return && (
                    <p className="injury-return">📅 Rientro previsto: <strong>{inj.expected_return}</strong></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
