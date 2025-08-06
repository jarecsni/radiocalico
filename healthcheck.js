#!/usr/bin/env node

/**
 * Radio Calico Health Check Script
 * Comprehensive health check for the application
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  host: process.env.HEALTH_CHECK_HOST || 'localhost',
  port: process.env.PORT || 3000,
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  databasePath: process.env.DATABASE_PATH || 'users.db'
};

// Health check results
const healthStatus = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  checks: {
    server: { status: 'unknown', message: '' },
    database: { status: 'unknown', message: '' },
    memory: { status: 'unknown', message: '' },
    uptime: { status: 'unknown', message: '' }
  }
};

// Check server responsiveness
function checkServer() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: config.host,
      port: config.port,
      path: '/',
      method: 'GET',
      timeout: config.timeout
    }, (res) => {
      if (res.statusCode === 200) {
        healthStatus.checks.server = {
          status: 'healthy',
          message: `Server responding on port ${config.port}`
        };
      } else {
        healthStatus.checks.server = {
          status: 'unhealthy',
          message: `Server returned status code ${res.statusCode}`
        };
        healthStatus.status = 'unhealthy';
      }
      resolve();
    });

    req.on('error', (error) => {
      healthStatus.checks.server = {
        status: 'unhealthy',
        message: `Server connection failed: ${error.message}`
      };
      healthStatus.status = 'unhealthy';
      resolve();
    });

    req.on('timeout', () => {
      healthStatus.checks.server = {
        status: 'unhealthy',
        message: `Server timeout after ${config.timeout}ms`
      };
      healthStatus.status = 'unhealthy';
      req.destroy();
      resolve();
    });

    req.end();
  });
}

// Check database accessibility
function checkDatabase() {
  try {
    if (fs.existsSync(config.databasePath)) {
      const stats = fs.statSync(config.databasePath);
      healthStatus.checks.database = {
        status: 'healthy',
        message: `Database file accessible, size: ${Math.round(stats.size / 1024)}KB`
      };
    } else {
      healthStatus.checks.database = {
        status: 'warning',
        message: 'Database file does not exist yet (will be created on first use)'
      };
    }
  } catch (error) {
    healthStatus.checks.database = {
      status: 'unhealthy',
      message: `Database check failed: ${error.message}`
    };
    healthStatus.status = 'unhealthy';
  }
}

// Check memory usage
function checkMemory() {
  try {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Alert if memory usage is very high (>400MB RSS)
    if (memUsageMB.rss > 400) {
      healthStatus.checks.memory = {
        status: 'warning',
        message: `High memory usage: ${memUsageMB.rss}MB RSS`
      };
    } else {
      healthStatus.checks.memory = {
        status: 'healthy',
        message: `Memory usage: ${memUsageMB.rss}MB RSS, ${memUsageMB.heapUsed}MB heap`
      };
    }
  } catch (error) {
    healthStatus.checks.memory = {
      status: 'unhealthy',
      message: `Memory check failed: ${error.message}`
    };
    healthStatus.status = 'unhealthy';
  }
}

// Check uptime
function checkUptime() {
  try {
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    healthStatus.checks.uptime = {
      status: 'healthy',
      message: `Uptime: ${uptimeHours}h ${uptimeMinutes}m`
    };
  } catch (error) {
    healthStatus.checks.uptime = {
      status: 'unhealthy',
      message: `Uptime check failed: ${error.message}`
    };
    healthStatus.status = 'unhealthy';
  }
}

// Main health check function
async function performHealthCheck() {
  console.log('🏥 Radio Calico Health Check');
  console.log('============================');

  try {
    // Run all health checks
    await checkServer();
    checkDatabase();
    checkMemory();
    checkUptime();

    // Output results
    console.log(`Overall Status: ${healthStatus.status.toUpperCase()}`);
    console.log(`Timestamp: ${healthStatus.timestamp}`);
    console.log('');

    Object.entries(healthStatus.checks).forEach(([check, result]) => {
      const icon = result.status === 'healthy' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${check.toUpperCase()}: ${result.status}`);
      console.log(`   ${result.message}`);
    });

    // Return appropriate exit code
    if (healthStatus.status === 'unhealthy') {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

// Run health check if called directly
if (require.main === module) {
  performHealthCheck();
}

module.exports = { performHealthCheck, healthStatus };