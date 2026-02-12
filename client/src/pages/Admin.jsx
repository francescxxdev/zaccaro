import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ImageCropper from '../components/ImageCropper';

const emptyPlayer = { name: '', goals: 0, matches: 0, height: '', position: '', description: '', number: 0 };
const emptyNews = { title: '', content: '' };
const emptyInjury = { player_name: '', injury: '', expected_return: '', status: 'Infortunato' };
const emptySlot = () => ({ playerId: null, playerName: '', vote: '', mvp: false });
const emptyLineup = () => Array(7).fill(null).map(emptySlot);
const emptyNextMatch = () => ({
  match_date: '17/02/2026',
  team1_score: '',
  team2_score: '',
  team1_lineup: emptyLineup(),
  team2_lineup: emptyLineup(),
});

export default function Admin() {
  const [tab, setTab] = useState('players');
  const [players, setPlayers] = useState([]);
  const [news, setNews] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [users, setUsers] = useState([]);
  const [nextMatch, setNextMatch] = useState(emptyNextMatch());
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [usersFilter, setUsersFilter] = useState('unverified');
  const [usersError, setUsersError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Player state
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerForm, setPlayerForm] = useState({ ...emptyPlayer });
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  // News state
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [newsForm, setNewsForm] = useState({ ...emptyNews });
  const [showAddNews, setShowAddNews] = useState(false);
  const [newsImageFile, setNewsImageFile] = useState(null);
  const [newsImagePreview, setNewsImagePreview] = useState(null);
  const [newsExistingImage, setNewsExistingImage] = useState(null);
  const [newsRemoveImage, setNewsRemoveImage] = useState(false);
  const [newsCropSrc, setNewsCropSrc] = useState(null);

  // Injury state
  const [editingInjuryId, setEditingInjuryId] = useState(null);
  const [injuryForm, setInjuryForm] = useState({ ...emptyInjury });
  const [showAddInjury, setShowAddInjury] = useState(false);

  // Prossimo match: salvataggio in corso + ref per scroll a form
  const [savingNextMatch, setSavingNextMatch] = useState(false);
  const nextMatchFormRef = useRef(null);

  const [message, setMessage] = useState(null);
  const { authFetch, imageUrl } = useAuth();

  const loadAll = () => {
    Promise.allSettled([
      authFetch('/api/players').then(r => r.json()),
      authFetch('/api/news').then(r => r.json()),
      authFetch('/api/injuries').then(r => r.json()),
      authFetch('/api/next-match').then(r => (r.ok ? r.json() : null)).catch(() => null),
      authFetch('/api/admin/users').then(async (r) => {
        if (!r.ok) {
          try {
            const err = await r.json();
            setUsersError(err?.error || 'Errore caricamento utenti');
          } catch {
            setUsersError('Errore caricamento utenti');
          }
          // fallback per utenti non admin (mostra lista base)
          try {
            const r2 = await authFetch('/api/users');
            if (r2.ok) {
              setUsersError(null);
              return r2.json();
            }
          } catch {
            setUsersError('Errore caricamento utenti');
          }
          return [];
        }
        setUsersError(null);
        return r.json();
      }),
    ])
      .then((results) => {
        const [p, n, i, nm, u] = results;
        if (p.status === 'fulfilled') setPlayers(p.value);
        if (n.status === 'fulfilled') setNews(n.value);
        if (i.status === 'fulfilled') setInjuries(i.value);
        if (nm.status === 'fulfilled' && nm.value && typeof nm.value === 'object') {
          const v = nm.value;
          const t1 = Array.isArray(v.team1_lineup) ? [...v.team1_lineup] : emptyLineup();
          const t2 = Array.isArray(v.team2_lineup) ? [...v.team2_lineup] : emptyLineup();
          while (t1.length < 7) t1.push(emptySlot());
          while (t2.length < 7) t2.push(emptySlot());
          setNextMatch({
            match_date: v.match_date || '17/02/2026',
            team1_score: v.team1_score ?? '',
            team2_score: v.team2_score ?? '',
            team1_lineup: t1.slice(0, 7),
            team2_lineup: t2.slice(0, 7),
          });
        }
        if (u.status === 'fulfilled' && Array.isArray(u.value)) setUsers(u.value);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const flash = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // =================== PLAYERS ===================
  const handlePlayerChange = (e) => {
    const { name, value } = e.target;
    setPlayerForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropDone = (blob) => {
    setCroppedBlob(blob);
    setCroppedPreview(URL.createObjectURL(blob));
    setCropSrc(null);
    setRemoveImage(false);
  };

  const resetPlayer = () => {
    setEditingPlayerId(null); setPlayerForm({ ...emptyPlayer });
    setCroppedBlob(null); setCroppedPreview(null); setExistingImage(null);
    setRemoveImage(false); setCropSrc(null); setShowAddPlayer(false);
  };

  const buildPlayerFD = () => {
    const fd = new FormData();
    Object.entries(playerForm).forEach(([k, v]) => fd.append(k, v));
    if (croppedBlob) fd.append('image', croppedBlob, 'player.jpg');
    if (removeImage) fd.append('removeImage', 'true');
    return fd;
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!playerForm.name.trim()) { flash('Nome obbligatorio', 'error'); return; }
    const res = await authFetch('/api/admin/players', { method: 'POST', body: buildPlayerFD() });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      flash(d.error || 'Errore durante l\'aggiunta del giocatore', 'error');
      return;
    }
    flash('Giocatore aggiunto!'); resetPlayer(); loadAll();
  };

  const startEditPlayer = (p) => {
    setEditingPlayerId(p.id);
    setPlayerForm({ name: p.name, goals: p.goals, matches: p.matches, height: p.height, position: p.position, description: p.description, number: p.number });
    setCroppedBlob(null); setCroppedPreview(null); setExistingImage(p.image || null); setRemoveImage(false);
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const res = await authFetch(`/api/admin/players/${editingPlayerId}`, { method: 'PUT', body: buildPlayerFD() });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      flash(d.error || 'Errore durante l\'aggiornamento del giocatore', 'error');
      return;
    }
    flash('Giocatore aggiornato!'); resetPlayer(); loadAll();
  };

  const handleDeletePlayer = async (id, name) => {
    if (!window.confirm(`Eliminare ${name}?`)) return;
    await authFetch(`/api/admin/players/${id}`, { method: 'DELETE' });
    flash('Giocatore eliminato!'); if (editingPlayerId === id) resetPlayer(); loadAll();
  };

  // =================== NEWS ===================
  const handleNewsChange = (e) => {
    const { name, value } = e.target;
    setNewsForm(prev => ({ ...prev, [name]: value }));
  };

  const resetNews = () => { setEditingNewsId(null); setNewsForm({ ...emptyNews }); setShowAddNews(false); setNewsImageFile(null); setNewsImagePreview(null); setNewsExistingImage(null); setNewsRemoveImage(false); };
  const handleNewsFileSelect = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setNewsCropSrc(ev.target.result);
    reader.readAsDataURL(f);
    e.target.value='';
  };
  const handleNewsCropDone = async (blob) => {
    setNewsImageFile(new File([blob], 'news.jpg', { type: 'image/jpeg' }));
    setNewsImagePreview(URL.createObjectURL(blob));
    setNewsRemoveImage(false);
    setNewsCropSrc(null);
  };
  const buildNewsFD = () => { const fd = new FormData(); Object.entries(newsForm).forEach(([k,v])=>fd.append(k,v)); if (newsImageFile) fd.append('image', newsImageFile); if (newsRemoveImage) fd.append('removeImage','true'); return fd; };

  const handleAddNews = async (e) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.content.trim()) { flash('Titolo e contenuto obbligatori', 'error'); return; }
    const res = await authFetch('/api/admin/news', { method: 'POST', body: buildNewsFD() });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      flash(d.error || 'Errore durante la pubblicazione della news', 'error');
      return;
    }
    flash('News pubblicata!'); resetNews(); loadAll();
  };

  const startEditNews = (n) => { setEditingNewsId(n.id); setNewsForm({ title: n.title, content: n.content }); setNewsImageFile(null); setNewsImagePreview(null); setNewsExistingImage(n.image || null); setNewsRemoveImage(false); };

  const handleUpdateNews = async (e) => {
    e.preventDefault();
    const res = await authFetch(`/api/admin/news/${editingNewsId}`, { method: 'PUT', body: buildNewsFD() });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      flash(d.error || 'Errore durante l\'aggiornamento della news', 'error');
      return;
    }
    flash('News aggiornata!'); resetNews(); loadAll();
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm('Eliminare questa news e tutti i commenti?')) return;
    await authFetch(`/api/admin/news/${id}`, { method: 'DELETE' });
    flash('News eliminata!'); if (editingNewsId === id) resetNews(); loadAll();
  };

  const handleDeleteComment = async (id) => {
    await authFetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    flash('Commento eliminato!'); loadAll();
  };

  // =================== INJURIES ===================
  const handleInjuryChange = (e) => {
    const { name, value } = e.target;
    setInjuryForm(prev => ({ ...prev, [name]: value }));
  };

  const resetInjury = () => { setEditingInjuryId(null); setInjuryForm({ ...emptyInjury }); setShowAddInjury(false); };

  const handleAddInjury = async (e) => {
    e.preventDefault();
    if (!injuryForm.player_name.trim() || !injuryForm.injury.trim()) { flash('Giocatore e infortunio obbligatori', 'error'); return; }
    const res = await authFetch('/api/admin/injuries', { method: 'POST', body: JSON.stringify(injuryForm) });
    if (!res.ok) { const d = await res.json(); flash(d.error, 'error'); return; }
    flash('Infortunio aggiunto!'); resetInjury(); loadAll();
  };

  const startEditInjury = (i) => {
    setEditingInjuryId(i.id);
    setInjuryForm({ player_name: i.player_name, injury: i.injury, expected_return: i.expected_return, status: i.status });
  };

  const handleUpdateInjury = async (e) => {
    e.preventDefault();
    const res = await authFetch(`/api/admin/injuries/${editingInjuryId}`, { method: 'PUT', body: JSON.stringify(injuryForm) });
    if (!res.ok) { const d = await res.json(); flash(d.error, 'error'); return; }
    flash('Infortunio aggiornato!'); resetInjury(); loadAll();
  };

  const handleDeleteInjury = async (id) => {
    if (!window.confirm('Eliminare questo infortunio?')) return;
    await authFetch(`/api/admin/injuries/${id}`, { method: 'DELETE' });
    flash('Infortunio eliminato!'); if (editingInjuryId === id) resetInjury(); loadAll();
  };

  const handleNextMatchChange = (e) => {
    const { name, value } = e.target;
    setNextMatch(prev => ({ ...prev, [name]: value }));
  };

  const handleLineupVote = (team, slotIndex, value) => {
    setNextMatch(prev => {
      const lineup = [...prev[team]];
      lineup[slotIndex] = { ...lineup[slotIndex], vote: value };
      return { ...prev, [team]: lineup };
    });
  };

  const handleLineupPlayerSelect = (team, slotIndex, playerId) => {
    const id = playerId === '' ? null : parseInt(playerId, 10);
    const player = id ? players.find(p => p.id === id) : null;
    setNextMatch(prev => {
      const lineups = { team1_lineup: [...prev.team1_lineup], team2_lineup: [...prev.team2_lineup] };
      const lineup = lineups[team];
      lineup[slotIndex] = { ...lineup[slotIndex], playerId: id, playerName: player ? player.name : '' };
      return { ...prev, [team]: lineup };
    });
  };

  const usedPlayerIds = () => {
    const used = new Set();
    nextMatch.team1_lineup.forEach(s => s.playerId && used.add(s.playerId));
    nextMatch.team2_lineup.forEach(s => s.playerId && used.add(s.playerId));
    return used;
  };

  const handleMvpCheck = (team, slotIndex) => {
    setNextMatch(prev => {
      const t1 = prev.team1_lineup.map((s, i) => ({ ...s, mvp: team === 'team1_lineup' && i === slotIndex }));
      const t2 = prev.team2_lineup.map((s, i) => ({ ...s, mvp: team === 'team2_lineup' && i === slotIndex }));
      return { ...prev, team1_lineup: t1, team2_lineup: t2 };
    });
  };

  const handleSaveNextMatch = async (e) => {
    e.preventDefault();
    if (savingNextMatch) return;
    setSavingNextMatch(true);
    try {
      const payload = {
        match_date: nextMatch.match_date,
        team1_score: nextMatch.team1_score === '' ? null : nextMatch.team1_score,
        team2_score: nextMatch.team2_score === '' ? null : nextMatch.team2_score,
        team1_lineup: nextMatch.team1_lineup,
        team2_lineup: nextMatch.team2_lineup,
      };
      const res = await authFetch('/api/admin/next-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (res.status === 404) {
          flash('Backend non raggiunto (404). Avvia dalla cartella del progetto: npm run dev', 'error');
        } else {
          flash(d.error || 'Errore salvataggio', 'error');
        }
        return;
      }
      const data = await res.json();
      const t1 = (data.team1_lineup || []).slice(0, 7).map(s => ({ ...emptySlot(), ...s }));
      const t2 = (data.team2_lineup || []).slice(0, 7).map(s => ({ ...emptySlot(), ...s }));
      while (t1.length < 7) t1.push(emptySlot());
      while (t2.length < 7) t2.push(emptySlot());
      setNextMatch({ match_date: data.match_date || '17/02/2026', team1_score: data.team1_score ?? '', team2_score: data.team2_score ?? '', team1_lineup: t1, team2_lineup: t2 });
      flash('Prossimo match aggiornato! Vai in Home per vedere le modifiche.');
    } catch (err) {
      flash(err?.message || 'Errore di rete. Controlla che il server sia avviato (npm run dev).', 'error');
    } finally {
      setSavingNextMatch(false);
    }
  };

  const handleResetNextMatch = () => {
    setNextMatch(prev => ({
      ...prev,
      team1_score: '',
      team2_score: '',
      team1_lineup: emptyLineup(),
      team2_lineup: emptyLineup(),
    }));
    flash('Formazioni, voti, MVP e risultato azzerati. Salva per applicare le modifiche.');
  };

  const VOTE_OPTIONS = ['', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7+', '7-', '7.5', '8', '8+', '8-', '8.5', '9', '9.5', '10'];
  const used = usedPlayerIds();

  const currentPreview = croppedPreview || (!removeImage ? existingImage : null);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <h1><span className="title-icon">⚙️</span>Dashboard Amministratore</h1>
          <p className="page-subtitle">Gestisci giocatori, news e infortuni</p>
        </div>

        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
    {cropSrc && <ImageCropper imageSrc={cropSrc} onCropDone={handleCropDone} onCancel={() => setCropSrc(null)} />}
    {newsCropSrc && <ImageCropper imageSrc={newsCropSrc} onCropDone={handleNewsCropDone} onCancel={() => setNewsCropSrc(null)} />}

        <div className="admin-tabs">
          <button className={`admin-tab ${tab === 'players' ? 'active' : ''}`} onClick={() => setTab('players')}>
            👥 Giocatori ({players.length})
          </button>
          <button className={`admin-tab ${tab === 'news' ? 'active' : ''}`} onClick={() => setTab('news')}>
            📰 News ({news.length})
          </button>
          <button className={`admin-tab ${tab === 'injuries' ? 'active' : ''}`} onClick={() => setTab('injuries')}>
            🏥 Infortunati ({injuries.length})
          </button>
          <button className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            ✅ Utenti verificati ({users.filter(u => u.verified).length})
          </button>
          <button className={`admin-tab ${tab === 'match' ? 'active' : ''}`} onClick={() => setTab('match')}>
            ⚽ Prossimo match
          </button>
        </div>

        {/* ============ PLAYERS TAB ============ */}
        {tab === 'players' && (
          <>
            {editingPlayerId && (
              <div className="admin-section">
                <h2>Modifica Giocatore</h2>
                <form onSubmit={handleUpdatePlayer} className="admin-form">
                  {renderPlayerFields()}
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Salva Modifiche</button>
                    <button type="button" className="btn btn-secondary" onClick={resetPlayer}>Annulla</button>
                  </div>
                </form>
              </div>
            )}
            {!editingPlayerId && (
              <div className="admin-section">
                {!showAddPlayer ? (
                  <button className="btn btn-primary btn-add" onClick={() => setShowAddPlayer(true)}>+ Aggiungi Giocatore</button>
                ) : (
                  <>
                    <h2>Nuovo Giocatore</h2>
                    <form onSubmit={handleAddPlayer} className="admin-form">
                      {renderPlayerFields()}
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary">Aggiungi</button>
                        <button type="button" className="btn btn-secondary" onClick={resetPlayer}>Annulla</button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
            <div className="admin-section">
              <h2>Giocatori ({players.length})</h2>
              {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
                <div className="admin-players-list">
                  {players.map(p => (
                    <div key={p.id} className={`admin-player-card ${editingPlayerId === p.id ? 'editing' : ''}`}>
                      <div className="apc-left">
                        <div className="apc-avatar">
                          {p.image ? <img src={imageUrl(p.image)} alt={p.name} /> : <span>{p.name.split(' ').map(n => n[0]).join('')}</span>}
                        </div>
                        <div className="apc-info">
                          <h3>{p.name}</h3>
                          <div className="apc-meta">
                            {p.number > 0 && <span className="apc-tag">#{p.number}</span>}
                            {p.position && <span className="apc-tag">{p.position}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="apc-stats">
                        <div className="apc-stat"><span className="apc-stat-val">{p.goals}</span><span className="apc-stat-lbl">Goal</span></div>
                        <div className="apc-stat"><span className="apc-stat-val">{p.matches}</span><span className="apc-stat-lbl">Partite</span></div>
                      </div>
                      <div className="apc-actions">
                        <button className="btn btn-sm btn-edit" onClick={() => startEditPlayer(p)}>Modifica</button>
                        <button className="btn btn-sm btn-delete" onClick={() => handleDeletePlayer(p.id, p.name)}>Elimina</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ NEWS TAB ============ */}
        {tab === 'news' && (
          <>
            {editingNewsId && (
              <div className="admin-section">
                <h2>Modifica News</h2>
                <form onSubmit={handleUpdateNews} className="admin-form">
                  <div className="form-group"><label>Titolo *</label><input name="title" value={newsForm.title} onChange={handleNewsChange} required /></div>
                  <div className="form-group"><label>Contenuto *</label><textarea name="content" value={newsForm.content} onChange={handleNewsChange} rows="5" required /></div>
                  <div className="form-group form-group-full">
                    <label>Immagine</label>
                    <div className="image-upload-area">
                      {(newsImagePreview || (!newsRemoveImage && newsExistingImage)) ? (
                        <div className="image-preview-box">
                          <img src={newsImagePreview || (newsExistingImage && (newsExistingImage.startsWith('blob:') || newsExistingImage.startsWith('http') ? newsExistingImage : imageUrl(newsExistingImage)))} alt="Preview" className="image-preview" />
                          <div className="image-preview-actions">
                            <label className="btn btn-sm btn-edit image-change-btn">Cambia immagine<input type="file" accept="image/*" onChange={handleNewsFileSelect} hidden /></label>
                            <button type="button" className="btn btn-sm btn-delete" onClick={() => { setNewsImageFile(null); setNewsImagePreview(null); setNewsExistingImage(null); setNewsRemoveImage(true); }}>Rimuovi</button>
                          </div>
                        </div>
                      ) : (
                        <label className="image-dropzone"><span>🖼️</span><p>Clicca per caricare</p><input type="file" accept="image/*" onChange={handleNewsFileSelect} hidden /></label>
                      )}
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Salva</button>
                    <button type="button" className="btn btn-secondary" onClick={resetNews}>Annulla</button>
                  </div>
                </form>
              </div>
            )}
            {!editingNewsId && (
              <div className="admin-section">
                {!showAddNews ? (
                  <button className="btn btn-primary btn-add" onClick={() => setShowAddNews(true)}>+ Pubblica News</button>
                ) : (
                  <>
                    <h2>Nuova News</h2>
                    <form onSubmit={handleAddNews} className="admin-form">
                      <div className="form-group"><label>Titolo *</label><input name="title" value={newsForm.title} onChange={handleNewsChange} placeholder="Titolo della news" required /></div>
                      <div className="form-group"><label>Contenuto *</label><textarea name="content" value={newsForm.content} onChange={handleNewsChange} rows="5" placeholder="Scrivi il contenuto..." required /></div>
                      <div className="form-group form-group-full">
                        <label>Immagine</label>
                        <div className="image-upload-area">
                          {newsImagePreview ? (
                            <div className="image-preview-box">
                              <img src={newsImagePreview} alt="Preview" className="image-preview" />
                              <div className="image-preview-actions">
                                <label className="btn btn-sm btn-edit image-change-btn">Cambia immagine<input type="file" accept="image/*" onChange={handleNewsFileSelect} hidden /></label>
                                <button type="button" className="btn btn-sm btn-delete" onClick={() => { setNewsImageFile(null); setNewsImagePreview(null); }}>Rimuovi</button>
                              </div>
                            </div>
                          ) : (
                            <label className="image-dropzone"><span>🖼️</span><p>Clicca per caricare</p><input type="file" accept="image/*" onChange={handleNewsFileSelect} hidden /></label>
                          )}
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary">Pubblica</button>
                        <button type="button" className="btn btn-secondary" onClick={resetNews}>Annulla</button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
            <div className="admin-section">
              <h2>News ({news.length})</h2>
              <div className="admin-news-list">
                {news.map(n => (
                  <div key={n.id} className={`admin-news-card ${editingNewsId === n.id ? 'editing' : ''}`}>
                    <div className="anc-info">
                      {n.image && <img src={imageUrl(n.image)} alt={n.title} className="news-card-image" />}
                      <h3>{n.title}</h3>
                      <p>{n.content.slice(0, 120)}{n.content.length > 120 ? '...' : ''}</p>
                      <span className="anc-meta">💬 {n.commentCount} commenti</span>
                    </div>
                    <div className="anc-actions">
                      <button className="btn btn-sm btn-edit" onClick={() => startEditNews(n)}>Modifica</button>
                      <button className="btn btn-sm btn-delete" onClick={() => handleDeleteNews(n.id)}>Elimina</button>
                    </div>
                    {n.comments.length > 0 && (
                      <div className="anc-comments">
                        {n.comments.map(c => (
                          <div key={c.id} className="anc-comment">
                            <span className="anc-comment-user">{c.username}:</span>
                            <span className="anc-comment-text">{c.content}</span>
                            <button className="btn-icon-delete" onClick={() => handleDeleteComment(c.id)} title="Elimina commento">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ============ INJURIES TAB ============ */}
        {tab === 'injuries' && (
          <>
            {editingInjuryId && (
              <div className="admin-section">
                <h2>Modifica Infortunio</h2>
                <form onSubmit={handleUpdateInjury} className="admin-form">
                  {renderInjuryFields()}
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Salva</button>
                    <button type="button" className="btn btn-secondary" onClick={resetInjury}>Annulla</button>
                  </div>
                </form>
              </div>
            )}
            {!editingInjuryId && (
              <div className="admin-section">
                {!showAddInjury ? (
                  <button className="btn btn-primary btn-add" onClick={() => setShowAddInjury(true)}>+ Aggiungi Infortunio</button>
                ) : (
                  <>
                    <h2>Nuovo Infortunio</h2>
                    <form onSubmit={handleAddInjury} className="admin-form">
                      {renderInjuryFields()}
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary">Aggiungi</button>
                        <button type="button" className="btn btn-secondary" onClick={resetInjury}>Annulla</button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
            <div className="admin-section">
              <h2>Infortuni ({injuries.length})</h2>
              <div className="admin-injuries-list">
                {injuries.map(inj => (
                  <div key={inj.id} className={`admin-injury-card ${editingInjuryId === inj.id ? 'editing' : ''}`}>
                    <div className="aic-info">
                      <h3>{inj.player_name}</h3>
                      <p>🩹 {inj.injury}</p>
                      {inj.expected_return && <p className="aic-return">📅 {inj.expected_return}</p>}
                    </div>
                    <span className={`injury-status ${inj.status === 'Recuperato' ? 'status-recovered' : inj.status === 'In Dubbio' ? 'status-doubt' : 'status-injured'}`}>{inj.status}</span>
                    <div className="aic-actions">
                      <button className="btn btn-sm btn-edit" onClick={() => startEditInjury(inj)}>Modifica</button>
                      <button className="btn btn-sm btn-delete" onClick={() => handleDeleteInjury(inj.id)}>Elimina</button>
                    </div>
                  </div>
                ))}
                {injuries.length === 0 && <div className="empty-state"><p>Nessun infortunio</p></div>}
              </div>
            </div>
          </>
        )}

        {/* ============ PROSSIMO MATCH TAB ============ */}
        {tab === 'match' && (
          <div className="admin-section next-match-admin">
            <h2>Prossimo match</h2>
            <p className="admin-hint">Puoi salvare anche senza tutti i giocatori e senza voti. I voti si possono aggiungere dopo (anche dopo la partita) modificando dalla Dashboard. Data e risultato sopra; due formazioni fino a 7 slot. MVP (uno solo) opzionale.</p>

            {/* Partita salvata: esce quella appena salvata, modificabile (anche solo data) */}
            {(() => {
              const hasResult = nextMatch.team1_score != null && nextMatch.team2_score != null;
              const mvpSlot = [...(nextMatch.team1_lineup || []), ...(nextMatch.team2_lineup || [])].find(s => s.mvp);
              const hasTeams = nextMatch.team1_lineup?.some(s => s.playerName) || nextMatch.team2_lineup?.some(s => s.playerName);
              return (
                <div className="saved-match-card">
                  <h3 className="saved-match-title">Partita salvata</h3>
                  <p className="saved-match-date">{nextMatch.match_date || '—'}</p>
                  {hasResult && <p className="saved-match-result">{nextMatch.team1_score} — {nextMatch.team2_score}</p>}
                  {hasTeams && (
                    <div className="saved-match-teams">
                      <div className="saved-match-col">
                        <span className="saved-match-col-label">Squadra 1</span>
                        <ul>{(nextMatch.team1_lineup || []).filter(s => s.playerName).map((s, i) => <li key={i}>{s.playerName}{s.vote ? ` (${s.vote})` : ''}{s.mvp ? ' ⭐' : ''}</li>)}</ul>
                      </div>
                      <div className="saved-match-col">
                        <span className="saved-match-col-label">Squadra 2</span>
                        <ul>{(nextMatch.team2_lineup || []).filter(s => s.playerName).map((s, i) => <li key={i}>{s.playerName}{s.vote ? ` (${s.vote})` : ''}{s.mvp ? ' ⭐' : ''}</li>)}</ul>
                      </div>
                    </div>
                  )}
                  {mvpSlot && <p className="saved-match-mvp">MVP: {mvpSlot.playerName}</p>}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => nextMatchFormRef.current?.scrollIntoView({ behavior: 'smooth' })}>Modifica partita</button>
                </div>
              );
            })()}

            <form ref={nextMatchFormRef} onSubmit={(e) => { e.preventDefault(); handleSaveNextMatch(e); }} className="admin-form next-match-form">
              <div className="form-group">
                <label>Data partita (es. 17/02/2026) *</label>
                <input name="match_date" value={nextMatch.match_date} onChange={handleNextMatchChange} placeholder="17/02/2026" />
              </div>
              <div className="next-match-result-row">
                <label>Risultato</label>
                <div className="next-match-result-inputs">
                  <input type="number" min="0" name="team1_score" value={nextMatch.team1_score} onChange={handleNextMatchChange} placeholder="0" className="next-match-score-in" />
                  <span className="next-match-result-sep">—</span>
                  <input type="number" min="0" name="team2_score" value={nextMatch.team2_score} onChange={handleNextMatchChange} placeholder="0" className="next-match-score-in" />
                </div>
              </div>
              <div className="next-match-lineups">
                <div className="next-match-col">
                  <div className="next-match-col-title">Squadra 1</div>
                  {nextMatch.team1_lineup.map((slot, i) => (
                    <div key={`t1-${i}`} className="next-match-slot">
                      <select
                        value={slot.playerId ?? ''}
                        onChange={(e) => handleLineupPlayerSelect('team1_lineup', i, e.target.value)}
                        className="next-match-player-select"
                        title="Giocatore"
                      >
                        <option value="">— Nessuno —</option>
                        {players.filter(p => !used.has(p.id) || nextMatch.team1_lineup[i].playerId === p.id).map(p => (
                          <option key={p.id} value={p.id}>{p.name} #{p.number || ''}</option>
                        ))}
                      </select>
                      <select value={slot.vote} onChange={(e) => handleLineupVote('team1_lineup', i, e.target.value)} className="next-match-vote-select" title="Voto">
                        {VOTE_OPTIONS.map(opt => <option key={opt || 'x'} value={opt}>{opt || '—'}</option>)}
                      </select>
                      <label className="next-match-mvp-wrap">
                        <input type="checkbox" checked={!!slot.mvp} onChange={() => handleMvpCheck('team1_lineup', i)} title="MVP" />
                        <span>MVP</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="next-match-col">
                  <div className="next-match-col-title">Squadra 2</div>
                  {nextMatch.team2_lineup.map((slot, i) => (
                    <div key={`t2-${i}`} className="next-match-slot">
                      <select
                        value={slot.playerId ?? ''}
                        onChange={(e) => handleLineupPlayerSelect('team2_lineup', i, e.target.value)}
                        className="next-match-player-select"
                        title="Giocatore"
                      >
                        <option value="">— Nessuno —</option>
                        {players.filter(p => !used.has(p.id) || nextMatch.team2_lineup[i].playerId === p.id).map(p => (
                          <option key={p.id} value={p.id}>{p.name} #{p.number || ''}</option>
                        ))}
                      </select>
                      <select value={slot.vote} onChange={(e) => handleLineupVote('team2_lineup', i, e.target.value)} className="next-match-vote-select" title="Voto">
                        {VOTE_OPTIONS.map(opt => <option key={opt || 'y'} value={opt}>{opt || '—'}</option>)}
                      </select>
                      <label className="next-match-mvp-wrap">
                        <input type="checkbox" checked={!!slot.mvp} onChange={() => handleMvpCheck('team2_lineup', i)} title="MVP" />
                        <span>MVP</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-primary" disabled={savingNextMatch} onClick={() => handleSaveNextMatch({ preventDefault: () => {} })}>
                  {savingNextMatch ? 'Salvataggio...' : 'Salva Prossimo match'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleResetNextMatch} title="Azzera giocatori, voti, MVP e risultato">
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============ USERS TAB ============ */}
        {tab === 'users' && (
          <div className="admin-section">
            <h2>Utenti</h2>
            <div className="admin-subtabs">
              <button
                className={`admin-subtab ${usersFilter === 'unverified' ? 'active' : ''}`}
                onClick={() => setUsersFilter('unverified')}
              >
                Solo non verificati ({users.filter(u => !u.verified).length})
              </button>
              <button
                className={`admin-subtab ${usersFilter === 'all' ? 'active' : ''}`}
                onClick={() => setUsersFilter('all')}
              >
                Tutti ({users.length})
              </button>
            </div>
            {loading ? (
              <div className="loading-screen"><div className="spinner" /></div>
            ) : usersError ? (
              <div className="empty-state"><p>{usersError}</p></div>
            ) : users.length === 0 ? (
              <div className="empty-state"><p>Nessun utente registrato</p></div>
            ) : (
              <div className="admin-users-list">
                {(usersFilter === 'all' ? users : users.filter(u => !u.verified)).map(u => {
                  const selected = selectedUserId === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`admin-user-card ${selected ? 'selected' : ''}`}
                      onClick={() => setSelectedUserId(selected ? null : u.id)}
                      role="button"
                      aria-label={`Apri opzioni per ${u.username}`}
                    >
                      <div className="auc-left">
                        <div className="auc-avatar">
                          {u.avatar ? <img src={imageUrl(u.avatar)} alt={u.username} /> : <span>{u.username.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div className="auc-info">
                          <h3>
                            {u.username}
                            {u.verified && <span className="verified-badge" title="Verificato" />}
                          </h3>
                          <div className="auc-meta">{u.isAdmin ? 'Admin' : 'Utente'}</div>
                        </div>
                      </div>
                      {selected && (
                        <div className="auc-actions">
                          <label className="btn btn-sm btn-edit image-change-btn">
                            Cambia immagine
                            <input type="file" accept="image/*" onChange={(e) => updateUserAvatar(u.id, e)} hidden />
                          </label>
                          {u.avatar && <button className="btn btn-sm btn-delete" onClick={(e) => { e.stopPropagation(); removeUserAvatar(u.id); }}>Rimuovi</button>}
                          <button
                            className={`btn btn-sm ${u.verified ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={(e) => { e.stopPropagation(); toggleVerified(u); }}
                          >
                            {u.verified ? 'Rimuovi verifica' : 'Verifica'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  function renderPlayerFields() {
    return (
      <>
        <div className="form-grid">
          <div className="form-group"><label>Nome *</label><input name="name" value={playerForm.name} onChange={handlePlayerChange} placeholder="Nome completo" required /></div>
          <div className="form-group"><label>Numero</label><input name="number" type="number" value={playerForm.number} onChange={handlePlayerChange} min="0" /></div>
          <div className="form-group"><label>Posizione</label>
            <select name="position" value={playerForm.position} onChange={handlePlayerChange}>
              <option value="">Seleziona...</option>
              <option value="Portiere">Portiere</option>
              <option value="Difensore">Difensore</option>
              <option value="Centrocampista">Centrocampista</option>
              <option value="Attaccante">Attaccante</option>
            </select>
          </div>
          <div className="form-group"><label>Altezza</label><input name="height" value={playerForm.height} onChange={handlePlayerChange} placeholder="es. 180 cm" /></div>
          <div className="form-group"><label>Goal</label><input name="goals" type="number" value={playerForm.goals} onChange={handlePlayerChange} min="0" /></div>
          <div className="form-group"><label>Partite</label><input name="matches" type="number" value={playerForm.matches} onChange={handlePlayerChange} min="0" /></div>
        </div>
        <div className="form-group form-group-full"><label>Descrizione</label><textarea name="description" value={playerForm.description} onChange={handlePlayerChange} rows="3" placeholder="Descrizione..." /></div>
        <div className="form-group form-group-full">
          <label>Foto giocatore</label>
          <div className="image-upload-area">
            {currentPreview ? (
              <div className="image-preview-box">
                <img src={currentPreview && (currentPreview.startsWith('blob:') || currentPreview.startsWith('http') ? currentPreview : imageUrl(currentPreview))} alt="Preview" className="image-preview-round" />
                <div className="image-preview-actions">
                  <label className="btn btn-sm btn-edit image-change-btn">Cambia foto<input type="file" accept="image/*" onChange={handleFileSelect} hidden /></label>
                  <button type="button" className="btn btn-sm btn-delete" onClick={() => { setCroppedBlob(null); setCroppedPreview(null); setExistingImage(null); setRemoveImage(true); }}>Rimuovi</button>
                </div>
              </div>
            ) : (
              <label className="image-dropzone"><span>📷</span><p>Clicca per caricare</p><input type="file" accept="image/*" onChange={handleFileSelect} hidden /></label>
            )}
          </div>
        </div>
      </>
    );
  }

  function renderInjuryFields() {
    return (
      <div className="form-grid">
        <div className="form-group"><label>Giocatore *</label>
          <select name="player_name" value={injuryForm.player_name} onChange={handleInjuryChange} required>
            <option value="">Seleziona giocatore...</option>
            {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            <option value="__custom">Altro (scrivi sotto)</option>
          </select>
          {injuryForm.player_name === '__custom' && (
            <input name="player_name" value="" onChange={handleInjuryChange} placeholder="Nome giocatore" style={{ marginTop: 8 }} />
          )}
        </div>
        <div className="form-group"><label>Infortunio *</label><input name="injury" value={injuryForm.injury} onChange={handleInjuryChange} placeholder="es. Distorsione caviglia" required /></div>
        <div className="form-group"><label>Rientro previsto</label><input name="expected_return" value={injuryForm.expected_return} onChange={handleInjuryChange} placeholder="es. 15 Marzo 2026" /></div>
        <div className="form-group"><label>Stato</label>
          <select name="status" value={injuryForm.status} onChange={handleInjuryChange}>
            <option value="Infortunato">Infortunato</option>
            <option value="In Dubbio">In Dubbio</option>
            <option value="Recuperato">Recuperato</option>
          </select>
        </div>
      </div>
    );
  }

  async function toggleVerified(u) {
    const body = new URLSearchParams({ verified: (!u.verified).toString() });
    const res = await authFetch(`/api/admin/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      flash(d.error || 'Errore', 'error');
      return;
    }
    flash(!u.verified ? 'Utente verificato!' : 'Verifica rimossa');
    loadAll();
  }

  async function updateUserAvatar(id, e) {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'PUT', body: fd });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      flash(d.error || 'Errore immagine', 'error');
      return;
    }
    flash('Immagine aggiornata!'); loadAll();
  }

  async function removeUserAvatar(id) {
    const body = new URLSearchParams({ removeImage: 'true' });
    const res = await authFetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      flash(d.error || 'Errore rimozione', 'error');
      return;
    }
    flash('Immagine rimossa!'); loadAll();
  }
}
