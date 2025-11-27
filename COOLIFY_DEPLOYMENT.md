# Coolify Deployment Guide - FjorTerminal

Bu dokümantasyon, FjorTerminal projesini Coolify platformunda `coolify.fjorterminal.com` üzerinden `fjorterminal.com` domain'inde yayınlamak için gereken tüm adımları içerir.

## 📋 Gereksinimler

- Coolify kurulumlu VPS sunucu
- Domain: `fjorterminal.com` (ve `www.fjorterminal.com`)
- Coolify URL: `coolify.fjorterminal.com`
- Database: SQL Server (Coolify'da oluşturulacak)
- Redis: Redis instance (Coolify'da oluşturulacak)

## 🗄️ Veritabanı ve Servisler

Coolify'da şu servisleri oluşturun:

### 1. SQL Server Database
- **Service Type:** Database
- **Database Type:** Microsoft SQL Server
- **Database Name:** `FjorTerminalDb`
- **Username ve Password:** Güçlü bir şifre oluşturun

### 2. Redis Cache
- **Service Type:** Database
- **Database Type:** Redis
- **Version:** 7-alpine (veya en güncel)

## 🚀 Backend Deployment (FjorTerminal.API)

### Coolify Application Ayarları

1. **Yeni Application Oluştur:**
   - **Type:** Dockerfile
   - **Build Pack:** Dockerfile
   - **Dockerfile Path:** `FjorTerminal.Backend/Dockerfile`
   - **Port:** `8090` (Dockerfile'da tanımlı)

2. **Repository Bağlantısı:**
   - Repository URL'inizi bağlayın
   - Branch: `main` veya production branch

3. **Environment Variables (Backend):**

```env
# ASP.NET Core Environment
ASPNETCORE_ENVIRONMENT=Production

# ASP.NET Core URLs (Coolify tarafından otomatik ayarlanır, ama manuel de ekleyebilirsiniz)
ASPNETCORE_URLS=http://+:8090

# Database Connection String
# SQL Server service name'i Coolify'da otomatik olarak hostname olarak kullanılır
ConnectionStrings__DefaultConnection=Server={SQL_SERVER_SERVICE_NAME};Database=FjorTerminalDb;User Id={DB_USERNAME};Password={DB_PASSWORD};TrustServerCertificate=True;Connect Timeout=30;MultipleActiveResultSets=True;

# Redis Connection
Redis__ConnectionString={REDIS_SERVICE_NAME}:6379

# CORS - Production Domain
Cors__AllowedOrigins__0=https://fjorterminal.com
Cors__AllowedOrigins__1=https://www.fjorterminal.com

# JWT Settings
JwtSettings__SecretKey={GÜVENLİ_RANDOM_STRING_MIN_32_CHARACTER}
JwtSettings__Issuer=FjorTerminal
JwtSettings__Audience=FjorTerminal-API
JwtSettings__AccessTokenExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=30

# Email Settings (Gmail için örnek)
EmailSettings__SmtpHost=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SmtpUsername=fjorterminal@gmail.com
EmailSettings__SmtpPassword={GMAIL_APP_PASSWORD}
EmailSettings__FromEmail=fjorterminal@gmail.com
EmailSettings__FromName=Fjor Terminal

# Encryption Settings
EncryptionSettings__Key={GÜVENLİ_RANDOM_STRING_MIN_32_CHARACTER}
```

**Not:** `{SQL_SERVER_SERVICE_NAME}` ve `{REDIS_SERVICE_NAME}` değerlerini Coolify'da oluşturduğunuz servis isimleriyle değiştirin.

### Domain Ayarları (Backend)

1. **FQDN Ekle:**
   - Domain: `api.fjorterminal.com` (veya istediğiniz subdomain)
   - SSL: Otomatik Let's Encrypt

2. **Port Mapping:**
   - Container Port: `8090`
   - Public Port: `80/443` (Coolify otomatik yönetir)

## 🌐 Frontend Deployment

### Build Configuration

Frontend'i build edip static dosyalar olarak serve etmek için iki seçenek var:

#### Seçenek 1: Static Build (Önerilen)

1. **Build Script:**
   ```json
   {
     "scripts": {
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```

2. **Coolify Static Site:**
   - **Type:** Static Site
   - **Build Command:** `npm ci && npm run build`
   - **Output Directory:** `dist`

3. **Environment Variables (Frontend Build):**
   ```env
   VITE_API_BASE_URL=https://api.fjorterminal.com
   VITE_API_URL=https://api.fjorterminal.com
   ```

4. **Domain Ayarları:**
   - Domain: `fjorterminal.com` ve `www.fjorterminal.com`
   - SSL: Otomatik Let's Encrypt

#### Seçenek 2: Node.js Container

Eğer Vite preview server kullanmak isterseniz:

1. **Dockerfile Oluştur:**
   ```dockerfile
   FROM node:20-alpine AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   ENV VITE_API_BASE_URL=https://api.fjorterminal.com
   ENV VITE_API_URL=https://api.fjorterminal.com
   RUN npm run build

   FROM node:20-alpine
   WORKDIR /app
   COPY --from=build /app/dist ./dist
   COPY --from=build /app/package*.json ./
   RUN npm ci --only=production
   EXPOSE 4173
   CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
   ```

2. **Coolify Application:**
   - **Type:** Dockerfile
   - **Dockerfile Path:** `./Dockerfile` (root'ta)
   - **Port:** `4173`

## 🔐 Güvenlik Önerileri

### 1. JWT Secret Key Oluşturma
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 2. Encryption Key Oluşturma
```bash
# Linux/Mac
openssl rand -base64 64

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
```

### 3. Database Password
- Minimum 16 karakter
- Büyük/küçük harf, sayı ve özel karakter içermeli
- Coolify'ın generate password özelliğini kullanabilirsiniz

## 📝 Deployment Adımları

### 1. Repository Hazırlığı
- [ ] Tüm localhost URL'leri kaldırıldı
- [ ] Environment variable'lar eklendi
- [ ] Production ayarları yapıldı
- [ ] Değişiklikler commit edildi

### 2. Coolify'da Servisler
- [ ] SQL Server database oluşturuldu
- [ ] Redis instance oluşturuldu
- [ ] Database credentials not edildi

### 3. Backend Deployment
- [ ] Coolify'da yeni application oluşturuldu
- [ ] Repository bağlandı
- [ ] Environment variables eklendi
- [ ] Database connection test edildi
- [ ] Domain (api.fjorterminal.com) eklendi
- [ ] SSL sertifikası alındı
- [ ] Application deploy edildi

### 4. Frontend Deployment
- [ ] Frontend build test edildi
- [ ] Coolify'da static site veya container oluşturuldu
- [ ] Environment variables eklendi (build time)
- [ ] Domain (fjorterminal.com) eklendi
- [ ] SSL sertifikası alındı
- [ ] Frontend deploy edildi

### 5. Test
- [ ] Frontend açılıyor mu?
- [ ] API endpoints çalışıyor mu?
- [ ] Database bağlantısı çalışıyor mu?
- [ ] Redis cache çalışıyor mu?
- [ ] SignalR bağlantısı çalışıyor mu?
- [ ] Authentication çalışıyor mu?

## 🔄 Environment Variables Özeti

### Backend (Runtime)
```
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=...
Redis__ConnectionString=...
Cors__AllowedOrigins__0=https://fjorterminal.com
Cors__AllowedOrigins__1=https://www.fjorterminal.com
JwtSettings__SecretKey=...
EmailSettings__SmtpHost=...
EncryptionSettings__Key=...
```

### Frontend (Build Time)
```
VITE_API_BASE_URL=https://api.fjorterminal.com
VITE_API_URL=https://api.fjorterminal.com
```

## 🐛 Troubleshooting

### Backend başlamıyor
- Environment variables'ların doğru eklendiğinden emin olun
- Database connection string'i kontrol edin
- Logları kontrol edin: Coolify → Application → Logs

### Frontend API'ye bağlanamıyor
- CORS ayarlarını kontrol edin
- `VITE_API_BASE_URL` build time'da set edildiğinden emin olun
- Browser console'da hataları kontrol edin

### Database migrations çalışmıyor
- Connection string'i kontrol edin
- Database kullanıcısının yeterli yetkilere sahip olduğundan emin olun
- Application loglarını kontrol edin

## 📞 Destek

Sorun yaşarsanız:
1. Coolify application loglarını kontrol edin
2. Database ve Redis servislerinin çalıştığından emin olun
3. Environment variables'ların doğru olduğunu kontrol edin

