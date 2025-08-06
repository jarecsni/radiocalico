# Radio Calico 📻

A modern web-based live radio streaming application with real-time user voting and metadata display. Built with Node.js, Express, and SQLite for a complete self-contained radio experience.

![Radio Calico](./RadioCalicoLogoTM.png)

## ✨ Features

- **🎵 Live Radio Streaming**: HLS streaming with Safari fallback support
- **📊 Real-time Voting**: Like/dislike functionality for currently playing tracks
- **🎨 Modern UI**: Responsive design with brand colors and Lucide icons
- **📱 Mobile-First**: Optimized for all screen sizes
- **🔄 Live Metadata**: Real-time track info, album art, and recent tracks
- **👤 User Management**: Anonymous but persistent user identification
- **🐳 Docker Ready**: Complete containerization with dev/prod environments
- **🧪 Fully Tested**: 71 comprehensive tests covering frontend and backend

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Start development environment with hot reload
./deploy.sh dev up

# Start production environment
./deploy.sh prod up

# Access the application
open http://localhost:3000
```

### Local Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run tests
npm test
```

## 🐳 Docker Deployment

Radio Calico provides comprehensive Docker deployment with environment separation:

### Development Environment
```bash
./deploy.sh dev up        # Start development environment
./deploy.sh dev start     # Start existing stopped containers
./deploy.sh dev stop      # Stop containers (keep for restart)
./deploy.sh dev logs      # Show logs
./deploy.sh dev status    # Show container status
```

### Production Environment
```bash
./deploy.sh prod up       # Start production environment
./deploy.sh prod start    # Start existing stopped containers
./deploy.sh prod stop     # Stop containers
./deploy.sh prod logs     # Show logs
./deploy.sh prod build    # Build optimized production image
```

### NPM Scripts
```bash
# Development
npm run docker:dev              # Start dev environment
npm run docker:dev:start        # Start stopped dev containers
npm run docker:dev:stop         # Stop dev containers

# Production
npm run docker:prod             # Start production environment
npm run docker:prod:start       # Start stopped prod containers
npm run docker:prod:stop        # Stop prod containers

# Testing & Maintenance
npm run docker:test             # Run complete test suite
npm run docker:clean            # Clean all containers and volumes
```

## 🧪 Testing

Comprehensive test suite with 71 tests covering all functionality:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:backend      # API and database tests (30 tests)
npm run test:frontend     # UI and voting tests (41 tests)

# Run tests with coverage
npm run test:coverage

# Run tests in Docker
npm run docker:test
```

## 🏗️ Architecture

### Backend
- **Express.js** server with RESTful API
- **SQLite3** database for users, songs, and votes
- **Real-time metadata** fetching from CloudFront CDN
- **Health monitoring** and error handling

### Frontend
- **Vanilla JavaScript** RadioPlayer class
- **HLS.js** for HTTP Live Streaming
- **Responsive CSS** with mobile-first design
- **Real-time voting** with localStorage persistence

### External Services
- **CloudFront CDN**: `https://d3d4yli4hf5bmh.cloudfront.net/`
  - Stream: `/hls/live.m3u8` (48kHz FLAC)
  - Metadata: `/metadatav2.json`
  - Album art: `/cover.jpg`

## 📊 API Endpoints

- `POST /api/users` - Create new user
- `GET /api/users` - List recent users
- `POST /api/songs/vote-info` - Get/create song and vote counts
- `POST /api/songs/:songId/vote` - Submit user vote
- `GET /api/songs/:songId/vote/:userId` - Get user's vote for song

## 🎨 Design System

### Brand Colors
- **Mint**: #D8F2D5 (backgrounds, accents)
- **Forest Green**: #1F4E23 (primary text, borders)
- **Teal**: #38A29D (secondary accents)
- **Calico Orange**: #EFA63C (highlights, artist banners)

### Typography
- **Montserrat**: Headings and navigation (500, 600, 700)
- **Open Sans**: Body text and descriptions (400, 500)

## 🛠️ Development

### Prerequisites
- Node.js 18+ and npm
- Docker 20.10+ and Docker Compose 2.0+ (for containerized deployment)

### Project Structure
```
radiocalico/
├── server.js                 # Express application
├── public/                   # Frontend assets
│   ├── radio.html           # Main radio interface
│   ├── radio-player.js      # RadioPlayer class (378 lines)
│   └── radio-styles.css     # Complete styling (314 lines)
├── tests/                    # Test suite (71 tests)
│   ├── backend/             # API and database tests
│   └── frontend/            # UI and voting system tests
├── docker-compose.yml       # Development environment
├── docker-compose.prod.yml  # Production environment
├── deploy.sh               # Deployment management script
└── DOCKER.md               # Complete containerization guide
```

### Available Scripts
```bash
# Local Development
npm start                   # Start server
npm run dev                 # Development with hot reload
npm test                    # Run all tests
npm run health              # Health check

# Docker Development
npm run docker:dev          # Start development container
npm run docker:prod         # Start production container
npm run docker:test         # Run tests in container
npm run docker:clean        # Clean all containers

# Testing
npm run test:backend        # Backend tests only
npm run test:frontend       # Frontend tests only
npm run test:coverage       # Tests with coverage report
npm run test:watch          # Tests in watch mode
```

## 📈 Performance & Monitoring

### Health Checks
```bash
# Check application health
npm run health

# Check container health
./deploy.sh health

# Container status
./deploy.sh [dev|prod] status
```

### Database Management
```bash
# Backup database
./deploy.sh backup /path/to/backup.db

# Restore database  
./deploy.sh restore /path/to/backup.db
```

## 🚢 Production Deployment

### Basic Production Setup
```bash
# Build and start production environment
./deploy.sh prod build
./deploy.sh prod up

# Verify deployment
./deploy.sh health
./deploy.sh prod status
```

### Production with Nginx & Monitoring
```bash
# Full production stack with reverse proxy and monitoring
docker-compose -f docker-compose.prod.yml --profile nginx --profile monitoring up -d
```

### Production Features
- **Security hardening** with non-root user execution
- **Resource limits** and health monitoring
- **Nginx reverse proxy** with rate limiting
- **SSL/TLS ready** configuration
- **Monitoring integration** with Prometheus node-exporter
- **Automated backup/restore** capabilities

## 📚 Documentation

- **[DOCKER.md](./DOCKER.md)** - Complete containerization guide
- **[TESTING.md](./TESTING.md)** - Testing framework documentation
- **[CLAUDE.md](./CLAUDE.md)** - Project overview and development notes

## 🔧 Troubleshooting

### Common Issues

**Container won't start:**
```bash
./deploy.sh [dev|prod] status    # Check container status
./deploy.sh [dev|prod] logs      # View logs
```

**Port conflicts:**
```bash
netstat -tulpn | grep :3000      # Check port usage
```

**Database issues:**
```bash
./deploy.sh health               # Check health status
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Build containers: `./deploy.sh dev up`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

---

**Radio Calico** - Bringing you quality live radio streaming with modern web technology! 🎵✨