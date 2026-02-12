const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const DATA_DIR = process.env.DATA_DIR || __dirname;
const db = new Database(path.join(DATA_DIR, "data.db"));
const JWT_SECRET = "zaccaro-world-cup-secret-2024-jwt";

const uploadsDir = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `player-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const newsStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `news-${Date.now()}${ext}`);
  },
});
const uploadNews = multer({ storage: newsStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const userStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${Date.now()}${ext}`);
  },
});
const uploadUser = multer({ storage: userStorage, limits: { fileSize: 5 * 1024 * 1024 } });

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    goals INTEGER DEFAULT 0,
    matches INTEGER DEFAULT 0,
    height TEXT DEFAULT '',
    position TEXT DEFAULT '',
    description TEXT DEFAULT '',
    number INTEGER DEFAULT 0,
    image TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS injuries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    player_name TEXT NOT NULL,
    injury TEXT NOT NULL,
    expected_return TEXT DEFAULT '',
    status TEXT DEFAULT 'Infortunato',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS next_match (
    id INTEGER PRIMARY KEY,
    match_date TEXT DEFAULT '17/02/2026',
    team1_name TEXT DEFAULT '',
    team2_name TEXT DEFAULT '',
    team1_score INTEGER DEFAULT NULL,
    team2_score INTEGER DEFAULT NULL,
    team1_rating TEXT DEFAULT '',
    team2_rating TEXT DEFAULT '',
    mvp_name TEXT DEFAULT '',
    team1_formation TEXT DEFAULT '',
    team2_formation TEXT DEFAULT ''
  );
