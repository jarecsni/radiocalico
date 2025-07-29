# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Calico is a web-based live radio streaming application with user voting functionality. It's a Node.js/Express server that provides a modern, responsive web interface for streaming live radio with real-time metadata display and user interaction features.

## Development Commands

- **Start server**: `npm start` or `node server.js` (runs on http://localhost:3000)
- **Install dependencies**: `npm install`

## Architecture

### Backend (server.js)
- **Express.js** web server serving static files and REST API
- **SQLite3** database (`users.db`) for user management and song voting
- **API endpoints** for user registration and voting functionality
- **Database auto-initialization** on server startup

### Frontend (public/radio.html)
- **Pure HTML/CSS/JavaScript** (no framework dependencies)
- **HLS.js** library for HTTP Live Streaming playback
- **Real-time metadata polling** every 30 seconds when playing
- **Responsive design** with mobile-first approach

### External Services
- **CloudFront CDN**: `https://d3d4yli4hf5bmh.cloudfront.net/`
  - Stream: `/hls/live.m3u8` (48kHz FLAC / HLS Lossless)
  - Metadata: `/metadatav2.json` (track info, recent tracks)
  - Album art: `/cover.jpg` (auto-refreshed with timestamps)

## Key Features

### Live Radio Streaming
- HLS streaming with Safari fallback support
- Real-time track metadata (artist, title, album, audio quality)
- Album art display with automatic cache-busting
- Audio controls (play/pause, volume, elapsed time)

### User Voting System
- Anonymous but persistent user identification via localStorage
- Like/dislike functionality for currently playing tracks
- Vote tracking with real-time UI updates
- Database schema: `users`, `songs`, `votes` tables

### User Management
- Basic registration system (name/email)
- Admin interface at `public/index.html`
- User listing functionality

## API Endpoints

- `POST /api/users` - Create new user
- `GET /api/users` - List recent users  
- `POST /api/songs/vote-info` - Get/create song and vote counts
- `POST /api/songs/:songId/vote` - Submit user vote
- `GET /api/songs/:songId/vote/:userId` - Get user's vote for song

## Design System

### Brand Colors
- **Mint**: #D8F2D5 (backgrounds, accents)
- **Forest Green**: #1F4E23 (primary text, borders)  
- **Teal**: #38A29D (secondary accents)
- **Calico Orange**: #EFA63C (highlights, artist banners)
- **Dark**: #231F20 (headers, primary text)

### Typography
- **Montserrat**: Headings, artist names, navigation (weights: 500, 600, 700)
- **Open Sans**: Body text, descriptions (weights: 400, 500)

### Layout
- **Mobile-first responsive design** with 768px breakpoint
- **Flexbox layouts** for main content areas
- **Grid system** for track listings and controls

## File Structure

- `server.js` - Main Express application
- `users.db` - SQLite database (auto-created)
- `public/radio.html` - Main radio player interface (served as `/`)
- `public/index.html` - User management interface
- `public/RadioCalicoLogoTM.png` - Logo asset
- `RadioCalico_Style_Guide.txt` - Complete brand guidelines
- `RadioCalicoLayout.png` - Visual layout reference for UI design
- `stream_URL.txt` - Stream endpoint reference

## Development Notes

### Frontend JavaScript Architecture
- **RadioPlayer class** handles all streaming and UI logic
- **Event-driven** audio state management
- **Polling-based** metadata updates (30s intervals when playing)
- **LocalStorage** for persistent user identification

### Database Schema
```sql
users (id, name, email)
songs (id, artist, title, album) 
votes (id, song_id, user_id, vote_type, created_at)
```

### CSS Organization
- **Responsive breakpoints** at 768px for mobile/desktop
- **CSS custom properties** could be added for color management
- **Component-based** styling (header, player, controls, etc.)

### Stream Integration
- **HLS.js** configuration optimized for low-latency live streaming
- **Error handling** for stream failures and reconnection
- **Metadata synchronization** between stream and display