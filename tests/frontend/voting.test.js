/**
 * @jest-environment jsdom
 */

// Mock RadioPlayer voting functionality
class MockVotingSystem {
  constructor() {
    this.userId = this.generateUserId();
    this.currentSong = null;
    this.likeButton = { classList: { add: jest.fn(), remove: jest.fn() } };
    this.dislikeButton = { classList: { add: jest.fn(), remove: jest.fn() } };
  }

  generateUserId() {
    return 'test-user-' + Math.random().toString(36).substr(2, 9);
  }

  setCurrentSong(artist, title, album = null) {
    this.currentSong = { artist, title, album };
  }

  handleError(message) {
    console.error(message);
  }

  async vote(voteType) {
    if (!this.currentSong) {
      this.handleError('No song currently playing');
      return null;
    }

    try {
      // Get song info first
      const songResponse = await fetch('/api/songs/vote-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.currentSong)
      });

      if (!songResponse.ok) {
        throw new Error('Failed to get song info');
      }

      const songData = await songResponse.json();

      // Submit vote
      const voteResponse = await fetch(`/api/songs/${songData.songId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, voteType })
      });

      if (!voteResponse.ok) {
        throw new Error('Failed to submit vote');
      }

      const voteData = await voteResponse.json();
      this.updateVoteDisplay(voteData);
      return voteData;
    } catch (error) {
      console.error('Vote error:', error);
      this.handleError('Failed to submit vote');
      return null;
    }
  }

  updateVoteDisplay(voteData) {
    // Update vote counts and button states
    if (voteData.userVote === 1) {
      this.likeButton.classList.add('active');
      this.dislikeButton.classList.remove('active');
    } else if (voteData.userVote === -1) {
      this.dislikeButton.classList.add('active');
      this.likeButton.classList.remove('active');
    }
  }

  async getUserVote(songId) {
    try {
      const response = await fetch(`/api/songs/${songId}/vote/${this.userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get user vote');
      }

      const data = await response.json();
      return data.userVote;
    } catch (error) {
      console.error('Get user vote error:', error);
      return null;
    }
  }
}

