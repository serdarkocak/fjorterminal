# 🔐 FJOR Advanced Logger System

## 📖 Genel Bakış

Bu logger sistemi, **production ortamında kullanıcıların hassas verileri görmemesini** sağlarken, **geliştiricilerin debug yapabilmesini** mümkün kılar.

---

## ✨ Özellikler

### 1️⃣ **Environment-Based Logging**
- **Development:** Tüm loglar açık
- **Production:** Sadece ERROR ve CRITICAL loglar görünür

### 2️⃣ **Hassas Veri Koruması**
Aşağıdaki alanlar otomatik olarak `***REDACTED***` ile değiştirilir:
- `password`
- `apiKey`, `apiSecret`, `secretKey`
- `token`, `accessToken`, `refreshToken`

### 3️⃣ **Gizli Debug Modu**
Production'da bile, özel kod ile tüm logları açabilirsin!

```javascript
// Browser console'da:
enableFjorDebug('FJOR_DEBUG_2025')

// Logları kapatmak için:
disableFjorDebug()
```

### 4️⃣ **Remote Logging**
Kritik hatalar otomatik olarak backend'e gönderilir.

### 5️⃣ **Performance Monitoring**
Fonksiyon execution sürelerini ölç.

---

## 🚀 Kullanım

### Temel Import
```javascript
import logger from './utils/logger';
```

### 1. Normal Logging (Development Only)
```javascript
logger.log('User logged in successfully');
logger.info('Fetching positions');
logger.debug('Connection state:', { isConnected: true });
```

**Production'da:** ❌ Görünmez  
**Development'ta:** ✅ Görünür  
**Debug Mode'da:** ✅ Görünür

---

### 2. Error Logging (Always Shown)
```javascript
try {
  // Kod
} catch (error) {
  logger.error('API Error', error, {
    endpoint: '/api/positions',
    apiKey: 'secret123' // ❌ ***REDACTED***
  });
}
```

**Production'da:** ✅ Görünür (ama hassas veri gizli)  
**Development'ta:** ✅ Görünür (tam detay)

---

### 3. Critical Errors (Sent to Backend)
```javascript
logger.critical('Database connection failed', error, {
  server: 'prod-db-01',
  password: 'admin123' // ❌ ***REDACTED***
});
```

**Her zaman:**
- ✅ Console'da gösterilir
- ✅ Backend'e gönderilir
- ✅ Hassas veriler korunur

---

### 4. Network Logging
```javascript
logger.networkRequest('POST', '/api/orders', {
  symbol: 'BTCUSDT',
  apiSecret: 'very-secret' // ❌ ***REDACTED***
});

logger.networkResponse('POST', '/api/orders', 200, {
  orderId: '12345'
});
```

---

### 5. Performance Monitoring
```javascript
logger.performance('Fetch Positions', async () => {
  return await fetch('/api/positions');
});

// Console output: ⏱️ Fetch Positions: 245.32ms
```

---

## 🔓 Debug Mode Aktivasyonu

### Production'da Tüm Logları Görmek İçin:

1. **Browser Console Aç** (F12)
2. **Şu Komutu Yaz:**
   ```javascript
   enableFjorDebug('FJOR_DEBUG_2025')
   ```
3. **Başarılı mesaj:**
   ```
   🔓 FJOR DEBUG MODE ENABLED
   Session ID: 1730107200000_abc123xyz
   You can now see all internal logs.
   ```

4. **Artık tüm loglar görünür!**

### Debug Mode'u Kapatmak:
```javascript
disableFjorDebug()
```

---

## 🛡️ Güvenlik

### Otomatik Olarak Gizlenen Alanlar:
- `password`, `pass`, `pwd`
- `apiKey`, `api_key`, `key`
- `apiSecret`, `api_secret`, `secret`, `secretKey`
- `token`, `accessToken`, `access_token`
- `refreshToken`, `refresh_token`