`);
try {
  const hasRow = db.prepare("SELECT 1 FROM next_match WHERE id = 1").get();
  if (!hasRow) db.prepare("INSERT INTO next_match (id, match_date) VALUES (1, '17/02/2026')").run();
} catch (e) { console.error("next_match init:", e); }

try { db.exec("ALTER TABLE next_match ADD COLUMN team1_lineup TEXT DEFAULT '[]'"); } catch {}
try { db.exec("ALTER TABLE next_match ADD COLUMN team2_lineup TEXT DEFAULT '[]'"); } catch {}
try { db.exec("ALTER TABLE players ADD COLUMN image TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE news ADD COLUMN image TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE comments ADD COLUMN avatar TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE comments ADD COLUMN parent_id INTEGER"); } catch {}
try { db.exec("ALTER TABLE comments ADD COLUMN deleted INTEGER DEFAULT 0"); } catch {}

// Ensure a default admin account exists and is the only admin
try {
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "admin";

  // Make sure only the admin user has is_admin = 1
  db.prepare("UPDATE users SET is_admin = CASE WHEN username = ? THEN 1 ELSE 0 END").run(ADMIN_USERNAME);

  // Create admin user if missing
  const admin = db.prepare("SELECT id FROM users WHERE username = ?").get(ADMIN_USERNAME);
  if (!admin) {
    const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)").run(ADMIN_USERNAME, hashed);
    console.log("Default admin user created: admin / admin");
  } else {
    console.log("Default admin user ensured as only admin");
  }
} catch (e) {
  console.error("Errore durante la verifica/creazione dell'admin di default:", e);
}

// Auto-seed: se il database è vuoto (nessun giocatore/news), inserisci dati iniziali
try {
  const playerCount = db.prepare("SELECT COUNT(*) as count FROM players").get().count;
  if (playerCount === 0) {
    const players = [
      { name: "Giacinto Lesce", goals: 5, matches: 8, height: "178 cm", position: "Centrocampista", description: "Giocatore tecnico con grande visione di gioco.", number: 7 },
      { name: "Francesco Russo", goals: 4, matches: 10, height: "182 cm", position: "Attaccante", description: "Leader con ottime capacità di finalizzazione.", number: 9 },
      { name: "Giuseppe Papasso", goals: 6, matches: 9, height: "175 cm", position: "Attaccante", description: "Puro goleador, sempre pericoloso in area.", number: 22 },
      { name: "Luca Argentano", goals: 8, matches: 7, height: "180 cm", position: "Attaccante", description: "Veloce e scattante, pericoloso in contropiede.", number: 14 },
      { name: "Gabriele Guerrieri", goals: 2, matches: 8, height: "177 cm", position: "Centrocampista", description: "Centrocampista di sostegno.", number: 8 },
      { name: "Antonio Graniti", goals: 0, matches: 5, height: "185 cm", position: "Difensore", description: "Difensore centrale solido.", number: 31 },
    ];
    const stmt = db.prepare(
      "INSERT INTO players (name, goals, matches, height, position, description, number) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const p of players) stmt.run(p.name, p.goals, p.matches, p.height, p.position, p.description, p.number);
    console.log("Dati iniziali: giocatori inseriti");
  }
  const newsCount = db.prepare("SELECT COUNT(*) as count FROM news").get().count;
  if (newsCount === 0) {
    db.prepare("INSERT INTO news (title, content) VALUES (?, ?)").run(
      "Benvenuti in Zaccaro's World Cup",
      "La stagione è iniziata! Segui classifica marcatori, giocatori e aggiornamenti qui."
    );
    db.prepare("INSERT INTO news (title, content) VALUES (?, ?)").run(
      "Primo turno disputato",
      "Tutte le squadre sono scese in campo. Resta aggiornato su risultati e protagonisti."
    );
    console.log("Dati iniziali: news inserite");
  }
} catch (e) {
  console.error("Errore auto-seed:", e);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => res.json({ ok: true }));

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.is_admin === 1 },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorizzato" });
  }
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token non valido" });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Accesso negato" });
  }
  next();
}

// AUTH
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Compila tutti i campi" });
  if (username.length < 3) return res.status(400).json({ error: "Username deve avere almeno 3 caratteri" });
  if (password.length < 3) return res.status(400).json({ error: "Password deve avere almeno 3 caratteri" });
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) return res.status(400).json({ error: "Username già in uso" });
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)").run(username, hashed);
  const token = generateToken({ id: result.lastInsertRowid, username, is_admin: 0 });
  res.json({ token, user: { id: result.lastInsertRowid, username, isAdmin: false } });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Compila tutti i campi" });
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Credenziali non valide" });
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.is_admin === 1 } });
});

// Compat per vecchie pagine EJS
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send("Compila tutti i campi");
  if (username.length < 3) return res.status(400).send("Username deve avere almeno 3 caratteri");
  if (password.length < 3) return res.status(400).send("Password deve avere almeno 3 caratteri");
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) return res.status(400).send("Username già in uso");
  const hashed = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)").run(username, hashed);
  res.redirect("/login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send("Compila tutti i campi");
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).send("Credenziali non valide");
  // Per pagine EJS non gestiamo JWT; reindirizziamo alla home EJS
  res.redirect("/");
});

app.get("/api/me", authMiddleware, (req, res) => {
  const u = db.prepare("SELECT id, username, is_admin, avatar FROM users WHERE id = ?").get(req.user.id);
  if (!u) return res.status(404).json({ error: "Utente non trovato" });
  res.json({ user: { id: u.id, username: u.username, isAdmin: u.is_admin === 1, avatar: u.avatar || "" } });
});

app.get("/api/profile", authMiddleware, (req, res) => {
  const u = db.prepare("SELECT id, username, is_admin, avatar FROM users WHERE id = ?").get(req.user.id);
  if (!u) return res.status(404).json({ error: "Utente non trovato" });
  res.json({ user: { id: u.id, username: u.username, isAdmin: u.is_admin === 1, avatar: u.avatar || "" } });
});

app.put("/api/profile", authMiddleware, uploadUser.single("avatar"), (req, res) => {
  const { username, removeImage } = req.body;
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!existing) return res.status(404).json({ error: "Utente non trovato" });
  if (username && username.trim().length < 3) return res.status(400).json({ error: "Username deve avere almeno 3 caratteri" });
  let avatar = existing.avatar || "";
  if (req.file) {
    if (existing.avatar) { const p = path.join(__dirname, existing.avatar); if (fs.existsSync(p)) fs.unlinkSync(p); }
    avatar = `/uploads/${req.file.filename}`;
  }
  if (removeImage === "true") {
    if (existing.avatar) { const p = path.join(__dirname, existing.avatar); if (fs.existsSync(p)) fs.unlinkSync(p); }
    avatar = "";
  }
  const newUsername = username && username.trim() ? username.trim() : existing.username;
  db.prepare("UPDATE users SET username=?, avatar=? WHERE id=?").run(newUsername, avatar, req.user.id);
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const token = generateToken(updated);
  res.json({ token, user: { id: updated.id, username: updated.username, isAdmin: updated.is_admin === 1, avatar: updated.avatar || "" } });
});

// PLAYERS
app.get("/api/players", authMiddleware, (req, res) => {
  res.json(db.prepare("SELECT * FROM players ORDER BY goals DESC").all());
});

app.get("/api/players/:id", authMiddleware, (req, res) => {
  const player = db.prepare("SELECT * FROM players WHERE id = ?").get(req.params.id);
  if (!player) return res.status(404).json({ error: "Giocatore non trovato" });
  res.json(player);
});

app.post("/api/admin/players", authMiddleware, adminMiddleware, upload.single("image"), (req, res) => {
  const { name, goals, matches, height, position, description, number } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Il nome è obbligatorio" });
  const image = req.file ? `/uploads/${req.file.filename}` : "";
  const result = db.prepare(
    "INSERT INTO players (name, goals, matches, height, position, description, number, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(name.trim(), parseInt(goals) || 0, parseInt(matches) || 0, height || "", position || "", description || "", parseInt(number) || 0, image);
  res.json(db.prepare("SELECT * FROM players WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/admin/players/:id", authMiddleware, adminMiddleware, upload.single("image"), (req, res) => {
  const { name, goals, matches, height, position, description, number } = req.body;
  const existing = db.prepare("SELECT * FROM players WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Giocatore non trovato" });
  let image = existing.image || "";
  if (req.file) {
    if (existing.image) { const p = path.join(__dirname, existing.image); if (fs.existsSync(p)) fs.unlinkSync(p); }
    image = `/uploads/${req.file.filename}`;
  }
  if (req.body.removeImage === "true") {
    if (existing.image) { const p = path.join(__dirname, existing.image); if (fs.existsSync(p)) fs.unlinkSync(p); }
    image = "";
  }
  db.prepare("UPDATE players SET name=?, goals=?, matches=?, height=?, position=?, description=?, number=?, image=? WHERE id=?")
    .run(name.trim(), parseInt(goals) || 0, parseInt(matches) || 0, height || "", position || "", description || "", parseInt(number) || 0, image, req.params.id);
  res.json(db.prepare("SELECT * FROM players WHERE id = ?").get(req.params.id));
});

app.delete("/api/admin/players/:id", authMiddleware, adminMiddleware, (req, res) => {
  const existing = db.prepare("SELECT * FROM players WHERE id = ?").get(req.params.id);
  if (existing && existing.image) { const p = path.join(__dirname, existing.image); if (fs.existsSync(p)) fs.unlinkSync(p); }
  db.prepare("DELETE FROM players WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// NEWS
app.get("/api/news", authMiddleware, (req, res) => {
  const news = db.prepare("SELECT * FROM news ORDER BY created_at DESC").all();
  const result = news.map((n) => {
    const all = db.prepare(`
      SELECT c.*, COALESCE(NULLIF(c.avatar, ''), u.avatar, '') AS avatar, COALESCE(u.verified, 0) AS verified
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.news_id = ?
      ORDER BY c.created_at ASC
    `).all(n.id);
    const parents = all.filter((c) => !c.parent_id);
    const comments = parents.map((p) => ({ ...p, replies: all.filter((c) => c.parent_id === p.id) }));
    const count = all.length;
    return { ...n, comments, commentCount: count };
  });
  res.json(result);
});

app.get("/api/news/:id", authMiddleware, (req, res) => {
  const n = db.prepare("SELECT * FROM news WHERE id = ?").get(req.params.id);
  if (!n) return res.status(404).json({ error: "News non trovata" });
  const comments = db.prepare(`
    SELECT c.*, COALESCE(NULLIF(c.avatar, ''), u.avatar, '') AS avatar, COALESCE(u.verified, 0) AS verified
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.news_id = ?
    ORDER BY c.created_at ASC
  `).all(n.id);
  res.json({ ...n, comments });
});

// Helper: parse lineup JSON (7 slot: { playerId, playerName, vote, mvp })
function parseLineup(str) {
  if (!str) return Array(7).fill(null).map(() => ({ playerId: null, playerName: "", vote: "", mvp: false }));
  try {
    const arr = JSON.parse(str);
    const out = Array(7).fill(null).map((_, i) => ({
      playerId: arr[i]?.playerId ?? null,
      playerName: arr[i]?.playerName ?? "",
      vote: arr[i]?.vote ?? "",
      mvp: !!(arr[i]?.mvp),
    }));
    return out;
  } catch {
    return Array(7).fill(null).map(() => ({ playerId: null, playerName: "", vote: "", mvp: false }));
  }
}

// NEXT MATCH: dati letti in Home (formazioni dinamiche). La partita non viene mai eliminata, solo aggiornata.
app.get("/api/next-match", authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM next_match WHERE id = 1").get();
  if (!row) {
    return res.json({
      match_date: "17/02/2026",
      team1_score: null,
      team2_score: null,
      team1_lineup: parseLineup(null),
      team2_lineup: parseLineup(null),
    });
  }
  res.json({
    match_date: row.match_date || "17/02/2026",
    team1_score: row.team1_score,
    team2_score: row.team2_score,
    team1_lineup: parseLineup(row.team1_lineup),
    team2_lineup: parseLineup(row.team2_lineup),
  });
});

// Salva/aggiorna prossimo match. Non si elimina mai la partita: solo INSERT (prima volta) o UPDATE.
// Gestore usato sia per PUT che per POST (alcuni proxy/ambienti possono bloccare PUT).
function saveNextMatchHandler(req, res) {
  const { match_date, team1_score, team2_score, team1_lineup, team2_lineup } = req.body || {};
  const t1 = Array.isArray(team1_lineup) ? JSON.stringify(team1_lineup.slice(0, 7)) : (team1_lineup || "[]");
  const t2 = Array.isArray(team2_lineup) ? JSON.stringify(team2_lineup.slice(0, 7)) : (team2_lineup || "[]");
  const existing = db.prepare("SELECT id FROM next_match WHERE id = 1").get();
  if (!existing) {
    db.prepare("INSERT INTO next_match (id, match_date, team1_score, team2_score, team1_lineup, team2_lineup) VALUES (1, ?, ?, ?, ?, ?)").run(
      match_date || "17/02/2026", team1_score === "" || team1_score == null ? null : parseInt(team1_score), team2_score === "" || team2_score == null ? null : parseInt(team2_score), t1, t2
    );
  } else {
    db.prepare("UPDATE next_match SET match_date=?, team1_score=?, team2_score=?, team1_lineup=?, team2_lineup=? WHERE id=1").run(
      match_date || "17/02/2026", team1_score === "" || team1_score == null ? null : parseInt(team1_score), team2_score === "" || team2_score == null ? null : parseInt(team2_score), t1, t2
    );
  }
  const row = db.prepare("SELECT * FROM next_match WHERE id = 1").get();
  res.json({
    match_date: row.match_date || "17/02/2026",
    team1_score: row.team1_score,
    team2_score: row.team2_score,
    team1_lineup: parseLineup(row.team1_lineup),
    team2_lineup: parseLineup(row.team2_lineup),
  });
}
app.put("/api/admin/next-match", authMiddleware, adminMiddleware, saveNextMatchHandler);
app.post("/api/admin/next-match", authMiddleware, adminMiddleware, saveNextMatchHandler);

// Admin users
app.get("/api/admin/users", authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare("SELECT id, username, is_admin, avatar, COALESCE(verified,0) AS verified, created_at FROM users ORDER BY created_at DESC").all();
  res.json(users.map(u => ({ id: u.id, username: u.username, isAdmin: u.is_admin === 1, avatar: u.avatar || "", verified: u.verified === 1, created_at: u.created_at })));
});

// Fallback: elenco utenti per qualsiasi utente autenticato (senza ruoli o azioni)
app.get("/api/users", authMiddleware, (req, res) => {
  const users = db.prepare("SELECT id, username, COALESCE(verified,0) AS verified, avatar, created_at FROM users ORDER BY created_at DESC").all();
  res.json(users.map(u => ({ id: u.id, username: u.username, verified: u.verified === 1, avatar: u.avatar || "", created_at: u.created_at })));
});
app.put("/api/admin/users/:id", authMiddleware, adminMiddleware, uploadUser.single("avatar"), (req, res) => {
  const { username, verified, removeImage } = req.body;
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Utente non trovato" });
  let avatar = existing.avatar || "";
  if (req.file) {
    if (existing.avatar) { const p = path.join(__dirname, existing.avatar); if (fs.existsSync(p)) fs.unlinkSync(p); }
    avatar = `/uploads/${req.file.filename}`;
  }
  if (removeImage === "true") {
    if (existing.avatar) { const p = path.join(__dirname, existing.avatar); if (fs.existsSync(p)) fs.unlinkSync(p); }
    avatar = "";
  }
  const newUsername = username && username.trim() ? username.trim() : existing.username;
  const newVerified = verified === "true" || verified === true ? 1 : (verified === "false" ? 0 : existing.verified || 0);
  db.prepare("UPDATE users SET username=?, avatar=?, verified=? WHERE id=?").run(newUsername, avatar, newVerified, req.params.id);
  const updated = db.prepare("SELECT id, username, is_admin, avatar, COALESCE(verified,0) AS verified, created_at FROM users WHERE id = ?").get(req.params.id);
  res.json({ id: updated.id, username: updated.username, isAdmin: updated.is_admin === 1, avatar: updated.avatar || "", verified: updated.verified === 1, created_at: updated.created_at });
});

app.post("/api/admin/news", authMiddleware, adminMiddleware, uploadNews.single("image"), (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Titolo e contenuto obbligatori" });
  const image = req.file ? `/uploads/${req.file.filename}` : "";
  const result = db.prepare("INSERT INTO news (title, content, image) VALUES (?, ?, ?)").run(title.trim(), content.trim(), image);
  res.json(db.prepare("SELECT * FROM news WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/admin/news/:id", authMiddleware, adminMiddleware, uploadNews.single("image"), (req, res) => {
  const { title, content } = req.body;
  const existing = db.prepare("SELECT * FROM news WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "News non trovata" });
  let image = existing.image || "";
  if (req.file) {
    if (existing.image) { const p = path.join(__dirname, existing.image); if (fs.existsSync(p)) fs.unlinkSync(p); }
    image = `/uploads/${req.file.filename}`;
  }
  if (req.body.removeImage === "true") {
    if (existing.image) { const p = path.join(__dirname, existing.image); if (fs.existsSync(p)) fs.unlinkSync(p); }
    image = "";
  }
  db.prepare("UPDATE news SET title=?, content=?, image=? WHERE id=?").run(title.trim(), content.trim(), image, req.params.id);
  res.json(db.prepare("SELECT * FROM news WHERE id = ?").get(req.params.id));
});

app.delete("/api/admin/news/:id", authMiddleware, adminMiddleware, (req, res) => {
  db.prepare("DELETE FROM comments WHERE news_id = ?").run(req.params.id);
  db.prepare("DELETE FROM news WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// COMMENTS (any authenticated user)
app.post("/api/news/:id/comments", authMiddleware, (req, res) => {
  const { content, parent_id } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "Commento vuoto" });
  const news = db.prepare("SELECT id FROM news WHERE id = ?").get(req.params.id);
  if (!news) return res.status(404).json({ error: "News non trovata" });
  if (parent_id) {
    const parent = db.prepare("SELECT id, news_id FROM comments WHERE id = ?").get(parent_id);
    if (!parent || parent.news_id !== news.id) return res.status(400).json({ error: "Risposta non valida" });
  }
  const u = db.prepare("SELECT username, avatar FROM users WHERE id = ?").get(req.user.id) || { username: req.user.username, avatar: "" };
  const result = db.prepare("INSERT INTO comments (news_id, user_id, username, content, avatar, parent_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run(req.params.id, req.user.id, u.username, content.trim(), u.avatar || "", parent_id || null);
  res.json(db.prepare("SELECT * FROM comments WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/comments/:id", authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "Contenuto vuoto" });
  const c = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Commento non trovato" });
  db.prepare("UPDATE comments SET content=? WHERE id=?").run(content.trim(), req.params.id);
  res.json(db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id));
});

app.delete("/api/comments/:id", authMiddleware, (req, res) => {
  const c = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Commento non trovato" });
  const isAdmin = req.user.isAdmin === true;
  // Rimozione completa per admin; utenti regolari rimuovono solo il proprio commento
  if (isAdmin) {
    db.prepare("DELETE FROM comments WHERE id = ? OR parent_id = ?").run(req.params.id, req.params.id);
  } else {
    db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

// Fallback POST endpoints (alcuni proxy possono limitare PUT/DELETE)
app.post("/api/comments/:id/edit", authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "Contenuto vuoto" });
  const c = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Commento non trovato" });
  db.prepare("UPDATE comments SET content=? WHERE id=?").run(content.trim(), req.params.id);
  res.json(db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id));
});

app.post("/api/comments/:id/delete", authMiddleware, (req, res) => {
  const c = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Commento non trovato" });
  const isAdmin = req.user.isAdmin === true;
  if (isAdmin) {
    db.prepare("DELETE FROM comments WHERE id = ? OR parent_id = ?").run(req.params.id, req.params.id);
  } else {
    db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

app.delete("/api/admin/comments/:id", authMiddleware, adminMiddleware, (req, res) => {
  db.prepare("DELETE FROM comments WHERE id = ? OR parent_id = ?").run(req.params.id, req.params.id);
  res.json({ success: true });
});

// INJURIES
app.get("/api/injuries", authMiddleware, (req, res) => {
  res.json(db.prepare("SELECT * FROM injuries ORDER BY created_at DESC").all());
});

app.post("/api/admin/injuries", authMiddleware, adminMiddleware, (req, res) => {
  const { player_name, injury, expected_return, status } = req.body;
  if (!player_name || !injury) return res.status(400).json({ error: "Nome giocatore e infortunio obbligatori" });
  const result = db.prepare("INSERT INTO injuries (player_name, injury, expected_return, status) VALUES (?, ?, ?, ?)")
    .run(player_name.trim(), injury.trim(), expected_return || "", status || "Infortunato");
  res.json(db.prepare("SELECT * FROM injuries WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/admin/injuries/:id", authMiddleware, adminMiddleware, (req, res) => {
  const { player_name, injury, expected_return, status } = req.body;
  db.prepare("UPDATE injuries SET player_name=?, injury=?, expected_return=?, status=? WHERE id=?")
    .run(player_name.trim(), injury.trim(), expected_return || "", status || "Infortunato", req.params.id);
  res.json(db.prepare("SELECT * FROM injuries WHERE id = ?").get(req.params.id));
});

app.delete("/api/admin/injuries/:id", authMiddleware, adminMiddleware, (req, res) => {
  db.prepare("DELETE FROM injuries WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Serve React
app.use(express.static(path.join(__dirname, "client/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server avviato su http://0.0.0.0:${PORT}`);
});
