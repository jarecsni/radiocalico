const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('users.db');

// Create users table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
)`);

// Create songs table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist TEXT NOT NULL,
    title TEXT NOT NULL,
    album TEXT,
    UNIQUE(artist, title)
)`);

// Create votes table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    vote_type INTEGER NOT NULL, -- 1 for like, -1 for dislike
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs (id),
    UNIQUE(song_id, user_id)
)`);

// API Routes
app.post('/api/users', (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    
    db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Email already exists or database error' });
        }
        res.json({ id: this.lastID, name, email });
    });
});

app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users ORDER BY id DESC LIMIT 10', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Get or create song and return vote counts
app.post('/api/songs/vote-info', (req, res) => {
    const { artist, title, album } = req.body;
    
    if (!artist || !title) {
        return res.status(400).json({ error: 'Artist and title are required' });
    }
    
    // Insert or get song
    db.run('INSERT OR IGNORE INTO songs (artist, title, album) VALUES (?, ?, ?)', [artist, title, album || null], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Get song ID and vote counts
        db.get(`
            SELECT s.id, s.artist, s.title, s.album,
                   COUNT(CASE WHEN v.vote_type = 1 THEN 1 END) as likes,
                   COUNT(CASE WHEN v.vote_type = -1 THEN 1 END) as dislikes
            FROM songs s
            LEFT JOIN votes v ON s.id = v.song_id
            WHERE s.artist = ? AND s.title = ?
            GROUP BY s.id
        `, [artist, title], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({
                songId: row.id,
                artist: row.artist,
                title: row.title,
                album: row.album,
                likes: row.likes || 0,
                dislikes: row.dislikes || 0
            });
        });
    });
});

// Vote on a song (like/dislike/change vote)
app.post('/api/songs/:songId/vote', (req, res) => {
    const { songId } = req.params;
    const { userId, voteType } = req.body;
    
    if (!userId || (voteType !== 1 && voteType !== -1)) {
        return res.status(400).json({ error: 'Valid userId and voteType (1 for like, -1 for dislike) are required' });
    }
    
    // Use INSERT OR REPLACE to handle vote changes
    db.run('INSERT OR REPLACE INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [songId, userId, voteType], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Return updated vote counts
        db.get(`
            SELECT COUNT(CASE WHEN vote_type = 1 THEN 1 END) as likes,
                   COUNT(CASE WHEN vote_type = -1 THEN 1 END) as dislikes
            FROM votes WHERE song_id = ?
        `, [songId], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({
                likes: row.likes || 0,
                dislikes: row.dislikes || 0,
                userVote: voteType
            });
        });
    });
});

// Get user's vote for a song
app.get('/api/songs/:songId/vote/:userId', (req, res) => {
    const { songId, userId } = req.params;
    
    db.get('SELECT vote_type FROM votes WHERE song_id = ? AND user_id = ?', [songId, userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({
            userVote: row ? row.vote_type : null
        });
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});