# Radio Calico Docker Deployment Guide

This guide covers containerized deployment of Radio Calico for both development and production environments.

## Overview

Radio Calico is packaged as a self-contained Docker application with the following deployment options:

- **Development**: Hot-reload development environment with full debugging capabilities
- **Production**: Optimized multi-stage build with security hardening and monitoring
- **Testing**: Isolated test execution environment

## Quick Start

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- 2GB RAM and 1GB disk space minimum

### Development Environment
```bash
# Start development server with hot reload
./deploy.sh dev up
# OR
npm run docker:dev

# Access application
open http://localhost:3000
```

### Production Environment  
```bash
# Start production server
./deploy.sh prod up
# OR  
npm run docker:prod

# Access application
open http://localhost:3000
```

## Docker Architecture

### Multi-Stage Dockerfile
The main `Dockerfile` uses multi-stage builds for optimal image size and security:

1. **Base Stage**: Production dependencies only (smallest footprint)
2. **Development Stage**: All dependencies + development tools
3. **Test Stage**: Runs complete test suite during build
4. **Production Stage**: Optimized runtime with security hardening

### Images Created
- `radiocalico:latest` - Production-ready image (~150MB Alpine-based)
- Development images built on-demand with full toolchain

## Deployment Configurations

### Development (docker-compose.yml)
**Features:**
- Hot reload with volume mounting
- Full development dependencies
- Debug-friendly logging
- SQLite database persistence

**Container Services:**
- `radiocalico-dev`: Main development server
- `radiocalico-test`: Test execution (profile: test)

### Production (docker-compose.prod.yml)
**Features:**
- Optimized production build
- Resource limits and health checks
- Nginx reverse proxy option
- Monitoring with node-exporter
- Persistent data volumes

**Container Services:**
- `radiocalico`: Main production server
- `nginx`: Reverse proxy with rate limiting (profile: nginx)
- `monitoring`: System metrics collection (profile: monitoring)

## Deployment Script Usage

The `deploy.sh` script provides comprehensive container management with environment separation:

```bash
# Development Environment
./deploy.sh dev up        # Start development environment (create if needed)
./deploy.sh dev start     # Start existing stopped containers
./deploy.sh dev stop      # Stop containers (keep them for restart)
./deploy.sh dev restart   # Restart containers
./deploy.sh dev down      # Remove containers and networks
./deploy.sh dev logs      # Show container logs
./deploy.sh dev build     # Build development image
./deploy.sh dev status    # Show container status

# Production Environment
./deploy.sh prod up       # Start production environment (create if needed)
./deploy.sh prod start    # Start existing stopped containers
./deploy.sh prod stop     # Stop containers (keep them for restart)
./deploy.sh prod restart  # Restart containers
./deploy.sh prod down     # Remove containers and networks
./deploy.sh prod logs     # Show container logs
./deploy.sh prod build    # Build production image
./deploy.sh prod status   # Show container status

# Global Commands (no environment needed)
./deploy.sh test          # Run tests in Docker
./deploy.sh clean         # Remove all containers and volumes
./deploy.sh health        # Check container health
./deploy.sh backup        # Backup database
./deploy.sh restore       # Restore database
```

## Package.json Scripts

Convenient npm scripts for Docker operations:

```bash
# Development Environment
npm run docker:dev              # Start development container
npm run docker:dev:start        # Start existing stopped dev containers
npm run docker:dev:stop         # Stop dev containers
npm run docker:dev:restart      # Restart dev containers
npm run docker:dev:down         # Remove dev containers
npm run docker:dev:logs         # Show dev logs
npm run docker:dev:build        # Build dev image

# Production Environment
npm run docker:prod             # Start production container
npm run docker:prod:start       # Start existing stopped prod containers
npm run docker:prod:stop        # Stop prod containers
npm run docker:prod:restart     # Restart prod containers
npm run docker:prod:down        # Remove prod containers
npm run docker:prod:logs        # Show prod logs
npm run docker:prod:build       # Build production image

# Global Operations
npm run docker:test             # Run tests in container
npm run docker:clean            # Clean all containers and volumes
npm run health                  # Local health check
npm run dev                     # Local development (nodemon)
npm run test                    # Local test execution
```

## Configuration & Environment Variables

### Environment Variables
- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 3000)
- `DATABASE_PATH`: SQLite database location (container: /app/data/users.db)
- `HEALTH_CHECK_TIMEOUT`: Health check timeout in ms (default: 5000)

### Volume Mounts
**Development:**
- Source code: `.:/app` (hot reload)
- Database: `radiocalico-dev-data:/app/data`

**Production:**
- Database: `radiocalico-data:/app/data`
- Logs: `radiocalico-logs:/app/logs`

