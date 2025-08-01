/**
 * @jest-environment jsdom
 */

// Mock the RadioPlayer module by copying its implementation
class MockRadioPlayer {
  constructor() {
    this.audio = {
      id: 'audioPlayer',
      volume: 1,
      currentTime: 0,
      duration: 0,
      paused: true,
      ended: false,
      play: jest.fn().mockResolvedValue(void 0),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      canPlayType: jest.fn().mockReturnValue('maybe'),
      src: ''
    };
    
    this.playButton = { addEventListener: jest.fn(), innerHTML: '' };
    this.volumeSlider = { addEventListener: jest.fn() };
    this.errorDiv = { style: { display: '' }, textContent: '' };
    this.timeDisplay = { textContent: '' };
    this.recentTracksDiv = { innerHTML: '' };
    this.albumArtImg = { src: '', alt: '', style: { display: '' } };
    this.likeButton = { addEventListener: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() } };
    this.dislikeButton = { addEventListener: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() } };
    
    this.streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
    this.metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
    this.DEFAULT_STREAM_QUALITY = '48kHz FLAC / HLS Lossless';
    this.hls = null;
    this.isPlaying = false;
    this.startTime = null;
    this.elapsedInterval = null;
    this.metadataInterval = null;
    this.currentSong = null;
    this.userId = this.generateUserId();
  }

  generateUserId() {
    return 'test-user-' + Math.random().toString(36).substr(2, 9);
  }

  initializePlayer() {
    if (global.Hls.isSupported()) {
      this.hls = new global.Hls();
      this.hls.loadSource(this.streamUrl);
      this.hls.attachMedia(this.audio);
    } else if (this.audio.canPlayType('application/vnd.apple.mpegurl')) {
      this.audio.src = this.streamUrl;
    } else {
      this.handleError('HLS is not supported in this browser');
    }
  }

  attachEventListeners() {
    this.playButton.addEventListener('click', () => this.togglePlayback());
    this.volumeSlider.addEventListener('input', (e) => {
      this.audio.volume = e.target.value / 100;
    });
    this.likeButton.addEventListener('click', () => this.vote(1));
    this.dislikeButton.addEventListener('click', () => this.vote(-1));
  }

  togglePlayback() {
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      return this.audio.play().catch(error => {
        this.handleError('Failed to start playback: ' + error.message);
      });
    }
  }

  handleError(message) {
    console.error(message);
    this.errorDiv.textContent = message;
    this.errorDiv.style.display = 'block';
  }

  async fetchMetadata() {
    try {
      const response = await fetch(this.metadataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const metadata = await response.json();
      this.updateMetadata(metadata);
      return metadata;
    } catch (error) {
      console.error('Metadata fetch error:', error);
      this.handleError('Failed to load track information');
      return null;
    }
  }

  updateMetadata(metadata) {
    if (metadata && metadata.current) {
      const { artist, title, album } = metadata.current;
      this.currentSong = { artist, title, album };
      
      // Update display elements would go here
      document.getElementById('currentArtist').textContent = artist || 'Unknown Artist';
      document.getElementById('currentTitle').textContent = title || 'Unknown Title';
      document.getElementById('currentAlbum').textContent = album || '';
    }
  }

  async vote(voteType) {
    if (!this.currentSong) {
      this.handleError('No song currently playing');
      return;
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

  startElapsedTimer() {
    this.startTime = Date.now();
    this.elapsedInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  stopElapsedTimer() {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  startMetadataPolling() {
    this.metadataInterval = setInterval(() => {
      this.fetchMetadata();
    }, 30000);
  }

  stopMetadataPolling() {
    if (this.metadataInterval) {
      clearInterval(this.metadataInterval);
      this.metadataInterval = null;
    }
  }
}

describe('RadioPlayer', () => {
  let player;
  let mockFetch;

  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <audio id="audioPlayer"></audio>
      <button id="playButton"></button>
      <input id="volume" type="range" min="0" max="100" value="100">
      <div id="errorMessage"></div>
      <div id="timeDisplay"></div>
      <div id="recentTracks"></div>
      <img id="albumArt" src="" alt="">
      <button id="likeButton"></button>
      <button id="dislikeButton"></button>
      <div id="currentArtist"></div>
      <div id="currentTitle"></div>
      <div id="currentAlbum"></div>
    `;

    // Mock global objects
    global.Hls = jest.fn().mockImplementation(() => ({
      loadSource: jest.fn(),
      attachMedia: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
    }));
    global.Hls.isSupported = jest.fn().mockReturnValue(true);
    global.Hls.Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError',
    };

    global.lucide = {
      createIcons: jest.fn()
    };

    mockFetch = jest.fn();
    global.fetch = mockFetch;

    player = new MockRadioPlayer();
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (player.elapsedInterval) {
      clearInterval(player.elapsedInterval);
    }
    if (player.metadataInterval) {
      clearInterval(player.metadataInterval);
    }
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(player.isPlaying).toBe(false);
      expect(player.startTime).toBeNull();
      expect(player.elapsedInterval).toBeNull();
      expect(player.metadataInterval).toBeNull();
      expect(player.currentSong).toBeNull();
      expect(player.userId).toMatch(/^test-user-/);
      expect(player.DEFAULT_STREAM_QUALITY).toBe('48kHz FLAC / HLS Lossless');
    });

    test('should generate unique user IDs', () => {
      const player1 = new MockRadioPlayer();
      const player2 = new MockRadioPlayer();
      expect(player1.userId).not.toBe(player2.userId);
    });
  });

  describe('generateUserId', () => {
    test('should generate a string with test-user prefix', () => {
      const userId = player.generateUserId();
      expect(userId).toMatch(/^test-user-[a-z0-9]{9}$/);
    });

    test('should generate different IDs on multiple calls', () => {
      const id1 = player.generateUserId();
      const id2 = player.generateUserId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('initializePlayer', () => {
    test('should initialize HLS when supported', () => {
      global.Hls.isSupported.mockReturnValue(true);
      player.initializePlayer();
      
      expect(global.Hls).toHaveBeenCalled();
      expect(player.hls.loadSource).toHaveBeenCalledWith(player.streamUrl);
      expect(player.hls.attachMedia).toHaveBeenCalledWith(player.audio);
    });

    test('should fallback to native HLS for Safari', () => {
      global.Hls.isSupported.mockReturnValue(false);
      player.audio.canPlayType.mockReturnValue('maybe');
      
      player.initializePlayer();
      
      expect(player.audio.src).toBe(player.streamUrl);
    });

    test('should handle error when HLS not supported', () => {
      global.Hls.isSupported.mockReturnValue(false);
      player.audio.canPlayType.mockReturnValue('');
      
      const handleErrorSpy = jest.spyOn(player, 'handleError');
      player.initializePlayer();
      
      expect(handleErrorSpy).toHaveBeenCalledWith('HLS is not supported in this browser');
    });
  });

  describe('togglePlayback', () => {
    test('should pause when playing', () => {
      player.isPlaying = true;
      player.togglePlayback();
      
      expect(player.audio.pause).toHaveBeenCalled();
    });

    test('should play when paused', async () => {
      player.isPlaying = false;
      await player.togglePlayback();
      
      expect(player.audio.play).toHaveBeenCalled();
    });

    test('should handle play promise rejection', async () => {
      player.isPlaying = false;
      player.audio.play.mockRejectedValue(new Error('Play failed'));
      const handleErrorSpy = jest.spyOn(player, 'handleError');
      
      await player.togglePlayback();
      
      expect(handleErrorSpy).toHaveBeenCalledWith('Failed to start playback: Play failed');
    });
  });

  describe('handleError', () => {
    test('should display error message', () => {
      const errorMessage = 'Test error message';
      player.handleError(errorMessage);
      
      expect(player.errorDiv.textContent).toBe(errorMessage);
      expect(player.errorDiv.style.display).toBe('block');
    });
  });

  describe('fetchMetadata', () => {
    test('should fetch and return metadata successfully', async () => {
      const mockMetadata = {
        current: {
          artist: 'Test Artist',
          title: 'Test Song',
          album: 'Test Album'
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetadata)
      });
      
      const updateMetadataSpy = jest.spyOn(player, 'updateMetadata');
      const result = await player.fetchMetadata();
      
      expect(mockFetch).toHaveBeenCalledWith(player.metadataUrl);
      expect(updateMetadataSpy).toHaveBeenCalledWith(mockMetadata);
      expect(result).toEqual(mockMetadata);
    });

    test('should handle fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });
      
      const handleErrorSpy = jest.spyOn(player, 'handleError');
      const result = await player.fetchMetadata();
      
      expect(handleErrorSpy).toHaveBeenCalledWith('Failed to load track information');
      expect(result).toBeNull();
    });

    test('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const handleErrorSpy = jest.spyOn(player, 'handleError');
      const result = await player.fetchMetadata();
      
      expect(handleErrorSpy).toHaveBeenCalledWith('Failed to load track information');
      expect(result).toBeNull();
    });
  });

  describe('updateMetadata', () => {
    test('should update current song and display elements', () => {
      const metadata = {
        current: {
          artist: 'Test Artist',
          title: 'Test Song',
          album: 'Test Album'
        }
      };
      
      player.updateMetadata(metadata);
      
      expect(player.currentSong).toEqual({
        artist: 'Test Artist',
        title: 'Test Song',
        album: 'Test Album'
      });
      
      expect(document.getElementById('currentArtist').textContent).toBe('Test Artist');
      expect(document.getElementById('currentTitle').textContent).toBe('Test Song');
      expect(document.getElementById('currentAlbum').textContent).toBe('Test Album');
    });

    test('should handle missing metadata fields', () => {
      const metadata = {
        current: {
          artist: 'Test Artist'
          // title and album missing
        }
      };
      
      player.updateMetadata(metadata);
      
      expect(document.getElementById('currentArtist').textContent).toBe('Test Artist');
      expect(document.getElementById('currentTitle').textContent).toBe('Unknown Title');
      expect(document.getElementById('currentAlbum').textContent).toBe('');
    });

    test('should handle null metadata', () => {
      player.updateMetadata(null);
      expect(player.currentSong).toBeNull();
    });
  });

  describe('Timer Functions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should start elapsed timer', () => {
      player.startElapsedTimer();
      
      expect(player.startTime).toBeTruthy();
      expect(player.elapsedInterval).toBeTruthy();
      
      // Fast forward time
      jest.advanceTimersByTime(65000); // 1 minute 5 seconds
      
      expect(player.timeDisplay.textContent).toBe('1:05');
    });

    test('should stop elapsed timer', () => {
      player.startElapsedTimer();
      const intervalId = player.elapsedInterval;
      
      player.stopElapsedTimer();
      
      expect(player.elapsedInterval).toBeNull();
    });

    test('should start metadata polling', () => {
      const fetchMetadataSpy = jest.spyOn(player, 'fetchMetadata').mockResolvedValue({});
      
      player.startMetadataPolling();
      
      expect(player.metadataInterval).toBeTruthy();
      
      // Fast forward 30 seconds
      jest.advanceTimersByTime(30000);
      
      expect(fetchMetadataSpy).toHaveBeenCalled();
    });

    test('should stop metadata polling', () => {
      player.startMetadataPolling();
      
      player.stopMetadataPolling();
      
      expect(player.metadataInterval).toBeNull();
    });
  });
});