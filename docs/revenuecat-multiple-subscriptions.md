# RevenueCat Birden Fazla Abonelik Desteği

## Sorun
RevenueCat'te mevcut bir abonelik varken başka bir abonelik alındığında `PRODUCT_CHANGE` eventi gönderiliyordu. Bu event mevcut aboneliği değiştiriyordu, ancak her aboneliğin ayrı kalması isteniyordu.

## Çözüm
RevenueCat sistemini güncelleyerek birden fazla abonelik desteği eklendi. Artık her yeni abonelik ayrı olarak kaydediliyor.

### Yapılan Değişiklikler

#### 1. User Model Güncellemesi
- `subscriptions` array'i eklendi
- Her abonelik için ayrı bilgiler tutuluyor:
  - plan (startup, business, investor)
  - period (monthly, yearly)
  - status (active, pending, trial, cancelled, expired)
  - startDate, endDate
  - amount, autoRenewal
  - paymentMethod
  - lastPaymentDate, nextPaymentDate
  - transactionId, revenueCatProductId
  - isActive

#### 2. RevenueCat Service Güncellemesi
- `handleInitialPurchase`: Yeni abonelik oluşturuyor
- `handleProductChange`: PRODUCT_CHANGE eventini yeni abonelik olarak işliyor
- `handleRenewal`: İlgili aboneliği bulup güncelliyor
- Her event için subscriptions array'ine yeni abonelik ekleniyor

#### 3. Test Endpoint'leri
- `/api/revenuecat/test-user-webhook?eventType=PRODUCT_CHANGE&productId=startup_monthly`
- `/api/revenuecat/test-user/:userId` - Kullanıcının tüm aboneliklerini gösterir

### Kullanım

#### Test Etmek İçin:
1. İlk abonelik al:
```bash
GET /api/revenuecat/test-user-webhook?eventType=INITIAL_PURCHASE&productId=startup_monthly
```

2. İkinci abonelik al (PRODUCT_CHANGE eventi):
```bash
GET /api/revenuecat/test-user-webhook?eventType=PRODUCT_CHANGE&productId=startup_monthly
```

3. Kullanıcının aboneliklerini kontrol et:
```bash
GET /api/revenuecat/test-user/:userId
```

### Sonuç
Artık her abonelik ayrı olarak kaydediliyor ve PRODUCT_CHANGE eventi mevcut aboneliği değiştirmek yerine yeni bir abonelik olarak işleniyor.

### Loglar
Sistem artık şu logları üretiyor:
- `IAP ilk satın alma başarıyla işlendi` - subscriptionCount ile
- `IAP PRODUCT_CHANGE eventi yeni abonelik olarak işlendi` - subscriptionCount ile
- `IAP abonelik yenileme başarıyla işlendi` - subscriptionCount ile
