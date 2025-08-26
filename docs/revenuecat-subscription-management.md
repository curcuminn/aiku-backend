# RevenueCat Abonelik Yönetimi API

## 📋 Genel Bakış

Bu dokümantasyon, RevenueCat entegrasyonu ile birden fazla abonelik yönetimi için geliştirilen API endpoint'lerini açıklar. Kullanıcılar birden fazla aboneliğe sahip olabilir ve her birini ayrı ayrı yönetebilir.

## 🔗 Base URL
```
https://api.aikuaiplatform.com/api/revenuecat
```

## 🔐 Authentication
Tüm endpoint'ler `Authorization: Bearer <token>` header'ı gerektirir.

---

## 📊 Abonelik Listeleme

### Kullanıcının Tüm Aboneliklerini Getir
```http
GET /subscriptions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "subscriptions": [
    {
      "_id": "68ad6eaae6de373daff501f7",
      "plan": "business",
      "period": "monthly",
      "status": "active",
      "startDate": "2025-08-25T13:23:53.000Z",
      "amount": 75,
      "autoRenewal": true,
      "paymentMethod": "iap",
      "lastPaymentDate": "2025-08-25T13:23:53.000Z",
      "nextPaymentDate": "2025-09-25T13:23:53.000Z",
      "transactionId": "2000000991766852",
      "revenueCatProductId": "business_monthly",
      "isActive": true
    }
  ],
  "subscriptionCount": 3,
  "activeSubscriptionCount": 3
}
```

---

## ❌ Abonelik İptal Etme

### Belirli Bir Aboneliği İptal Et
```http
DELETE /subscriptions/:subscriptionId
Authorization: Bearer <token>
```

**Örnek:**
```bash
DELETE /api/revenuecat/subscriptions/68ad6eaae6de373daff501f7
```

**Response:**
```json
{
  "success": true,
  "message": "Abonelik başarıyla iptal edildi",
  "cancelledSubscription": {
    "id": "68ad6eaae6de373daff501f7",
    "plan": "business",
    "period": "monthly",
    "status": "cancelled"
  },
  "remainingActiveCount": 2
}
```

### Tüm Abonelikleri İptal Et
```http
DELETE /subscriptions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Tüm abonelikler başarıyla iptal edildi",
  "cancelledCount": 3,
  "totalSubscriptions": 3
}
```

---

## 🔄 Auto-Renewal Yönetimi

### Auto-Renewal Toggle (Aç/Kapat)
```http
PATCH /subscriptions/:subscriptionId/renewal/toggle
Authorization: Bearer <token>
```

**Örnek:**
```bash
PATCH /api/revenuecat/subscriptions/68ad6eaae6de373daff501f7/renewal/toggle
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-renewal kapatıldı",
  "subscription": {
    "id": "68ad6eaae6de373daff501f7",
    "plan": "business",
    "period": "monthly",
    "autoRenewal": false,
    "status": "active"
  }
}
```

### Auto-Renewal Belirli Değere Ayarla
```http
PATCH /subscriptions/:subscriptionId/renewal
Authorization: Bearer <token>
Content-Type: application/json

{
  "autoRenewal": true
}
```

**Örnek:**
```bash
PATCH /api/revenuecat/subscriptions/68ad6eaae6de373daff501f7/renewal
Content-Type: application/json

{
  "autoRenewal": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-renewal kapatıldı",
  "subscription": {
    "id": "68ad6eaae6de373daff501f7",
    "plan": "business",
    "period": "monthly",
    "autoRenewal": false,
    "status": "active",
    "previousAutoRenewal": true
  }
}
```

---

## 📱 Mobil Uygulama Entegrasyonu

### JavaScript/React Native Örnekleri

#### Abonelikleri Listele
```javascript
const getSubscriptions = async () => {
  try {
    const response = await fetch('/api/revenuecat/subscriptions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.subscriptions;
  } catch (error) {
    console.error('Abonelikler alınamadı:', error);
  }
};
```

