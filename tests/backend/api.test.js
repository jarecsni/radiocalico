const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

describe('Radio Calico API Endpoints', () => {
  let app;
  let db;

  beforeEach(() => {
    // Create test app instance
    app = express();
    app.use(express.json());

    // Create in-memory test database
    db = global.createTestDb();

    // Define API routes (extracted from server.js)
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

    app.post('/api/songs/vote-info', (req, res) => {
      const { artist, title, album } = req.body;
      
      if (!artist || !title) {
        return res.status(400).json({ error: 'Artist and title are required' });
      }
      
      db.run('INSERT OR IGNORE INTO songs (artist, title, album) VALUES (?, ?, ?)', [artist, title, album || null], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
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

    app.post('/api/songs/:songId/vote', (req, res) => {
      const { songId } = req.params;
      const { userId, voteType } = req.body;
      
      if (!userId || (voteType !== 1 && voteType !== -1)) {
        return res.status(400).json({ error: 'Valid userId and voteType (1 for like, -1 for dislike) are required' });
      }
      
      db.run('INSERT OR REPLACE INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [songId, userId, voteType], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
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
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('POST /api/users', () => {
    test('should create a new user with valid data', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    test('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'john@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name and email are required');
    });

    test('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'John Doe' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name and email are required');
    });

    test('should return 400 for duplicate email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      await request(app).post('/api/users').send(userData);
      
      const response = await request(app)
        .post('/api/users')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already exists or database error');
    });
  });

  describe('GET /api/users', () => {
    test('should return empty array when no users exist', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return users ordered by id DESC', async () => {
      const users = [
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
        { name: 'User 3', email: 'user3@example.com' }
      ];

      for (const user of users) {
        await request(app).post('/api/users').send(user);
      }

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe('User 3'); // Most recent first
      expect(response.body[2].name).toBe('User 1'); // Oldest last
    });
  });

  describe('POST /api/songs/vote-info', () => {
    test('should create new song and return vote info', async () => {
      const songData = {
        artist: 'Test Artist',
        title: 'Test Song',
        album: 'Test Album'
      };

      const response = await request(app)
        .post('/api/songs/vote-info')
        .send(songData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        songId: expect.any(Number),
        artist: 'Test Artist',
        title: 'Test Song',
        album: 'Test Album',
        likes: 0,
        dislikes: 0
      });
    });

    test('should return existing song if already exists', async () => {
      const songData = {
        artist: 'Test Artist',
        title: 'Test Song',
        album: 'Test Album'
      };

      const response1 = await request(app)
        .post('/api/songs/vote-info')
        .send(songData);

      const response2 = await request(app)
        .post('/api/songs/vote-info')
        .send(songData);

      expect(response1.body.songId).toBe(response2.body.songId);
    });

    test('should return 400 if artist is missing', async () => {
      const response = await request(app)
        .post('/api/songs/vote-info')
        .send({ title: 'Test Song' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Artist and title are required');
    });

    test('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/songs/vote-info')
        .send({ artist: 'Test Artist' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Artist and title are required');
    });
  });

  describe('POST /api/songs/:songId/vote', () => {
    let songId;

    beforeEach(async () => {
      const songResponse = await request(app)
        .post('/api/songs/vote-info')
        .send({
          artist: 'Test Artist',
          title: 'Test Song',
          album: 'Test Album'
        });
      songId = songResponse.body.songId;
    });

    test('should record a like vote', async () => {
      const response = await request(app)
        .post(`/api/songs/${songId}/vote`)
        .send({
          userId: 'user123',
          voteType: 1
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        likes: 1,
        dislikes: 0,
        userVote: 1
      });
    });

    test('should record a dislike vote', async () => {
      const response = await request(app)
        .post(`/api/songs/${songId}/vote`)
        .send({
          userId: 'user123',
          voteType: -1
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        likes: 0,
        dislikes: 1,
        userVote: -1
      });
    });

    test('should change existing vote', async () => {
      // First vote: like
      await request(app)
        .post(`/api/songs/${songId}/vote`)
        .send({
          userId: 'user123',
          voteType: 1
        });

      // Change to dislike
      const response = await request(app)
        .post(`/api/songs/${songId}/vote`)
        .send({
          userId: 'user123',
          voteType: -1
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        likes: 0,
        dislikes: 1,
        userVote: -1
      });
    });

    test('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post(`/api/songs/${songId}/vote`)
        .send({ voteType: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid userId and voteType (1 for like, -1 for dislike) are required');
    });

    test('should return 400 if voteType is invalid', async () => {
      const response = await request(app)
        .post(`/api/songs/${songId}/vote`)
        .send({
          userId: 'user123',
          voteType: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid userId and voteType (1 for like, -1 for dislike) are required');
    });
  });

  describe('GET /api/songs/:songId/vote/:userId', () => {
    let songId;

    beforeEach(async () => {
      const songResponse = await request(app)
        .post('/api/songs/vote-info')
        .send({
          artist: 'Test Artist',
          title: 'Test Song',
          album: 'Test Album'
        });
      songId = songResponse.body.songId;
    });

    test('should return null if user has not voted', async () => {
      const response = await request(app)
        .get(`/api/songs/${songId}/vote/user123`);

      expect(response.status).toBe(200);
      expect(response.body.userVote).toBeNull();
    });

    test('should return user vote if exists', async () => {
      // Create a vote first
      await request(app)
        .post(`/api/songs/${songId}/vote`)
        .send({
          userId: 'user123',
          voteType: 1
        });

      const response = await request(app)
        .get(`/api/songs/${songId}/vote/user123`);

      expect(response.status).toBe(200);
      expect(response.body.userVote).toBe(1);
    });
  });
});