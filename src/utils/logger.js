/**
 * Advanced Logger Utility
 * - Production: Silent (no console logs)
 * - Development: Full logging
 * - Secret Debug Mode: Activated with special code in console
 * - Remote Logging: Sends critical errors to backend
 */

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.isDebugMode = false;
    this.debugSecretCode = 'FJOR_DEBUG_2025'; // Secret code to activate debug mode
    this.sessionId = this.generateSessionId();
    
    // Listen for debug mode activation
    this.setupDebugMode();
  }

  generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setupDebugMode() {
    // Make debug activation available globally
    window.enableFjorDebug = (code) => {
      if (code === this.debugSecretCode) {
        this.isDebugMode = true;
        console.log('%c🔓 FJOR DEBUG MODE ENABLED', 'color: #00ff00; font-size: 20px; font-weight: bold;');
        console.log('%cSession ID:', 'color: #ffaa00', this.sessionId);
        console.log('%cYou can now see all internal logs.', 'color: #00aaff');
        return true;
      }
      return false;
    };

    window.disableFjorDebug = () => {
      this.isDebugMode = false;
      console.log('%c🔒 FJOR DEBUG MODE DISABLED', 'color: #ff0000; font-size: 16px;');
    };
  }

  shouldLog() {
    return this.isDevelopment || this.isDebugMode;
  }

  // Sanitize sensitive data before logging
  sanitize(data) {
    if (!data) return data;
    
    // Handle string data - check for JWT tokens or Bearer headers
    if (typeof data === 'string') {
      // Mask JWT tokens (eyJ... format)
      let sanitized = data.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, 'eyJ***[JWT_TOKEN_REDACTED]***');
      // Mask Bearer tokens
      sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_-]+/gi, 'Bearer ***[TOKEN_REDACTED]***');
      return sanitized;
    }
    
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'apiKey', 'apiSecret', 'secretKey', 'token', 'accessToken', 'refreshToken', 'authorization'];
    
    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (let key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          // Check if it's a JWT token
          if (typeof obj[key] === 'string' && obj[key].startsWith('eyJ')) {
            obj[key] = 'eyJ***[JWT_TOKEN_REDACTED]***';
          } else if (typeof obj[key] === 'string' && obj[key].toLowerCase().startsWith('bearer ')) {
            obj[key] = 'Bearer ***[TOKEN_REDACTED]***';
          } else {
            obj[key] = '***REDACTED***';
          }
        } else if (typeof obj[key] === 'string') {
          // Check string values for JWT tokens even if field name doesn't match
          obj[key] = obj[key].replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, 'eyJ***[JWT_TOKEN_REDACTED]***');
          obj[key] = obj[key].replace(/Bearer\s+[A-Za-z0-9_-]+/gi, 'Bearer ***[TOKEN_REDACTED]***');
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }

  // Send critical errors to backend
  async sendToBackend(level, message, data) {
    if (level !== 'error' && level !== 'critical') return;
    
    try {
      const logData = {
        level,
        message,
        data: this.sanitize(data),
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Send to backend logging endpoint
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/Logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      }).catch(() => {
        // Silently fail - don't break app if logging fails
      });
    } catch (error) {
      // Silently fail
    }
  }

  log(message, ...args) {
    if (this.shouldLog()) {
      console.log(message, ...args);
    }
  }

  info(message, data) {
    if (this.shouldLog()) {
      console.info(`ℹ️ ${message}`, data ? this.sanitize(data) : '');
    }
  }

  warn(message, data) {
    // Always show warnings (critical issues)
    console.warn(`⚠️ ${message}`, data ? this.sanitize(data) : '');
  }

  error(message, error, data) {
    // Always show errors (but sanitized)
    const sanitizedData = this.sanitize(data);
    const errorInfo = {
      message: error?.message || message,
      stack: this.isDevelopment || this.isDebugMode ? error?.stack : undefined,
      data: sanitizedData
    };

    console.error(`❌ ${message}`, errorInfo);
    
    // Send to backend
    this.sendToBackend('error', message, {
      error: error?.message,
      stack: error?.stack,
      data: sanitizedData
    });
  }

  critical(message, error, data) {
    // Critical errors - always show and send to backend
    const sanitizedData = this.sanitize(data);
    const errorInfo = {
      message: error?.message || message,
      stack: error?.stack,
      data: sanitizedData,
      sessionId: this.sessionId
    };

    console.error(`🚨 CRITICAL: ${message}`, errorInfo);
    
    // Send to backend immediately
    this.sendToBackend('critical', message, errorInfo);
  }

  debug(message, ...args) {
    if (this.shouldLog()) {
      console.debug(`🐛 ${message}`, ...args);
    }
  }

  table(data) {
    if (this.shouldLog()) {
      console.table(this.sanitize(data));
    }
  }

  group(label) {
    if (this.shouldLog()) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.shouldLog()) {
      console.groupEnd();
    }
  }

  time(label) {
    if (this.shouldLog()) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.shouldLog()) {
      console.timeEnd(label);
    }
  }

  // Performance monitoring
  performance(label, callback) {
    if (!this.shouldLog()) {
      return callback();
    }

    const start = performance.now();
    const result = callback();
    const end = performance.now();
    
    console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }

  // Network request logging
  networkRequest(method, url, data) {
    if (this.shouldLog()) {
      console.log(`🌐 ${method} ${url}`, this.sanitize(data));
    }
  }

  networkResponse(method, url, status, data) {
    if (this.shouldLog()) {
      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${emoji} ${method} ${url} - ${status}`, this.sanitize(data));
    }
  }
}

// Export singleton instance
const logger = new Logger();

export default logger;

// Helper for production error boundary
export const logProductionError = (error, errorInfo) => {
  logger.critical('React Error Boundary', error, errorInfo);
};

