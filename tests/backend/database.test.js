const sqlite3 = require('sqlite3').verbose();

describe('Database Operations', () => {
  let db;

  beforeEach(() => {
    db = global.createTestDb();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Users Table', () => {
    test('should insert a new user', (done) => {
      db.run('INSERT INTO users (name, email) VALUES (?, ?)', ['John Doe', 'john@example.com'], function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBeGreaterThan(0);
        done();
      });
    });

    test('should prevent duplicate emails', (done) => {
      db.run('INSERT INTO users (name, email) VALUES (?, ?)', ['John Doe', 'john@example.com'], function(err) {
        expect(err).toBeNull();
        
        // Try to insert duplicate email
        db.run('INSERT INTO users (name, email) VALUES (?, ?)', ['Jane Doe', 'john@example.com'], function(err) {
          expect(err).not.toBeNull();
          expect(err.code).toBe('SQLITE_CONSTRAINT');
          done();
        });
      });
    });

    test('should retrieve users ordered by id DESC', (done) => {
      const users = [
        ['User 1', 'user1@example.com'],
        ['User 2', 'user2@example.com'],
        ['User 3', 'user3@example.com']
      ];

      let insertCount = 0;
      users.forEach(([name, email]) => {
        db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], function(err) {
          expect(err).toBeNull();
          insertCount++;
          
          if (insertCount === users.length) {
            db.all('SELECT * FROM users ORDER BY id DESC LIMIT 10', (err, rows) => {
              expect(err).toBeNull();
              expect(rows).toHaveLength(3);
              expect(rows[0].name).toBe('User 3');
              expect(rows[2].name).toBe('User 1');
              done();
            });
          }
        });
      });
    });
  });

  describe('Songs Table', () => {
    test('should insert a new song', (done) => {
      db.run('INSERT INTO songs (artist, title, album) VALUES (?, ?, ?)', ['Test Artist', 'Test Song', 'Test Album'], function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBeGreaterThan(0);
        done();
      });
    });

    test('should handle INSERT OR IGNORE for duplicate songs', (done) => {
      const songData = ['Test Artist', 'Test Song', 'Test Album'];
      
      db.run('INSERT OR IGNORE INTO songs (artist, title, album) VALUES (?, ?, ?)', songData, function(err) {
        expect(err).toBeNull();
        const firstId = this.lastID;
        
        // Insert same song again
        db.run('INSERT OR IGNORE INTO songs (artist, title, album) VALUES (?, ?, ?)', songData, function(err) {
          expect(err).toBeNull();
          expect(this.lastID).toBe(0); // No new insertion
          
          // Verify only one song exists
          db.all('SELECT * FROM songs WHERE artist = ? AND title = ?', ['Test Artist', 'Test Song'], (err, rows) => {
            expect(err).toBeNull();
            expect(rows).toHaveLength(1);
            expect(rows[0].id).toBe(firstId);
            done();
          });
        });
      });
    });

    test('should handle null album values', (done) => {
      db.run('INSERT INTO songs (artist, title, album) VALUES (?, ?, ?)', ['Test Artist', 'Test Song', null], function(err) {
        expect(err).toBeNull();
        
        db.get('SELECT * FROM songs WHERE id = ?', [this.lastID], (err, row) => {
          expect(err).toBeNull();
          expect(row.album).toBeNull();
          done();
        });
      });
    });
  });

  describe('Votes Table', () => {
    let songId;

    beforeEach((done) => {
      db.run('INSERT INTO songs (artist, title, album) VALUES (?, ?, ?)', ['Test Artist', 'Test Song', 'Test Album'], function(err) {
        songId = this.lastID;
        done();
      });
    });

    test('should insert a like vote', (done) => {
      db.run('INSERT INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [songId, 'user123', 1], function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBeGreaterThan(0);
        done();
      });
    });

    test('should insert a dislike vote', (done) => {
      db.run('INSERT INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [songId, 'user123', -1], function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBeGreaterThan(0);
        done();
      });
    });

    test('should handle INSERT OR REPLACE for vote changes', (done) => {
      // Insert initial like vote
      db.run('INSERT OR REPLACE INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [songId, 'user123', 1], function(err) {
        expect(err).toBeNull();
        
        // Change to dislike vote
        db.run('INSERT OR REPLACE INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [songId, 'user123', -1], function(err) {
          expect(err).toBeNull();
          
          // Verify only one vote exists and it's a dislike
          db.all('SELECT * FROM votes WHERE song_id = ? AND user_id = ?', [songId, 'user123'], (err, rows) => {
            expect(err).toBeNull();
            expect(rows).toHaveLength(1);
            expect(rows[0].vote_type).toBe(-1);
            done();
          });
        });
      });
    });

    test('should prevent duplicate votes without REPLACE', (done) => {
      db.run('INSERT INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [songId, 'user123', 1], function(err) {
        expect(err).toBeNull();
        
        // Try to insert duplicate vote
        db.run('INSERT INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [songId, 'user123', -1], function(err) {
          expect(err).not.toBeNull();
          expect(err.code).toBe('SQLITE_CONSTRAINT');
          done();
        });
      });
    });

    test('should calculate vote counts correctly', (done) => {
      const votes = [
        [songId, 'user1', 1],   // like
        [songId, 'user2', 1],   // like
        [songId, 'user3', -1],  // dislike
        [songId, 'user4', 1],   // like
        [songId, 'user5', -1]   // dislike
      ];

      let insertCount = 0;
      votes.forEach(([sId, userId, voteType]) => {
        db.run('INSERT INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [sId, userId, voteType], function(err) {
          expect(err).toBeNull();
          insertCount++;
          
          if (insertCount === votes.length) {
            db.get(`
              SELECT COUNT(CASE WHEN vote_type = 1 THEN 1 END) as likes,
                     COUNT(CASE WHEN vote_type = -1 THEN 1 END) as dislikes
              FROM votes WHERE song_id = ?
            `, [songId], (err, row) => {
              expect(err).toBeNull();
              expect(row.likes).toBe(3);
              expect(row.dislikes).toBe(2);
              done();
            });
          }
        });
      });
    });
  });

  describe('Complex Queries', () => {
    test('should join songs and votes for complete vote info', (done) => {
      // Insert song
      db.run('INSERT INTO songs (artist, title, album) VALUES (?, ?, ?)', ['Test Artist', 'Test Song', 'Test Album'], function(err) {
        const songId = this.lastID;
        
        // Insert votes
        const votes = [
          [songId, 'user1', 1],
          [songId, 'user2', 1],
          [songId, 'user3', -1]
        ];

        let insertCount = 0;
        votes.forEach(([sId, userId, voteType]) => {
          db.run('INSERT INTO votes (song_id, user_id, vote_type) VALUES (?, ?, ?)', [sId, userId, voteType], function(err) {
            insertCount++;
            
            if (insertCount === votes.length) {
              db.get(`
                SELECT s.id, s.artist, s.title, s.album,
                       COUNT(CASE WHEN v.vote_type = 1 THEN 1 END) as likes,
                       COUNT(CASE WHEN v.vote_type = -1 THEN 1 END) as dislikes
                FROM songs s
                LEFT JOIN votes v ON s.id = v.song_id
                WHERE s.artist = ? AND s.title = ?
                GROUP BY s.id
              `, ['Test Artist', 'Test Song'], (err, row) => {
                expect(err).toBeNull();
                expect(row.id).toBe(songId);
                expect(row.artist).toBe('Test Artist');
                expect(row.title).toBe('Test Song');
                expect(row.album).toBe('Test Album');
                expect(row.likes).toBe(2);
                expect(row.dislikes).toBe(1);
                done();
              });
            }
          });
        });
      });
    });

    test('should handle songs with no votes', (done) => {
      db.run('INSERT INTO songs (artist, title, album) VALUES (?, ?, ?)', ['No Votes Artist', 'No Votes Song', null], function(err) {
        expect(err).toBeNull();
        const songId = this.lastID;
        
        db.get(`
          SELECT s.id, s.artist, s.title, s.album,
                 COALESCE(COUNT(CASE WHEN v.vote_type = 1 THEN 1 END), 0) as likes,
                 COALESCE(COUNT(CASE WHEN v.vote_type = -1 THEN 1 END), 0) as dislikes
          FROM songs s
          LEFT JOIN votes v ON s.id = v.song_id
          WHERE s.id = ?
          GROUP BY s.id
        `, [songId], (err, row) => {
          expect(err).toBeNull();
          expect(row).toBeTruthy();
          expect(row.id).toBe(songId);
          expect(row.likes).toBe(0);
          expect(row.dislikes).toBe(0);
          done();
        });
      });
    });
  });
});