describe('Voting System', () => {
  let votingSystem;
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    votingSystem = new MockVotingSystem();
    votingSystem.setCurrentSong('Test Artist', 'Test Song', 'Test Album');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User ID Generation', () => {
    test('should generate valid user ID format', () => {
      const userId = votingSystem.generateUserId();
      expect(userId).toMatch(/^test-user-[a-z0-9]{9}$/);
    });

    test('should generate unique user IDs', () => {
      const system1 = new MockVotingSystem();
      const system2 = new MockVotingSystem();
      expect(system1.userId).not.toBe(system2.userId);
    });
  });

  describe('Current Song Management', () => {
    test('should set current song correctly', () => {
      votingSystem.setCurrentSong('Artist', 'Title', 'Album');
      
      expect(votingSystem.currentSong).toEqual({
        artist: 'Artist',
        title: 'Title',
        album: 'Album'
      });
    });

    test('should handle null album', () => {
      votingSystem.setCurrentSong('Artist', 'Title');
      
      expect(votingSystem.currentSong).toEqual({
        artist: 'Artist',
        title: 'Title',
        album: null
      });
    });
  });

  describe('Vote Submission', () => {
    beforeEach(() => {
      // Mock successful song info response
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/songs/vote-info') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              songId: 1,
              artist: 'Test Artist',
              title: 'Test Song',
              album: 'Test Album',
              likes: 0,
              dislikes: 0
            })
          });
        }
        
        if (url.includes('/vote') && options.method === 'POST') {
          const voteType = JSON.parse(options.body).voteType;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              likes: voteType === 1 ? 1 : 0,
              dislikes: voteType === -1 ? 1 : 0,
              userVote: voteType
            })
          });
        }
        
        return Promise.reject(new Error('Unexpected URL'));
      });
    });

    test('should submit like vote successfully', async () => {
      const result = await votingSystem.vote(1);
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Check song info request
      expect(mockFetch).toHaveBeenCalledWith('/api/songs/vote-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(votingSystem.currentSong)
      });
      
      // Check vote submission
      expect(mockFetch).toHaveBeenCalledWith('/api/songs/1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: votingSystem.userId, voteType: 1 })
      });
      
      expect(result).toEqual({
        likes: 1,
        dislikes: 0,
        userVote: 1
      });
    });

    test('should submit dislike vote successfully', async () => {
      const result = await votingSystem.vote(-1);
      
      expect(result).toEqual({
        likes: 0,
        dislikes: 1,
        userVote: -1
      });
    });

    test('should handle no current song', async () => {
      votingSystem.currentSong = null;
      const handleErrorSpy = jest.spyOn(votingSystem, 'handleError');
      
      const result = await votingSystem.vote(1);
      
      expect(handleErrorSpy).toHaveBeenCalledWith('No song currently playing');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should handle song info fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      const handleErrorSpy = jest.spyOn(votingSystem, 'handleError');
      const result = await votingSystem.vote(1);
      
      expect(handleErrorSpy).toHaveBeenCalledWith('Failed to submit vote');
      expect(result).toBeNull();
    });

    test('should handle vote submission failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ songId: 1 })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400
        });
      
      const handleErrorSpy = jest.spyOn(votingSystem, 'handleError');
      const result = await votingSystem.vote(1);
      
      expect(handleErrorSpy).toHaveBeenCalledWith('Failed to submit vote');
      expect(result).toBeNull();
    });

    test('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const handleErrorSpy = jest.spyOn(votingSystem, 'handleError');
      const result = await votingSystem.vote(1);
      
      expect(handleErrorSpy).toHaveBeenCalledWith('Failed to submit vote');
      expect(result).toBeNull();
    });
  });

  describe('Vote Display Updates', () => {
    test('should update display for like vote', () => {
      const voteData = {
        likes: 5,
        dislikes: 2,
        userVote: 1
      };
      
      votingSystem.updateVoteDisplay(voteData);
      
      expect(votingSystem.likeButton.classList.add).toHaveBeenCalledWith('active');
      expect(votingSystem.dislikeButton.classList.remove).toHaveBeenCalledWith('active');
    });

    test('should update display for dislike vote', () => {
      const voteData = {
        likes: 5,
        dislikes: 2,
        userVote: -1
      };
      
      votingSystem.updateVoteDisplay(voteData);
      
      expect(votingSystem.dislikeButton.classList.add).toHaveBeenCalledWith('active');
      expect(votingSystem.likeButton.classList.remove).toHaveBeenCalledWith('active');
    });

    test('should handle neutral vote state', () => {
      const voteData = {
        likes: 5,
        dislikes: 2,
        userVote: 0
      };
      
      votingSystem.updateVoteDisplay(voteData);
      
      // Neither button should be activated for neutral/invalid vote
      expect(votingSystem.likeButton.classList.add).not.toHaveBeenCalled();
      expect(votingSystem.dislikeButton.classList.add).not.toHaveBeenCalled();
    });
  });

  describe('Get User Vote', () => {
    test('should retrieve existing user vote', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ userVote: 1 })
      });
      
      const result = await votingSystem.getUserVote(123);
      
      expect(mockFetch).toHaveBeenCalledWith(`/api/songs/123/vote/${votingSystem.userId}`);
      expect(result).toBe(1);
    });

    test('should return null for no existing vote', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ userVote: null })
      });
      
      const result = await votingSystem.getUserVote(123);
      
      expect(result).toBeNull();
    });

    test('should handle fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });
      
      const result = await votingSystem.getUserVote(123);
      
      expect(result).toBeNull();
    });
  });

  describe('Vote Type Validation', () => {
    test('should accept valid like vote', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ songId: 1 })
        })
      );
      
      const result = await votingSystem.vote(1);
      expect(result).not.toBeNull();
    });

    test('should accept valid dislike vote', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ songId: 1 })
        })
      );
      
      const result = await votingSystem.vote(-1);
      expect(result).not.toBeNull();
    });

    test('should handle invalid vote type gracefully', async () => {
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/songs/vote-info') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ songId: 1 })
          });
        }
        
        // Simulate server validation error for invalid vote type
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ 
            error: 'Valid userId and voteType (1 for like, -1 for dislike) are required' 
          })
        });
      });
      
      const handleErrorSpy = jest.spyOn(votingSystem, 'handleError');
      const result = await votingSystem.vote(0); // Invalid vote type
      
      expect(handleErrorSpy).toHaveBeenCalledWith('Failed to submit vote');
      expect(result).toBeNull();
    });
  });

  describe('Vote State Persistence', () => {
    test('should maintain user ID across votes', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ songId: 1, userVote: 1 })
        })
      );
      
      const initialUserId = votingSystem.userId;
      
      await votingSystem.vote(1);
      await votingSystem.vote(-1);
      
      expect(votingSystem.userId).toBe(initialUserId);
      
      // Verify both requests used the same user ID
      const calls = mockFetch.mock.calls.filter(call => 
        call[0].includes('/vote') && call[1].method === 'POST'
      );
      
      calls.forEach(call => {
        const body = JSON.parse(call[1].body);
        expect(body.userId).toBe(initialUserId);
      });
    });
  });
});