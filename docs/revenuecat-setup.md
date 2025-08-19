# RevenueCat IAP Entegrasyonu Rehberi

Bu rehber, Aiku backend'ine RevenueCat IAP (In-App Purchase) entegrasyonunun nasıl kurulacağını açıklar.

## 1. RevenueCat Hesabı Oluşturma

1. [RevenueCat Dashboard](https://app.revenuecat.com/)'a gidin
2. Yeni bir proje oluşturun
3. iOS ve Android platformlarını ekleyin

## 2. Environment Değişkenleri

`.env` dosyanıza şu değişkenleri ekleyin:

```env
# RevenueCat Configuration
REVENUECAT_API_KEY=your_revenuecat_api_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here

# App Store Configuration
APP_STORE_ID=your_app_store_id_here
IOS_BUNDLE_ID=com.aiku.app
ANDROID_PACKAGE_NAME=com.aiku.app
```

## 3. RevenueCat Dashboard Konfigürasyonu

### 3.1 Product ID'leri Oluşturma

RevenueCat dashboard'da şu product ID'lerini oluşturun:

#### Startup Plan
- `startup_monthly` - Aylık Startup Plan
- `startup_yearly` - Yıllık Startup Plan

#### Business Plan
- `business_monthly` - Aylık Business Plan
- `business_yearly` - Yıllık Business Plan

#### Investor Plan
- `investor_monthly` - Aylık Investor Plan
- `investor_yearly` - Yıllık Investor Plan

### 3.2 Entitlement'ları Oluşturma

Her plan için ayrı entitlement oluşturun:
- `startup_access`
- `business_access`
- `investor_access`

### 3.3 Offering'leri Oluşturma

Her plan için offering oluşturun:
- `startup_offering`
- `business_offering`
- `investor_offering`

## 4. Webhook Konfigürasyonu

RevenueCat dashboard'da webhook URL'ini ayarlayın:

```
https://your-domain.com/api/revenuecat/webhook
```

Webhook secret'ını `.env` dosyasına ekleyin.

## 5. Apple App Store Konfigürasyonu

### 5.1 App Store Connect'te Product'ları Oluşturma

App Store Connect'te şu in-app purchase'ları oluşturun:

#### Startup Plan
- Product ID: `startup_monthly`
- Type: Auto-Renewable Subscription
- Price: $49/month
- Free Trial: 6 months

- Product ID: `startup_yearly`
- Type: Auto-Renewable Subscription
- Price: $529/year
- Free Trial: 6 months

#### Business Plan
- Product ID: `business_monthly`
- Type: Auto-Renewable Subscription
- Price: $75/month

- Product ID: `business_yearly`
- Type: Auto-Renewable Subscription
- Price: $810/year

#### Investor Plan
- Product ID: `investor_monthly`
- Type: Auto-Renewable Subscription
- Price: $99/month

- Product ID: `investor_yearly`
- Type: Auto-Renewable Subscription
- Price: $1069/year

### 5.2 Subscription Group Oluşturma

Tüm abonelikleri aynı subscription group'a ekleyin.

## 6. Google Play Store Konfigürasyonu

### 6.1 Play Console'da Product'ları Oluşturma

Play Console'da aynı product ID'leri ile in-app purchase'ları oluşturun.

## 7. Mobil Uygulama Entegrasyonu

### 7.1 iOS (Swift)

```swift
import RevenueCat

// RevenueCat'i başlat
Purchases.configure(withAPIKey: "your_api_key")

// Kullanıcı kimliğini ayarla
Purchases.shared.logIn(userId) { (customerInfo, error) in
    // Kullanıcı kimliği ayarlandı
}

// Abonelik planlarını al
Purchases.shared.getOfferings { (offerings, error) in
    if let offerings = offerings {
        // Planları göster
    }
}

// Satın alma işlemi
Purchases.shared.purchase(package: package) { (transaction, customerInfo, error, userCancelled) in
    if let customerInfo = customerInfo {
        // Satın alma başarılı
    }
}
```

### 7.2 Android (Kotlin)

```kotlin
import com.revenuecat.purchases.Purchases

// RevenueCat'i başlat
Purchases.configure(this, "your_api_key")

// Kullanıcı kimliğini ayarla
Purchases.sharedInstance.logIn(userId) { customerInfo, error ->
    // Kullanıcı kimliği ayarlandı
}

// Abonelik planlarını al
Purchases.sharedInstance.getOfferingsWith({ error ->
    // Hata durumu
}) { offerings ->
    // Planları göster
}

// Satın alma işlemi
Purchases.sharedInstance.purchasePackage(
    this,
    package,
    onError = { error ->
        // Hata durumu
    },
    onSuccess = { purchase, customerInfo ->
        // Satın alma başarılı
    }
)
```

## 8. API Endpoint'leri

### 8.1 Webhook Endpoint
```
POST /api/revenuecat/webhook
```

### 8.2 Abonelik Durumu Kontrolü
```
GET /api/revenuecat/subscription/:appUserId
```

### 8.3 Mobil Planları Alma
```
GET /api/revenuecat/plans
```

### 8.4 Ödeme Yöntemi Kontrolü
```
GET /api/revenuecat/payment-method
```

## 9. Test Etme

### 9.1 Sandbox Test
1. RevenueCat dashboard'da sandbox modunu aktif edin
2. Test kullanıcıları oluşturun
3. App Store Connect'te sandbox test kullanıcıları ekleyin

### 9.2 Webhook Test
RevenueCat dashboard'da webhook'ları test edin.

## 10. Production'a Geçiş

1. RevenueCat dashboard'da production modunu aktif edin
2. App Store Connect'te app'i review için gönderin
3. Google Play Console'da app'i yayınlayın
4. Webhook URL'ini production domain'e güncelleyin

## 11. Monitoring ve Analytics

RevenueCat dashboard'da şu metrikleri takip edin:
- Subscription conversion rate
- Churn rate
- Revenue metrics
- Platform distribution

## 12. Troubleshooting

### 12.1 Webhook Hataları
- Webhook URL'inin doğru olduğundan emin olun
- Webhook secret'ının doğru olduğundan emin olun
- SSL sertifikasının geçerli olduğundan emin olun

### 12.2 Satın Alma Hataları
- Product ID'lerinin doğru olduğundan emin olun
- App Store Connect'te product'ların onaylandığından emin olun
- Test kullanıcılarının doğru ayarlandığından emin olun

### 12.3 Kullanıcı Senkronizasyonu
- Kullanıcı kimliğinin doğru ayarlandığından emin olun
- Email mapping'inin doğru çalıştığından emin olun
