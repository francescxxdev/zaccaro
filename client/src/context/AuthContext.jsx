import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  const API_BASE = import.meta.env.VITE_API_BASE || '';

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          setUser(data.user);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setLoading(false);
        });
    }
  }, [token, API_BASE]);

  const login = async (username, password) => {
    let res;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Risposta non valida dal server (status ${res.status})`);
        }
      }
    } catch (err) {
      throw new Error(err?.message || 'Errore di rete durante il login');
    }
    if (!res.ok) throw new Error(data.error || `Errore login (status ${res.status})`);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (username, password) => {
    let res;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Risposta non valida dal server (status ${res.status})`);
        }
      }
    } catch (err) {
      throw new Error(err?.message || 'Errore di rete durante la registrazione');
    }
    if (!res.ok) throw new Error(data.error || `Errore registrazione (status ${res.status})`);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    const isFormData = options?.body instanceof FormData;
    const headers = { ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const fullUrl = url.startsWith('/api') ? `${API_BASE}${url}` : url;
    const res = await fetch(fullUrl, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error('Sessione scaduta');
    }
    return res;
  };

  const updateProfile = async (payload, avatarBlob) => {
    const fd = new FormData();
    if (payload?.username) fd.append('username', payload.username);
    if (avatarBlob) fd.append('avatar', avatarBlob, 'avatar.jpg');
    const res = await fetch(`${API_BASE}/api/profile`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  /** Restituisce l'URL completo per un path immagine dal backend (avatar, uploads, ecc.) */
  const imageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
    const base = API_BASE.replace(/\/$/, '');
    return base + (path.startsWith('/') ? path : '/' + path);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, authFetch, updateProfile, imageUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
