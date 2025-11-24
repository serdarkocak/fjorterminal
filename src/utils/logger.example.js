/**
 * FJOR Logger Usage Examples
 * ============================
 * 
 * Bu dosya logger'ın nasıl kullanılacağını gösterir.
 * Production'da hassas veriler console'da GÖRÜNMEYECEKTİR!
 */

import logger from './logger';

// ============================================
// 1. NORMAL LOGGING (Development only)
// ============================================
logger.log('User logged in successfully');
logger.info('Fetching positions from backend');
logger.debug('WebSocket connection state:', { isConnected: true });

// ============================================
// 2. WARNING (Development only)
// ============================================
logger.warn('API rate limit approaching', { remaining: 10 });

// ============================================
// 3. ERROR LOGGING (Always shown, but sanitized)
// ============================================
try {
  throw new Error('Failed to fetch data');
} catch (error) {
  // Hata her zaman gösterilir ama hassas veriler temizlenir
  logger.error('API Error', error, {
    endpoint: '/api/positions',
    apiKey: 'secret123', // ❌ Bu ***REDACTED*** olarak gösterilir
    userId: 'user123' // ✅ Bu güvenli, gösterilir
  });
}

// ============================================
// 4. CRITICAL ERRORS (Always shown + sent to backend)
// ============================================
logger.critical('Database connection failed', new Error('Connection timeout'), {
  server: 'prod-db-01',
  password: 'admin123' // ❌ Bu ***REDACTED*** olarak gösterilir
});

// ============================================
// 5. NETWORK LOGGING (Development only)
// ============================================
logger.networkRequest('POST', '/api/orders', {
  symbol: 'BTCUSDT',
  apiSecret: 'very-secret' // ❌ Bu ***REDACTED*** olarak gösterilir
});

logger.networkResponse('POST', '/api/orders', 200, {
  orderId: '12345',
  token: 'jwt-token-here' // ❌ Bu ***REDACTED*** olarak gösterilir
});

// ============================================
// 6. PERFORMANCE MONITORING (Development only)
// ============================================
logger.performance('Fetch Positions', () => {
  // Uzun süren işlem
  return fetch('/api/positions');
});

// ============================================
// 7. GROUPED LOGGING (Development only)
// ============================================
logger.group('Trade Execution');
logger.log('Step 1: Validate order');
logger.log('Step 2: Check balance');
logger.log('Step 3: Place order');
logger.groupEnd();

// ============================================
// 8. TABLE LOGGING (Development only)
// ============================================
logger.table([
  { symbol: 'BTCUSDT', price: 50000, apiKey: 'secret' }, // apiKey → ***REDACTED***
  { symbol: 'ETHUSDT', price: 3000, token: 'jwt' } // token → ***REDACTED***
]);

// ============================================
// 9. ACTIVATION OF DEBUG MODE (User in console)
// ============================================
// Kullanıcı browser console'da şunu yazmalı:
// enableFjorDebug('FJOR_DEBUG_2025')
// 
// Sonra tüm loglar görünür olacak!
// Kapatmak için:
// disableFjorDebug()

// ============================================
// 10. REAL WORLD EXAMPLE
// ============================================
const authenticateUser = async (credentials) => {
  try {
    logger.info('Starting authentication');
    
    logger.performance('Auth Request', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const data = await response.json();
      
      // Hassas veri loglama - Production'da ***REDACTED*** olur
      logger.info('Auth successful', {
        userId: data.userId, // ✅ Güvenli
        token: data.token,   // ❌ ***REDACTED***
        refreshToken: data.refreshToken // ❌ ***REDACTED***
      });
      
      return data;
    });
  } catch (error) {
    // Hata her zaman gösterilir + backend'e gönderilir
    logger.error('Authentication error', error, {
      email: credentials.email, // ✅ Email güvenli
      password: credentials.password // ❌ ***REDACTED***
    });
  }
};

export { authenticateUser };



