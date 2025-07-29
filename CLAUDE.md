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

### Frontend (Refactored Structure)
- **Separation of concerns**: HTML structure, CSS styling, and JavaScript functionality in separate files
- **radio.html**: Clean HTML structure with external CSS/JS references
- **radio-styles.css**: Complete styling system with responsive design and brand colors
- **radio-player.js**: RadioPlayer class with HLS streaming, metadata handling, and user interactions
- **Lucide Icons**: Modern geometric icon system for UI controls
- **HLS.js**: HTTP Live Streaming library for audio playback

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
- `public/radio.html` - Main radio player interface
- `public/radio-styles.css` - Radio player styling (314 lines)
- `public/radio-player.js` - Radio player functionality (378 lines)
- `public/index.html` - User management interface (served as `/`)
- `public/user-management.css` - User management styling (162 lines)
- `public/RadioCalicoLogoTM.png` - Logo asset
- `RadioCalico_Style_Guide.txt` - Complete brand guidelines
- `RadioCalicoLayout.png` - Visual layout reference for UI design
- `stream_URL.txt` - Stream endpoint reference

## Development Notes

### Code Organization (Post-Refactoring)
- **Separated concerns**: HTML, CSS, and JavaScript in dedicated files
- **radio-styles.css**: 314 lines of organized styling with proper component separation
- **radio-player.js**: 378 lines containing complete RadioPlayer class implementation
- **user-management.css**: 162 lines for admin interface styling
- **No inline styles or scripts** - all externalized for maintainability

### Frontend JavaScript Architecture
- **RadioPlayer class** in dedicated `radio-player.js` file
- **Event-driven** audio state management with proper error handling
- **Polling-based** metadata updates (30s intervals when playing)
- **LocalStorage** for persistent user identification
- **Lucide icon integration** for consistent geometric UI controls

### CSS Architecture
- **Component-based styling** with logical separation
- **Brand color system** properly implemented across components
- **Responsive breakpoints** at 768px for mobile/desktop
- **Audio controls** with custom slider styling and hover effects
- **Typography hierarchy** using Montserrat and Open Sans fonts

### External Library Integration
- **HLS.js**: HTTP Live Streaming with Safari fallback support
- **Lucide Icons**: Modern icon system with `createIcons()` initialization
- **Google Fonts**: Montserrat and Open Sans with proper font loading

### Database Schema
```sql
users (id, name, email)
songs (id, artist, title, album) 
votes (id, song_id, user_id, vote_type, created_at)
```

### Stream Integration
- **HLS.js** configuration optimized for low-latency live streaming
- **Error handling** for stream failures and reconnection
- **Metadata synchronization** between stream and display
- **Icon state management** for play/pause button transitions