# 🚀 Redis Kurulum Rehberi (WSL2 + Ubuntu)

## 📋 Adım Adım Redis Kurulumu

### 1️⃣ WSL Ubuntu'yu Başlat

Yeni bir PowerShell veya Terminal penceresi aç ve şunu çalıştır:

```bash
wsl
```

Ubuntu bash shell açılacak.

---

### 2️⃣ Sistem Güncellemesi

```bash
sudo apt update
sudo apt upgrade -y
```

---

### 3️⃣ Redis Server Kurulumu

```bash
sudo apt install redis-server -y
```

---

### 4️⃣ Redis Yapılandırması

Redis'i systemd ile yönetmek için yapılandırma dosyasını düzenle:

```bash
sudo nano /etc/redis/redis.conf
```

Dosyada şu satırı bul:
```
supervised no
```

Şununla değiştir:
```
supervised systemd
```

**Kaydetmek için:** `CTRL + X`, sonra `Y`, sonra `ENTER`

---

### 5️⃣ Redis'i Başlat

```bash
sudo service redis-server start
```

veya

```bash
sudo systemctl start redis-server
```

---

### 6️⃣ Redis Durumunu Kontrol Et

```bash
sudo service redis-server status
```

Çıktıda `active (running)` görmelisin.

---

### 7️⃣ Redis Bağlantı Testi

```bash
redis-cli ping
```

**Beklenen Yanıt:** `PONG`

---

### 8️⃣ Redis'i Otomatik Başlat (Opsiyonel)

WSL her açılışta Redis'in otomatik başlaması için:

```bash
sudo systemctl enable redis-server
```

---

### 9️⃣ Windows'tan Redis'e Bağlanma Testi

PowerShell'de:

```powershell
# WSL IP adresini al
wsl hostname -I
```

Çıktıdaki IP'yi not et (örn: `172.18.240.1`)

**Backend `appsettings.json`'da kullanılacak:**
```json
{
  "Redis": {
    "ConnectionString": "172.18.240.1:6379"
  }
}
```

---

## ✅ Başarı Kontrol Listesi

- [ ] `sudo apt update` çalıştı
- [ ] `sudo apt install redis-server -y` çalıştı
- [ ] `/etc/redis/redis.conf` düzenlendi (`supervised systemd`)
- [ ] `sudo service redis-server start` çalıştı
- [ ] `redis-cli ping` → `PONG` döndü
- [ ] WSL IP adresi alındı
- [ ] Backend'de connection string güncellendi

---

## 🔧 Faydalı Komutlar

### Redis'i Durdur
```bash
sudo service redis-server stop
```

### Redis'i Yeniden Başlat
```bash
sudo service redis-server restart
```

### Redis Logs
```bash
sudo tail -f /var/log/redis/redis-server.log
```

### Redis CLI Bağlan
```bash
redis-cli
```

### Tüm Keys Listele (CLI içinde)
```redis
KEYS *
```

### Cache Temizle (CLI içinde)
```redis
FLUSHALL
```

---

## 🐛 Sorun Giderme

### Problem: Redis başlamıyor
```bash
# Log dosyasını kontrol et
sudo tail -50 /var/log/redis/redis-server.log

# Config dosyasını test et
redis-server /etc/redis/redis.conf --test-memory 1
```

### Problem: Port 6379 kullanımda
```bash
# Port'u dinleyen process'i bul
sudo lsof -i :6379

# Gerekirse eski Redis'i öldür
sudo pkill redis-server
```

### Problem: Windows'tan bağlanamıyorum
```bash
# Redis'in tüm interface'lerde dinlediğinden emin ol
sudo nano /etc/redis/redis.conf

# Şu satırı bul:
# bind 127.0.0.1 ::1

# Şununla değiştir (veya yorum satırı yap):
bind 0.0.0.0
```

Sonra Redis'i yeniden başlat:
```bash
sudo service redis-server restart
```

---

## 🎉 Kurulum Tamamlandıktan Sonra

**Bu dosyayı tamamladıktan sonra bana şunu yaz:**

> "Redis hazır! IP: [WSL-IP-ADRESI]"

**Örnek:** "Redis hazır! IP: 172.18.240.1"

Sonra backend entegrasyonuna geçeceğiz! 🚀

