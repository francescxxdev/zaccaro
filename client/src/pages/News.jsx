import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [commentText, setCommentText] = useState({});
  const { authFetch, user, imageUrl } = useAuth();
  const [editOpen, setEditOpen] = useState({});
  const [editText, setEditText] = useState({});
  const [avatarErr, setAvatarErr] = useState({});
  const [formAvatarErr, setFormAvatarErr] = useState(false);

  const loadNews = () => {
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
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadNews(); }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getCommentById = (commentId) => {
    for (const n of news) {
      const found = (n.comments || []).find((c) => Number(c.id) === Number(commentId));
      if (found) return found;
    }
    return null;
  };

  const handleComment = async (newsId) => {
    const text = commentText[newsId];
    if (!text || !text.trim()) return;
    try {
      const res = await authFetch(`/api/news/${newsId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        setCommentText((prev) => ({ ...prev, [newsId]: '' }));
        loadNews();
      }
    } catch { void 0; }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const isAdmin = user?.isAdmin;
      const url = isAdmin ? `/api/admin/comments/${commentId}` : `/api/comments/${commentId}/delete`;
      const res = await authFetch(url, { method: isAdmin ? 'DELETE' : 'POST' });
      if (res.ok) {
        loadNews();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Errore durante l’eliminazione del commento');
      }
    } catch (e) {
      alert(e?.message || 'Errore di rete durante l’eliminazione');
    }
  };

  const handleEditComment = async (commentId) => {
    const original = getCommentById(commentId)?.content || '';
    const candidate = editText[commentId];
    const text = (candidate !== undefined ? candidate : original).trim();
    if (!text) return;
    try {
      const res = await authFetch(`/api/comments/${commentId}/edit`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        setEditOpen((prev) => ({ ...prev, [commentId]: false }));
        loadNews();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Errore durante la modifica del commento');
      }
    } catch (e) {
      alert(e?.message || 'Errore di rete durante la modifica');
    }
  };

  const formatDate = (d) => {
    const date = new Date(d + 'Z');
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const isNew = (n) => n.isNew;

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <h1>
            <span className="title-icon">📰</span>
            News
          </h1>
          <p className="page-subtitle">Ultime notizie dalla Zaccaro World Cup</p>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Caricamento news...</p></div>
        ) : news.length === 0 ? (
          <div className="empty-state"><p>Nessuna news pubblicata</p></div>
        ) : (
          <div className="news-list">
            {news.map((n) => (
              <div key={n.id} className="news-post">
                <div className="news-post-header">
                  <div className="news-author">
                    <img src="/logo.png" alt="ZWC" className="news-author-avatar" />
                    <div>
                      <span className="news-author-name">
                        zaccaroworldcup
                        <span className="verify-badge" aria-label="verificato">
                          <svg viewBox="0 0 24 24" width="14" height="14">
                            <circle cx="12" cy="12" r="12" fill="#3b82f6" />
                            <path d="M9.2 12.8l-1.9-1.9-1.3 1.3 3.2 3.2 7.3-7.3-1.3-1.3-6 6z" fill="#fff" />
                          </svg>
                        </span>
                      </span>
                      <span className="news-date">{formatDate(n.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="news-post-body">
                  {n.image && (
                    <div className="news-post-image-wrap">
                      <img src={imageUrl(n.image)} alt={n.title} className="news-post-image" />
                    </div>
                  )}
                  <h2>
                    {isNew(n) && <span className="new-dot" />}
                    {n.title}
                  </h2>
                  <p>{n.content}</p>
                </div>
                <div className="news-post-footer">
                  <button className="news-comment-toggle" onClick={() => toggleExpand(n.id)}>
                    💬 {n.commentCount} {n.commentCount === 1 ? 'commento' : 'commenti'}
                  </button>
                </div>

                {expandedId === n.id && (
                  <div className="news-comments">
                    {n.comments.length === 0 ? (
                      <p className="no-comments">Nessun commento. Sii il primo!</p>
                    ) : (
                      <div className="comments-list">
                        {n.comments.map((c) => (
                          <div key={c.id} className="comment">
                            <div className="comment-avatar">
                              {(() => {
                                const src = c.avatar ? imageUrl(c.avatar) : '';
                                return (src && !avatarErr[c.id])
                                  ? <img src={src} alt={c.username} onError={() => setAvatarErr((p) => ({ ...p, [c.id]: true }))} />
                                  : c.username.slice(0, 2).toUpperCase();
                              })()}
                            </div>
                            <div className="comment-body">
                              <div className="comment-header">
                                <span className="comment-user">{c.username} {c.verified ? <span className="verified-badge" title="Verificato">✓</span> : null}</span>
                                <span className="comment-date">{formatDate(c.created_at)}</span>
                              </div>
                              {editOpen[c.id] ? (
                                <div className="comment-form" style={{ marginTop: 6 }}>
                                  <input
                                    type="text"
                                    placeholder="Modifica il tuo commento..."
                                    value={editText[c.id] ?? c.content}
                                    onChange={(e) => setEditText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEditComment(c.id)}
                                  />
                                  <button className="btn btn-primary btn-sm" onClick={() => handleEditComment(c.id)}>Salva</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setEditOpen((prev) => ({ ...prev, [c.id]: false }))}>Annulla</button>
                                </div>
                              ) : (
                                <p className="comment-text">{c.deleted ? 'Commento eliminato' : c.content}</p>
                              )}
                              <div className="comment-actions">
                                {user && (
                                  <>
                                    <button className="comment-action-btn" onClick={() => setEditOpen((prev) => ({ ...prev, [c.id]: true }))}>Modifica</button>
                                    <button className="comment-action-btn" onClick={() => handleDeleteComment(c.id)}>Elimina</button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="comment-form">
                      <div className="comment-form-avatar">
                        {(() => {
                          const src = user?.avatar ? imageUrl(user.avatar) : '';
                          return (src && !formAvatarErr)
                            ? <img src={src} alt={user?.username} onError={() => setFormAvatarErr(true)} />
                            : user?.username?.slice(0, 2).toUpperCase();
                        })()}
                      </div>
                      <input
                        type="text"
                        placeholder="Scrivi un commento..."
                        value={commentText[n.id] || ''}
                        onChange={(e) => setCommentText((prev) => ({ ...prev, [n.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(n.id)}
                      />
                      <div className="emoji-bar">
                        {['😀','😂','😍','🔥','⚽','💪','🎉','👏'].map((em) => (
                          <button
                            key={em}
                            type="button"
                            className="emoji-btn"
                            onClick={() => setCommentText((prev) => ({ ...prev, [n.id]: (prev[n.id] || '') + em }))}
                            aria-label={`Inserisci ${em}`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleComment(n.id)}>
                        Invia
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
