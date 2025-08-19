# RevenueCat Dashboard Kurulum Rehberi

## 1. Hesap Oluşturma ve Proje Kurulumu

### 1.1 RevenueCat'e Kayıt Ol
1. [RevenueCat Dashboard](https://app.revenuecat.com/)'a git
2. "Sign Up" ile hesap oluştur
3. Email doğrulamasını tamamla

### 1.2 Yeni Proje Oluştur
1. Dashboard'da "Create New Project" tıkla
2. Proje adı: `Aiku AI Platform`
3. Platform seç: **iOS** ve **Android** (ikisini de seç)
4. "Create Project" tıkla

## 2. API Anahtarlarını Al

### 2.1 API Key Alma
1. Sol menüden **"API Keys"** seç
2. **"Public API Key"**'i kopyala
3. Bu key'i `.env` dosyasına ekle:
   ```env
   REVENUECAT_API_KEY=sk_xxxxx_xxxxx_xxxxx
   ```

### 2.2 Webhook Secret Alma
1. **"Webhooks"** sekmesine git
2. **"Add Webhook"** tıkla
3. URL: `https://your-domain.com/api/revenuecat/webhook`
4. **"Generate Secret"** tıkla
5. Secret'ı kopyala ve `.env`'e ekle:
   ```env
   REVENUECAT_WEBHOOK_SECRET=whsec_xxxxx_xxxxx
   ```

## 3. Product ID'leri Oluştur

### 3.1 Products Sekmesine Git
1. Sol menüden **"Products"** seç
2. **"Add Product"** tıkla

### 3.2 Startup Plan Product'ları
**Product 1:**
- Product ID: `startup_monthly`
- Type: **Auto-Renewable Subscription**
- Price: `$49.00`
- Currency: `USD`
- Billing Period: `1 month`

**Product 2:**
- Product ID: `startup_yearly`
- Type: **Auto-Renewable Subscription**
- Price: `$529.00`
- Currency: `USD`
- Billing Period: `1 year`

### 3.3 Business Plan Product'ları
**Product 3:**
- Product ID: `business_monthly`
- Type: **Auto-Renewable Subscription**
- Price: `$75.00`
- Currency: `USD`
- Billing Period: `1 month`

**Product 4:**
- Product ID: `business_yearly`
- Type: **Auto-Renewable Subscription**
- Price: `$810.00`
- Currency: `USD`
- Billing Period: `1 year`

### 3.4 Investor Plan Product'ları
**Product 5:**
- Product ID: `investor_monthly`
- Type: **Auto-Renewable Subscription**
- Price: `$99.00`
- Currency: `USD`
- Billing Period: `1 month`

**Product 6:**
- Product ID: `investor_yearly`
- Type: **Auto-Renewable Subscription**
- Price: `$1069.00`
- Currency: `USD`
- Billing Period: `1 year`

## 4. Entitlement'ları Oluştur

### 4.1 Entitlements Sekmesine Git
1. Sol menüden **"Entitlements"** seç
2. **"Add Entitlement"** tıkla

### 4.2 Entitlement'ları Ekle
**Entitlement 1:**
- Entitlement ID: `startup_access`
- Display Name: `Startup Access`
- Description: `Access to startup features`

**Entitlement 2:**
- Entitlement ID: `business_access`
- Display Name: `Business Access`
- Description: `Access to business features`

**Entitlement 3:**
- Entitlement ID: `investor_access`
- Display Name: `Investor Access`
- Description: `Access to investor features`

## 5. Offering'leri Oluştur

### 5.1 Offerings Sekmesine Git
1. Sol menüden **"Offerings"** seç
2. **"Add Offering"** tıkla

### 5.2 Startup Offering
**Offering 1:**
- Offering ID: `startup_offering`
- Display Name: `Startup Plans`
- Description: `Choose your startup plan`

**Packages ekle:**
1. **"Add Package"** tıkla
2. Package ID: `startup_monthly_package`
3. Product: `startup_monthly` seç
4. Entitlement: `startup_access` seç
5. Display Name: `Monthly Startup`

6. **"Add Package"** tıkla
7. Package ID: `startup_yearly_package`
8. Product: `startup_yearly` seç
9. Entitlement: `startup_access` seç
10. Display Name: `Yearly Startup`

### 5.3 Business Offering
**Offering 2:**
- Offering ID: `business_offering`
- Display Name: `Business Plans`
- Description: `Choose your business plan`

**Packages ekle:**
1. Package ID: `business_monthly_package`
2. Product: `business_monthly` seç
3. Entitlement: `business_access` seç
4. Display Name: `Monthly Business`

5. Package ID: `business_yearly_package`
6. Product: `business_yearly` seç
7. Entitlement: `business_access` seç
8. Display Name: `Yearly Business`

### 5.4 Investor Offering
**Offering 3:**
- Offering ID: `investor_offering`
- Display Name: `Investor Plans`
- Description: `Choose your investor plan`

**Packages ekle:**
1. Package ID: `investor_monthly_package`
2. Product: `investor_monthly` seç
3. Entitlement: `investor_access` seç
4. Display Name: `Monthly Investor`

5. Package ID: `investor_yearly_package`
6. Product: `investor_yearly` seç
7. Entitlement: `investor_access` seç
8. Display Name: `Yearly Investor`

## 6. Platform Konfigürasyonu

### 6.1 iOS Konfigürasyonu
1. **"Platforms"** sekmesine git
2. **iOS** seç
3. App Store Connect bilgilerini gir:
   - Bundle ID: `com.aiku.app`
   - App Store Connect API Key: (opsiyonel)

### 6.2 Android Konfigürasyonu
1. **Android** seç
2. Google Play Console bilgilerini gir:
   - Package Name: `com.aiku.app`
   - Service Account JSON: (opsiyonel)

## 7. Webhook Test Etme

### 7.1 Webhook Durumunu Kontrol Et
1. **"Webhooks"** sekmesine git
2. Webhook'un **"Active"** olduğunu kontrol et
3. **"Test Webhook"** butonuna tıkla
4. Test event'inin başarılı olduğunu kontrol et

### 7.2 Backend Loglarını Kontrol Et
Backend'de şu log'ları görmelisin:
```
RevenueCat webhook alındı
RevenueCat webhook başarıyla işlendi
```

## 8. Sandbox Test

### 8.1 Test Kullanıcısı Oluştur
1. **"Users"** sekmesine git
2. **"Add User"** tıkla
3. Test email'i gir: `test@aiku.com`
4. **"Create User"** tıkla

### 8.2 Test Satın Alma
1. Mobil uygulamada test kullanıcısıyla giriş yap
2. Abonelik planı seç
3. Sandbox ödeme yap
4. RevenueCat dashboard'da satın almayı kontrol et

## 9. Production'a Geçiş

### 9.1 App Store Connect
1. App Store Connect'te in-app purchase'ları oluştur
2. Aynı Product ID'leri kullan
3. App'i review için gönder

### 9.2 Google Play Console
1. Play Console'da in-app purchase'ları oluştur
2. Aynı Product ID'leri kullan
3. App'i yayınla

### 9.3 RevenueCat Production
1. RevenueCat dashboard'da **"Production"** modunu aktif et
2. Webhook URL'ini production domain'e güncelle
3. API key'leri production'da kullan

## 10. Monitoring

### 10.1 Dashboard Metrikleri
- **Revenue** sekmesi: Gelir takibi
- **Subscribers** sekmesi: Abone sayıları
- **Churn** sekmesi: İptal oranları
- **Events** sekmesi: Webhook event'leri

### 10.2 Alert'ler
1. **"Alerts"** sekmesine git
2. **"Add Alert"** tıkla
3. Webhook hataları için alert oluştur
4. Churn artışı için alert oluştur

## 11. Troubleshooting

### 11.1 Webhook Hataları
- Webhook URL'inin doğru olduğunu kontrol et
- SSL sertifikasının geçerli olduğunu kontrol et
- Backend loglarını kontrol et

### 11.2 Satın Alma Hataları
- Product ID'lerinin doğru olduğunu kontrol et
- App Store Connect'te product'ların onaylandığını kontrol et
- Test kullanıcılarının doğru ayarlandığını kontrol et

### 11.3 Kullanıcı Senkronizasyonu
- Email mapping'inin doğru çalıştığını kontrol et
- Backend'de kullanıcının bulunduğunu kontrol et
- RevenueCat app_user_id'nin doğru olduğunu kontrol et
