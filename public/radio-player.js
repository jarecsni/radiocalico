class RadioPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playButton = document.getElementById('playButton');
        this.volumeSlider = document.getElementById('volume');
        this.errorDiv = document.getElementById('errorMessage');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.recentTracksDiv = document.getElementById('recentTracks');
        this.albumArtImg = document.getElementById('albumArt');
        this.likeButton = document.getElementById('likeButton');
        this.dislikeButton = document.getElementById('dislikeButton');
        this.streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
        this.metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
        this.hls = null;
        this.isPlaying = false;
        this.startTime = null;
        this.elapsedInterval = null;
        this.metadataInterval = null;
        this.currentSong = null;
        this.userId = this.generateUserId();
        
        this.initializePlayer();
        this.attachEventListeners();
        this.fetchMetadata();
    }
    
    initializePlayer() {
        // Check if HLS is supported
        if (Hls.isSupported()) {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            
            this.hls.loadSource(this.streamUrl);
            this.hls.attachMedia(this.audio);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest parsed');
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data);
                this.handleError('Stream error occurred');
            });
            
        } else if (this.audio.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
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
        
        
        
        this.audio.addEventListener('playing', () => {
            this.isPlaying = true;
            this.playButton.innerHTML = '<i data-lucide="pause" class="play-icon"></i>';
            lucide.createIcons();
            this.startElapsedTimer();
            this.startMetadataPolling();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playButton.innerHTML = '<i data-lucide="play" class="play-icon"></i>';
            lucide.createIcons();
            this.stopElapsedTimer();
            this.stopMetadataPolling();
        });
        
        
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.handleError('Failed to load audio stream');
        });
        
    }
    
    togglePlayback() {
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('Playback failed:', error);
                    this.handleError('Playback failed. Click to try again.');
                });
            }
        }
    }
    
    handleError(message) {
        this.showError(message);
        this.isPlaying = false;
        this.playButton.innerHTML = '<i data-lucide="play" class="play-icon"></i>';
        lucide.createIcons();
        this.stopElapsedTimer();
        this.stopMetadataPolling();
    }
    
    showError(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
    }
    
    hideError() {
        this.errorDiv.style.display = 'none';
    }
    
    startElapsedTimer() {
        this.startTime = Date.now();
        this.elapsedInterval = setInterval(() => {
            this.updateElapsedTime();
        }, 1000);
    }
    
    stopElapsedTimer() {
        if (this.elapsedInterval) {
            clearInterval(this.elapsedInterval);
            this.elapsedInterval = null;
        }
        if (this.timeDisplay) {
            this.timeDisplay.textContent = '0:00 / Live';
        }
    }
    
    updateElapsedTime() {
        if (this.startTime && this.timeDisplay) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.timeDisplay.textContent = `${timeString} / Live`;
        }
    }
    
    async fetchMetadata() {
        try {
            const response = await fetch(this.metadataUrl);
            const metadata = await response.json();
            this.updateTrackInfo(metadata);
            this.updateRecentTracks(metadata);
            this.updateAlbumArt();
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
            this.currentTrackDiv.textContent = 'Track info unavailable';
            this.recentTracksDiv.textContent = 'Recent tracks unavailable';
            this.resetVotingUI();
        }
    }
    
    updateTrackInfo(metadata) {
        if (metadata && metadata.artist && metadata.title) {
            // Update artist name in banner
            const artistName = document.getElementById('artistName');
            const trackTitle = document.getElementById('trackTitle');
            const songTitle = document.getElementById('songTitle');
            const albumInfo = document.getElementById('albumInfo');
            const qualityInfo = document.getElementById('qualityInfo');
            
            if (artistName) artistName.textContent = metadata.artist.toUpperCase();
            if (trackTitle) trackTitle.textContent = metadata.artist;
            if (songTitle) {
                let titleText = metadata.title;
                if (metadata.date) {
                    titleText += ` (${metadata.date})`;
                }
                songTitle.textContent = titleText;
            }
            if (albumInfo && metadata.album) {
                albumInfo.textContent = metadata.album;
            }
            if (qualityInfo && metadata.bit_depth && metadata.sample_rate) {
                qualityInfo.innerHTML = `Source quality: ${metadata.bit_depth}-bit ${metadata.sample_rate.toLocaleString()}Hz<br>Stream quality: 48kHz FLAC / HLS Lossless`;
            }
            
            // Update voting info if track changed
            const newSong = {
                artist: metadata.artist,
                title: metadata.title,
                album: metadata.album
            };
            
            const isNewTrack = !this.currentSong || 
                this.currentSong.artist !== newSong.artist || 
                this.currentSong.title !== newSong.title;
            
            if (isNewTrack) {
                console.log('New track detected, updating voting info:', newSong);
                this.currentSong = newSong;
                this.updateVotingInfo();
            }
        } else {
            // Set default values when no track info
            const artistName = document.getElementById('artistName');
            const trackTitle = document.getElementById('trackTitle');
            const songTitle = document.getElementById('songTitle');
            const albumInfo = document.getElementById('albumInfo');
            
            if (artistName) artistName.textContent = 'RADIO CALICO';
            if (trackTitle) trackTitle.textContent = 'Loading...';
            if (songTitle) songTitle.textContent = 'Track info unavailable';
            if (albumInfo) albumInfo.textContent = '';
            
            this.currentSong = null;
            this.resetVotingUI();
        }
    }
    
    updateRecentTracks(metadata) {
        if (!metadata) return;
        
        let recentHtml = '';
        for (let i = 1; i <= 5; i++) {
            const artist = metadata[`prev_artist_${i}`];
            const title = metadata[`prev_title_${i}`];
            
            if (artist && title) {
                recentHtml += `
                    <div class="recent-track">
                        <strong>${artist}</strong><br>
                        ${title}
                    </div>
                `;
            }
        }
        
        if (recentHtml) {
            this.recentTracksDiv.innerHTML = recentHtml;
        } else {
            this.recentTracksDiv.textContent = 'No recent tracks available';
        }
    }
    
    updateAlbumArt() {
        // Force refresh album art by adding timestamp to prevent caching
        const timestamp = Date.now();
        this.albumArtImg.src = `https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg?t=${timestamp}`;
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
    
    generateUserId() {
        let userId = localStorage.getItem('radioUserId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('radioUserId', userId);
        }
        return userId;
    }
    
    async updateVotingInfo() {
        if (!this.currentSong) {
            console.log('No current song, skipping vote info update');
            return;
        }
        
        console.log('Updating voting info for:', this.currentSong);
        
        try {
            const response = await fetch('/api/songs/vote-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.currentSong)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Vote info received:', data);
                this.currentSong.songId = data.songId;
                
                // Get user's current vote
                this.getUserVote();
            } else {
                console.error('Failed to fetch vote info, status:', response.status);
            }
        } catch (error) {
            console.error('Failed to update voting info:', error);
        }
    }
    
    async getUserVote() {
        if (!this.currentSong || !this.currentSong.songId) {
            console.log('No song ID available for getting user vote');
            return;
        }
        
        console.log('Getting user vote for song ID:', this.currentSong.songId, 'user:', this.userId);
        
        try {
            const response = await fetch(`/api/songs/${this.currentSong.songId}/vote/${this.userId}`);
            if (response.ok) {
                const data = await response.json();
                console.log('User vote received:', data);
                this.updateVoteButtons(data.userVote);
            } else {
                console.error('Failed to get user vote, status:', response.status);
            }
        } catch (error) {
            console.error('Failed to get user vote:', error);
        }
    }
    
    async vote(voteType) {
        if (!this.currentSong || !this.currentSong.songId) return;
        
        try {
            const response = await fetch(`/api/songs/${this.currentSong.songId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    voteType: voteType
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateVoteButtons(data.userVote);
            }
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    }
    
    updateVoteButtons(userVote) {
        this.likeButton.classList.remove('liked');
        this.dislikeButton.classList.remove('disliked');
        
        if (userVote === 1) {
            this.likeButton.classList.add('liked');
        } else if (userVote === -1) {
            this.dislikeButton.classList.add('disliked');
        }
    }
    
    resetVotingUI() {
        this.likeButton.classList.remove('liked');
        this.dislikeButton.classList.remove('disliked');
    }
}

// Initialize the radio player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RadioPlayer();
    // Initialize Lucide icons
    lucide.createIcons();
});