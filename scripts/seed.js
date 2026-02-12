const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "data.db"));

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
`);

// Remove old admin, create new one
db.prepare("DELETE FROM users WHERE username = 'amministratore'").run();
const adminExists = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashed = bcrypt.hashSync("admin", 10);
  db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)").run("admin", hashed);
  console.log("Admin creato: admin / admin");
} else {
  console.log("Admin già esistente");
}

const playerCount = db.prepare("SELECT COUNT(*) as count FROM players").get().count;
if (playerCount === 0) {
  const players = [
    { name: "Giacinto Lesce", goals: 5, matches: 8, height: "178 cm", position: "Attaccante", description: "Giocatore tecnico con grande visione di gioco.", number: 10 },
    { name: "Francesco Russo", goals: 7, matches: 10, height: "182 cm", position: "Centrocampista", description: "Leader del centrocampo con ottime capacità di passaggio.", number: 8 },
    { name: "Giuseppe Papasso", goals: 3, matches: 9, height: "175 cm", position: "Difensore", description: "Difensore solido e affidabile, sempre presente.", number: 4 },
    { name: "Luca Argentano", goals: 4, matches: 7, height: "180 cm", position: "Attaccante", description: "Veloce e scattante, pericoloso in contropiede.", number: 9 },
  ];
  const stmt = db.prepare(
    "INSERT INTO players (name, goals, matches, height, position, description, number) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const p of players) {
    stmt.run(p.name, p.goals, p.matches, p.height, p.position, p.description, p.number);
  }
  console.log("Giocatori iniziali inseriti");
}

console.log("Seed completato!");