## Health Checks & Monitoring

### Built-in Health Checks
All containers include comprehensive health monitoring:
- HTTP endpoint responsiveness
- Database accessibility
- Memory usage monitoring  
- Process uptime tracking

### Health Check Script
```bash
# Manual health check
npm run health
# OR
node healthcheck.js

# Container health status
docker inspect --format='{{.State.Health.Status}}' radiocalico-prod
```

### Monitoring Stack (Optional)
Enable with `--profile monitoring`:
```bash
docker-compose -f docker-compose.prod.yml --profile monitoring up -d
```

Includes:
- Node Exporter for system metrics (port 9100)
- Container resource monitoring
- Health status reporting

## Production Deployment

### Basic Production Setup
```bash
# 1. Build and start production environment
./deploy.sh prod build
./deploy.sh prod up

# 2. Verify health
./deploy.sh health

# 3. View logs
./deploy.sh prod logs
```

### Production with Nginx (Recommended)
```bash
# Start with reverse proxy and SSL termination
docker-compose -f docker-compose.prod.yml --profile nginx up -d

# Configure SSL certificates in ./ssl/ directory
# Edit nginx.conf for domain-specific settings
```

### Production Best Practices
1. **Security Hardening**
   - Non-root user execution
   - Read-only filesystem where possible
   - Resource limits enforced

2. **Data Persistence**
   - Named volumes for database
   - Regular automated backups
   - Volume backup strategies

3. **Monitoring & Logging**
   - Health check endpoints
   - Structured logging output
   - Resource usage monitoring

## Database Management

### Backup Operations
```bash
# Create backup
./deploy.sh backup /path/to/backup.db

# Automated backup with timestamp
./deploy.sh backup ./backup-$(date +%Y%m%d_%H%M%S).db
```

### Restore Operations
```bash
# Restore from backup
./deploy.sh restore /path/to/backup.db

# This will:
# 1. Stop the container
# 2. Replace database file
# 3. Restart container
```

### Database Migration
For SQLite database migrations between environments:
```bash
# Export from development
docker cp radiocalico-dev:/app/data/users.db ./dev-backup.db

# Import to production (will auto-detect container)
./deploy.sh restore ./dev-backup.db
```

## Troubleshooting

### Common Issues

**Container Won't Start:**
```bash
# Check logs for specific environment  
./deploy.sh dev logs     # Development
./deploy.sh prod logs    # Production

# Check container status
./deploy.sh dev status   # Development
./deploy.sh prod status  # Production

# Verify port availability
netstat -tulpn | grep :3000

# Check Docker resources
docker system df
```

**Database Issues:**
```bash
# Check database file permissions
./deploy.sh health

# Verify volume mounts
docker inspect radiocalico-prod | grep -A 10 "Mounts"
```

**Network Connectivity:**
```bash
# Test container networking
docker exec radiocalico-prod wget -qO- http://localhost:3000

# Check port mapping
docker port radiocalico-prod
```

### Performance Optimization

**Memory Usage:**
```bash
# Monitor container resources
docker stats radiocalico-prod

# Adjust memory limits in docker-compose.prod.yml
```

**Build Performance:**
```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker build -t radiocalico:latest .

# Multi-stage caching
docker build --target development -t radiocalico:dev .
```

## Security Considerations

### Container Security
- **Non-root user**: Application runs as `radiocalico` user (UID 1001)
- **Read-only root filesystem**: Where possible to prevent tampering
- **Resource limits**: Memory and CPU constraints enforced
- **Health checks**: Automatic restart on failures

### Network Security  
- **Rate limiting**: Nginx configuration includes API rate limits
- **Security headers**: OWASP security headers configured
- **HTTPS ready**: SSL/TLS configuration templates provided

### Data Security
- **Volume encryption**: Use encrypted Docker volumes in production
- **Backup encryption**: Encrypt database backups
- **Access controls**: Limit container access to necessary resources

## Scaling & High Availability

### Horizontal Scaling
```bash
# Scale production service
docker-compose -f docker-compose.prod.yml up -d --scale radiocalico=3

# Use nginx load balancing
# Configure upstream servers in nginx.conf
```

### Load Balancing
The included `nginx.conf` provides:
- Round-robin load balancing
- Health check integration
- Session persistence options
- SSL termination

### High Availability Setup
1. **Database**: Consider PostgreSQL for multi-instance deployments
2. **Load Balancer**: External load balancer (AWS ALB, nginx, HAProxy)
3. **Monitoring**: External monitoring stack (Prometheus, Grafana)
4. **Backup Strategy**: Automated backup to external storage

This Docker setup provides a complete, production-ready deployment solution for Radio Calico with comprehensive monitoring, security, and operational tooling.