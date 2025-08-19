# Mobil IAP Geçiş Stratejisi

Bu doküman, mevcut web kullanıcılarının mobil IAP'ye geçiş stratejisini açıklar.

## Mevcut Durum

### Web Kullanıcıları
- **Ödeme Yöntemi**: Kredi kartı (ParamPos)
- **Abonelik Yönetimi**: Backend'de manuel
- **Yenileme**: Cron job ile otomatik
- **İptal**: Web panelinden

### Mobil Kullanıcıları (Yeni)
- **Ödeme Yöntemi**: IAP (Apple/Google)
- **Abonelik Yönetimi**: RevenueCat
- **Yenileme**: Platform otomatik
- **İptal**: Platform ayarlarından

## Geçiş Stratejisi

### 1. Platform Bazlı Ayrım

```typescript
// Kullanıcı tipine göre farklı davranış
if (user.paymentMethod === 'iap') {
  // Mobil kullanıcı - IAP kuralları
  // Web'e geçiş yasak
  // Sadece platform üzerinden iptal
} else {
  // Web kullanıcı - Kredi kartı kuralları
  // Mobile'a geçiş serbest
  // Web panelinden iptal
}
```

### 2. Kullanıcı Deneyimi

#### Web Kullanıcıları
- Mevcut deneyim aynen korunur
- Mobil uygulamaya geçiş seçeneği sunulur
- Geçiş sonrası IAP kuralları uygulanır

#### Mobil Kullanıcıları
- Sadece platform üzerinden işlem
- Web'e geçiş engellenir
- Apple/Google kurallarına uygun

### 3. Teknik Implementasyon

#### User Model Güncellemeleri
```typescript
paymentMethod: {
  type: String,
  enum: ['creditCard', 'bankTransfer', 'iap', 'other'],
  default: 'creditCard'
}

// Ödeme geçmişine platform bilgisi eklendi
paymentHistory: [{
  platform: String, // 'APP_STORE', 'PLAY_STORE', 'WEB'
  iapTransactionId: String
}]
```

#### API Endpoint'leri
```typescript
// Ödeme yöntemi kontrolü
GET /api/revenuecat/payment-method

// Platform bazlı abonelik değişikliği
POST /api/subscriptions/change-plan
Body: { plan, period, platform: 'web' | 'mobile' }
```

### 4. Geçiş Senaryoları

#### Senaryo 1: Web → Mobil
1. Kullanıcı mobil uygulamayı indirir
2. Mevcut hesabıyla giriş yapar
3. Abonelik planını seçer
4. IAP ile ödeme yapar
5. `paymentMethod` 'iap' olarak güncellenir
6. Artık sadece platform üzerinden işlem yapabilir

#### Senaryo 2: Mobil → Web (Engellenir)
1. IAP kullanıcısı web'de abonelik değiştirmeye çalışır
2. Sistem hata döner
3. Kullanıcıya mobil uygulamadan iptal etmesi söylenir

#### Senaryo 3: Yeni Mobil Kullanıcı
1. Kullanıcı mobil uygulamayı indirir
2. Yeni hesap oluşturur
3. IAP ile abonelik alır
4. `paymentMethod` 'iap' olarak ayarlanır

### 5. Veri Senkronizasyonu

#### RevenueCat Webhook'ları
```typescript
// Tüm IAP event'leri backend'e bildirilir
- INITIAL_PURCHASE
- RENEWAL
- CANCELLATION
- UNCANCELLATION
- EXPIRATION
- BILLING_ISSUE
- PRODUCT_CHANGE
```

#### Kullanıcı Eşleştirme
```typescript
// RevenueCat app_user_id ile backend user eşleştirme
1. Email ile eşleştirme (öncelikli)
2. Custom revenueCatId field ile eşleştirme
3. Yeni kullanıcı oluşturma (eşleşme yoksa)
```

### 6. Güvenlik ve Doğrulama

#### Webhook Güvenliği
```typescript
// RevenueCat webhook signature doğrulaması
const signature = req.headers['authorization'];
const expectedSignature = `Bearer ${revenueCatConfig.webhookSecret}`;

if (signature !== expectedSignature) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

#### Platform Kontrolü
```typescript
// IAP kullanıcılarının web işlemlerini engelleme
if (user.paymentMethod === 'iap' && platform === 'web') {
  return res.status(400).json({
    message: "IAP kullanıcıları web'e geçemez"
  });
}
```

### 7. Monitoring ve Analytics

#### Metrikler
- Platform dağılımı (Web vs Mobil)
- Geçiş oranları (Web → Mobil)
- IAP conversion rate
- Churn rate (platform bazlı)

#### Logging
```typescript
logger.info('Platform geçişi', {
  userId: user._id,
  fromPlatform: 'web',
  toPlatform: 'mobile',
  paymentMethod: 'iap'
});
```

### 8. Kullanıcı İletişimi

#### Web Kullanıcılarına
- Mobil uygulama tanıtımı
- Geçiş avantajları
- Platform kuralları açıklaması

#### Mobil Kullanıcılarına
- Platform üzerinden işlem yapma zorunluluğu
- Apple/Google kuralları
- İptal işlemleri için yönlendirme

### 9. Test Stratejisi

#### Sandbox Test
1. RevenueCat sandbox modu
2. App Store Connect sandbox kullanıcıları
3. Webhook test'leri
4. Platform geçiş test'leri

#### Production Test
1. Küçük kullanıcı grubu ile pilot
2. Aşamalı rollout
3. Monitoring ve hata takibi
4. Kullanıcı geri bildirimleri

### 10. Rollback Planı

#### Acil Durum
1. RevenueCat webhook'larını devre dışı bırakma
2. Platform geçişlerini engelleme
3. Mevcut web sistemine geri dönme
4. Kullanıcı bilgilendirmesi

#### Veri Tutarlılığı
1. IAP kullanıcılarının web'e geçişini engelleme
2. Mevcut aboneliklerin korunması
3. Ödeme geçmişinin saklanması
4. Kullanıcı deneyiminin bozulmaması