#### Abonelik İptal Et
```javascript
const cancelSubscription = async (subscriptionId) => {
  try {
    const response = await fetch(`/api/revenuecat/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    console.log(result.message);
    return result;
  } catch (error) {
    console.error('Abonelik iptal edilemedi:', error);
  }
};
```

#### Auto-Renewal Toggle
```javascript
const toggleRenewal = async (subscriptionId) => {
  try {
    const response = await fetch(`/api/revenuecat/subscriptions/${subscriptionId}/renewal/toggle`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    console.log(result.message);
    return result;
  } catch (error) {
    console.error('Auto-renewal değiştirilemedi:', error);
  }
};
```

#### Auto-Renewal Belirli Değere Ayarla
```javascript
const setRenewal = async (subscriptionId, autoRenewal) => {
  try {
    const response = await fetch(`/api/revenuecat/subscriptions/${subscriptionId}/renewal`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ autoRenewal })
    });
    const result = await response.json();
    console.log(result.message);
    return result;
  } catch (error) {
    console.error('Auto-renewal ayarlanamadı:', error);
  }
};
```

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Kullanıcı Birden Fazla Aboneliğe Sahip
```javascript
// Kullanıcının abonelikleri:
// 1. Business Monthly - Auto-renewal: ✅ Açık
// 2. Startup Monthly - Auto-renewal: ❌ Kapalı
// 3. Investor Yearly - Auto-renewal: ✅ Açık

// Startup Monthly'yi iptal et
await cancelSubscription('68ad6eeae6de373daff50298');

// Business Monthly'nin auto-renewal'ını kapat
await toggleRenewal('68ad6eaae6de373daff501f7');

// Investor Yearly'nin auto-renewal'ını açık tut
// (zaten açık, bir şey yapmaya gerek yok)
```

### Senaryo 2: Mobil Uygulama UI Örneği
```javascript
const SubscriptionCard = ({ subscription }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleRenewal = async () => {
    setIsLoading(true);
    try {
      await toggleRenewal(subscription._id);
      // UI'ı güncelle
    } catch (error) {
      // Hata mesajını göster
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('Bu aboneliği iptal etmek istediğinizden emin misiniz?')) {
      setIsLoading(true);
      try {
        await cancelSubscription(subscription._id);
        // UI'ı güncelle
      } catch (error) {
        // Hata mesajını göster
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {subscription.plan} {subscription.period}
      </Text>
      <Text style={styles.status}>
        Durum: {subscription.status === 'active' ? '✅ Aktif' : '❌ İptal'}
      </Text>
      <Text style={styles.renewal}>
        Auto-renewal: {subscription.autoRenewal ? '✅ Açık' : '❌ Kapalı'}
      </Text>
      <Text style={styles.price}>
        {subscription.amount} TL / {subscription.period === 'monthly' ? 'ay' : 'yıl'}
      </Text>
      
      <View style={styles.actions}>
        <Button 
          onPress={handleToggleRenewal}
          disabled={isLoading}
          title={subscription.autoRenewal ? 'Auto-renewal Kapat' : 'Auto-renewal Aç'}
        />
        <Button 
          onPress={handleCancel}
          disabled={isLoading || !subscription.isActive}
          title="Aboneliği İptal Et"
          color="red"
        />
      </View>
    </View>
  );
};
```

---

## ⚠️ Hata Kodları

| HTTP Kodu | Açıklama |
|-----------|----------|
| 400 | Geçersiz parametre veya istek |
| 401 | Authentication gerekli |
| 404 | Abonelik bulunamadı |
| 500 | Sunucu hatası |

### Hata Response Örneği
```json
{
  "success": false,
  "message": "Abonelik bulunamadı",
  "error": "Subscription not found"
}
```

---

## 🔧 Özellikler

### ✅ **Güvenlik**
- Tüm endpoint'ler authentication gerektirir
- Kullanıcılar sadece kendi aboneliklerini yönetebilir

### ✅ **Validasyon**
- İptal edilmiş aboneliklerin auto-renewal'ı değiştirilemez
- Boolean değer kontrolü
- Abonelik varlık kontrolü

### ✅ **Akıllı Güncelleme**
- Eğer değiştirilen abonelik aktif abonelikse, ana abonelik bilgileri de güncellenir
- Her değişiklik loglanır

### ✅ **Detaylı Response**
- Önceki ve yeni durum bilgisi
- Abonelik detayları
- Türkçe mesajlar

---

## 📝 Notlar

1. **Birden Fazla Abonelik:** Kullanıcılar aynı anda birden fazla aboneliğe sahip olabilir
2. **Ayrı Yönetim:** Her abonelik bağımsız olarak yönetilir
3. **Auto-Renewal:** Her abonelik kendi auto-renewal durumunu korur
4. **İptal Edilen Abonelikler:** İptal edilen abonelikler silinmez, sadece durumları değişir
5. **Ana Abonelik:** En son alınan aktif abonelik ana abonelik olarak işaretlenir

---

## 🚀 Test Endpoint'leri

### Test Kullanıcısı Bilgilerini Getir
```http
GET /test-user/:userId
```

### Test Webhook
```http
GET /test-user-webhook?eventType=INITIAL_PURCHASE&productId=startup_monthly
```

Bu endpoint'ler sadece geliştirme ortamında kullanılmalıdır.