### Örnek:
```javascript
logger.info('User data', {
  username: 'john_doe',     // ✅ Güvenli - gösterilir
  email: 'john@example.com', // ✅ Güvenli - gösterilir
  apiKey: 'sk-1234567890',   // ❌ Hassas - ***REDACTED***
  token: 'jwt-token-here'    // ❌ Hassas - ***REDACTED***
});

// Production Console Output:
// ℹ️ User data {
//   username: "john_doe",
//   email: "john@example.com",
//   apiKey: "***REDACTED***",
//   token: "***REDACTED***"
// }
```

---

## 📊 Backend Log Endpoint

Kritik hatalar otomatik olarak şu endpoint'e gönderilir:
```
POST /api/Logs
```

### Request Body:
```json
{
  "level": "critical",
  "message": "Database connection failed",
  "data": { "server": "prod-db-01" },
  "sessionId": "1730107200000_abc123xyz",
  "timestamp": "2025-10-28T10:00:00Z",
  "userAgent": "Mozilla/5.0...",
  "url": "https://app.fjor.com/dashboard"
}
```

### Backend'de Log Görüntüleme:
```csharp
// Backend console output:
🚨 CLIENT CRITICAL ERROR
Session: 1730107200000_abc123xyz
Message: Database connection failed
Data: { "server": "prod-db-01" }
UserAgent: Mozilla/5.0...
URL: https://app.fjor.com/dashboard
```

---

## 🔧 Environment Configuration

### `.env` Dosyası:
```bash
# Development
VITE_MODE=development
VITE_API_BASE_URL=http://localhost:5067

# Production
VITE_MODE=production
VITE_API_BASE_URL=https://api.fjor.com
```

Logger otomatik olarak `import.meta.env.MODE` değerini kontrol eder.

---

## 📝 Migration Rehberi

### Eski Kod:
```javascript
console.log('User logged in:', user);
console.error('API Error:', error);
```

### Yeni Kod:
```javascript
import logger from './utils/logger';

logger.info('User logged in', user);
logger.error('API Error', error);
```

---

## ❓ Sık Sorulan Sorular

### 1. Production'da hiç log görünmeyecek mi?
**Hayır.** Sadece ERROR ve CRITICAL loglar görünür. Ama hassas veriler korunur.

### 2. Debug mode şifresi nedir?
**`FJOR_DEBUG_2025`** - İstersen değiştirebilirsin (`src/utils/logger.js` dosyasında).

### 3. Backend'de loglar nerede saklanır?
Şu an sadece console'da gösteriliyor. İstersen bir log database'i ekleyebilirsin (MongoDB, Elasticsearch, etc).

### 4. Performance üzerinde etkisi var mı?
**Minimal.** Production'da sadece ERROR/CRITICAL loglar aktif, diğerleri hiç çalışmaz.

### 5. Hassas veri listesine nasıl ekleme yaparım?
`src/utils/logger.js` dosyasında `sensitiveFields` array'ini düzenle:
```javascript
const sensitiveFields = [
  'password', 'apiKey', 'token',
  'customSensitiveField' // Yeni alan ekle
];
```

---

## 🎯 Best Practices

### ✅ DO (Yapılması Gerekenler):
```javascript
// Detaylı error logging
logger.error('Trade execution failed', error, {
  symbol: 'BTCUSDT',
  quantity: 0.5,
  userId: user.id
});

// Performance monitoring
logger.performance('API Call', () => apiCall());

// Grouped logging
logger.group('Order Processing');
logger.info('Step 1: Validate');
logger.info('Step 2: Execute');
logger.groupEnd();
```

### ❌ DON'T (Yapılmaması Gerekenler):
```javascript
// ❌ Console.log kullanma
console.log('User data:', user);

// ❌ Hassas veriyi elle loglama
logger.log(`API Key: ${apiKey}`); // Kullanıcı görebilir!

// ❌ Try-catch olmadan error fırlatma
someFunction(); // Hata olursa yakalanamaz
```

---

## 📞 Destek

Sorularınız için:
- **Email:** support@fjor.com
- **Discord:** fjor-trading
- **GitHub Issues:** github.com/fjor/dashboard

---

## 🔄 Changelog

### v1.0.0 (2025-10-28)
- ✨ Initial release
- 🔐 Hassas veri koruması
- 🐛 Debug mode
- 📡 Remote logging
- ⏱️ Performance monitoring

---

**Happy (Secure) Logging! 🎉**



