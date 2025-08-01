const sqlite3 = require('sqlite3').verbose();

// Create in-memory database for testing
global.createTestDb = () => {
  const db = new sqlite3.Database(':memory:');
  
  // Create tables synchronously
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      album TEXT,
      UNIQUE(artist, title)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      vote_type INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (song_id) REFERENCES songs (id),
      UNIQUE(song_id, user_id)
    )`);
  });

  return db;
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});