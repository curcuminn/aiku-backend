# OneSignal Push Notification Entegrasyonu

Bu dokümantasyon, AIKU backend'ine OneSignal push notification entegrasyonu için UI tarafında yapılması gerekenleri açıklar.

## 📋 Genel Bakış

Backend'de OneSignal push notification sistemi tamamen entegre edilmiştir. UI tarafında zaten mevcut olan OneSignal entegrasyonu ile backend arasındaki bağlantıyı tamamlamak için aşağıdaki adımları takip edin.

## 🔄 Mevcut UI Entegrasyonu

UI tarafında zaten aşağıdaki özellikler mevcuttur:

### ✅ Tamamlanan Özellikler
- OneSignal SDK entegrasyonu
- Akıllı permission prompt sistemi
- Kullanıcı ayarları yönetimi
- MMKV storage entegrasyonu
- Backend API entegrasyonu (`/api/notifications/push-settings`)
- Graceful degradation
- Platform-specific handling (iOS/Android)

### 🔧 Mevcut Konfigürasyon
```typescript
// OneSignal App ID
ONESIGNAL_APP_ID: 'd3df9869-a28b-4459-a042-58ce3b53cfcb'

// API Endpoints (zaten kullanılıyor)
GET /api/notifications/push-settings
PUT /api/notifications/push-settings
```

## 🔧 Eksik Entegrasyonlar

UI tarafında OneSignal entegrasyonu zaten mevcut, ancak backend ile tam entegrasyon için aşağıdaki eksik kısımları tamamlamanız gerekiyor:

### 1. Push Token Kaydetme (Eksik)

UI'da OneSignal Player ID alınıyor ancak backend'e push token kaydedilmiyor. Bu kısmı eklemeniz gerekiyor:

### 2. Mevcut OneSignal Konfigürasyonu (Zaten Mevcut)

UI'da zaten aşağıdaki konfigürasyon mevcut:

```typescript
// Dynamic import ile güvenli yükleme
let OneSignal: any = null;
try {
  const OneSignalModule = require('react-native-onesignal');
  OneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
} catch (_e) {
  OneSignal = null;
}

// Event handling (zaten mevcut)
- foregroundWillDisplay: Bildirim gösterilmeden önce kontrol
- click: Bildirime tıklandığında
- permissionChange: İzin değişikliklerinde
- display: Bildirim gösterildiğinde
```

## 🚀 Eksik API Entegrasyonları

### 1. Push Token Kaydetme (Eksik - Eklenmesi Gerekiyor)

UI'da OneSignal Player ID alınıyor ancak backend'e push token kaydedilmiyor. Bu kısmı eklemeniz gerekiyor:

```typescript
// src/services/notificationService.ts'e ekleyin
export const savePushToken = async (playerId: string, pushToken: string, platform: 'ios' | 'android', deviceId?: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.error('Token bulunamadı, push token kaydedilemedi');
      return false;
    }

    const response = await api.post('/notifications/push-tokens', {
      playerId,
      pushToken,
      platform,
      deviceId
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('Push token başarıyla kaydedildi');
      return true;
    } else {
      console.error('Push token kaydetme hatası:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('Push token kaydetme hatası:', error);
    return false;
  }
};

// Push token silme fonksiyonu
export const deletePushToken = async (playerId: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return false;

    const response = await api.delete('/notifications/push-tokens', {
      data: { playerId },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('Push token başarıyla silindi');
      return true;
    } else {
      console.error('Push token silme hatası:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('Push token silme hatası:', error);
    return false;
  }
};
```

### 2. Mevcut API Endpoint'leri (Zaten Kullanılıyor)

UI'da zaten aşağıdaki endpoint'ler kullanılıyor:

```typescript
// Zaten mevcut olan endpoint'ler
GET /api/notifications/push-settings    // Ayarları getir
PUT /api/notifications/push-settings    // Ayarları güncelle
```

### 3. Test Bildirimi Gönderme (Opsiyonel)

Geliştirme sırasında test bildirimi göndermek için:

```typescript
// src/services/notificationService.ts'e ekleyin
export const sendTestNotification = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return false;

    const response = await api.post('/notifications/test-push', {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('Test bildirimi gönderildi');
      return true;
    } else {
      console.error('Test bildirimi hatası:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('Test bildirimi hatası:', error);
    return false;
  }
};
```

## 📱 Mevcut UI Entegrasyonu ve Eksik Kısımlar

### ✅ Mevcut UI Yapısı

UI'da zaten aşağıdaki yapı mevcut:

```typescript
// src/services/push/oneSignal.ts (zaten mevcut)
- Dynamic import ile güvenli OneSignal yükleme
- Event handling (foregroundWillDisplay, click, permissionChange, display)
- Graceful degradation
- Platform-specific handling

// src/services/notificationService.ts (zaten mevcut)
- getPushSettings()
- updatePushSettings()
- checkNotificationSettings()

// src/components/PushPermissionPrompt.tsx (zaten mevcut)
- Akıllı permission prompt
- MMKV storage entegrasyonu
- Backend sync
```

### 🔧 Eksik Entegrasyon - Push Token Kaydetme

Mevcut UI'da OneSignal Player ID alınıyor ancak backend'e push token kaydedilmiyor. Bu kısmı eklemeniz gerekiyor:

```typescript
// src/services/push/oneSignal.ts'e ekleyin
import { savePushToken, deletePushToken } from '../notificationService';

// configureNotificationsAfterLogin fonksiyonuna ekleyin
export async function configureNotificationsAfterLogin() {
  if (!OneSignal) return;

  try {
    // Mevcut kod...
    
    // Push token'ı backend'e kaydet (YENİ EKLENECEK)
    const deviceState = await OneSignal.getDeviceState();
    if (deviceState && deviceState.userId) {
      const success = await savePushToken(
        deviceState.userId,
        deviceState.pushToken || deviceState.userId,
        Platform.OS,
        deviceState.userId
      );
      
      if (success) {
        console.log('Push token backend\'e kaydedildi');
      } else {
        console.error('Push token kaydedilemedi');
      }
    }
    
    // Mevcut kod devam eder...
  } catch (error) {
    console.error('Notification configuration error:', error);
  }
}

// Logout fonksiyonuna ekleyin
export async function cleanupNotificationsOnLogout() {
  if (!OneSignal) return;

  try {
    const deviceState = await OneSignal.getDeviceState();
    if (deviceState && deviceState.userId) {
      await deletePushToken(deviceState.userId);
      console.log('Push token backend\'den silindi');
    }
  } catch (error) {
    console.error('Push token silme hatası:', error);
  }
}
```

## 🔔 Backend Bildirim Türleri

Backend otomatik olarak aşağıdaki bildirimleri gönderir. UI'da bu bildirimleri handle etmek için mevcut event handler'ları kullanabilirsiniz:

### 1. Chat Bildirimleri
- **Tetikleyici**: Yeni mesaj geldiğinde
- **İçerik**: Gönderen adı + mesaj içeriği
- **Veri**: `{ type: 'chat', chatId: '...', senderName: '...' }`

### 2. Abonelik Bildirimleri
- **Trial Ending**: Deneme süresi dolduğunda
- **Payment Success**: Ödeme başarılı olduğunda
- **Payment Failed**: Ödeme başarısız olduğunda
- **Subscription Expired**: Abonelik süresi dolduğunda

### 📱 UI'da Bildirim Handling (Zaten Mevcut)

UI'da zaten aşağıdaki event handler'lar mevcut:

```typescript
// Mevcut event handling (src/services/push/oneSignal.ts)
OneSignal.setNotificationOpenedHandler(notification => {
  // Bildirim tıklandığında
  const data = notification.notification.additionalData;
  
  if (data.type === 'chat') {
    // Chat sayfasına yönlendir
    navigation.navigate('Chat', { chatId: data.chatId });
  } else if (data.type === 'subscription') {
    // Abonelik sayfasına yönlendir
    navigation.navigate('Subscription');
  }
});
```

## ⚙️ Konfigürasyon

### Environment Variables

Backend'de aşağıdaki environment variable'ları ayarlayın:

```env
# OneSignal Configuration
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key
```

### Mevcut UI Konfigürasyonu

UI'da zaten aşağıdaki konfigürasyon mevcut:

```typescript
// src/config/env.ts (zaten mevcut)
ONESIGNAL_APP_ID: 'd3df9869-a28b-4459-a042-58ce3b53cfcb'
```

### OneSignal Dashboard Ayarları

1. **OneSignal Dashboard**'a gidin
2. **App Settings** > **Keys & IDs** bölümünden:
   - **App ID**'yi kopyalayın (UI'da zaten kullanılıyor)
   - **REST API Key**'i backend için kopyalayın
3. **App Settings** > **Notification Settings**:
   - **Default Notification Icon** ayarlayın
   - **Default Notification Sound** ayarlayın

## 🧪 Test Etme

### 1. Push Token Kaydetme Testi
```typescript
// Login sonrası push token'ın kaydedildiğini kontrol edin
console.log('Push token kaydedildi mi?', await savePushToken(...));
```

### 2. Test Bildirimi Gönderme
```typescript
// Test bildirimi gönder
await sendTestNotification();
```

### 3. Chat Bildirimi Test Etme
1. İki farklı kullanıcı ile giriş yapın
2. Birinden diğerine mesaj gönderin
3. Alıcı kullanıcıya push bildirimi gelmelidir

### 4. Abonelik Bildirimi Test Etme
1. Test kullanıcısı oluşturun
2. Abonelik durumunu değiştirin
3. İlgili bildirimlerin geldiğini kontrol edin

### 5. Mevcut UI Test Fonksiyonu
```typescript
// Zaten mevcut olan test fonksiyonu
export async function testNotificationSettings(): Promise<{
  enabled: boolean;
  message: string;
}>
```

## 🐛 Sorun Giderme

### Yaygın Sorunlar

1. **Push token kaydedilmiyor**
   - `savePushToken` fonksiyonunun eklendiğini kontrol edin
   - Login sonrası `configureNotificationsAfterLogin` çağrıldığını kontrol edin
   - Backend API endpoint'inin çalıştığını kontrol edin

2. **Bildirim gelmiyor**
   - OneSignal App ID'nin doğru olduğunu kontrol edin
   - Push token'ın başarıyla kaydedildiğini kontrol edin
   - Cihazın internet bağlantısını kontrol edin

3. **Bildirim izni verilmedi**
   - Mevcut permission prompt sisteminin çalıştığını kontrol edin
   - Cihaz ayarlarından bildirim iznini kontrol edin

4. **Bildirim açılmıyor**
   - Mevcut `setNotificationOpenedHandler` fonksiyonunu kontrol edin
   - Bildirim verilerinin doğru formatlandığını kontrol edin

### Debug Logları

```typescript
// OneSignal debug loglarını açın (zaten mevcut)
OneSignal.setLogLevel(6, 0); // Tüm logları göster

// Backend loglarını kontrol edin
// Push token kaydetme/silme işlemlerini loglayın

// Mevcut UI debug fonksiyonu
export async function testNotificationSettings(): Promise<{
  enabled: boolean;
  message: string;
}>
```

## 📚 Ek Kaynaklar

- [OneSignal React Native SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [OneSignal React SDK](https://documentation.onesignal.com/docs/react-sdk-setup)
- [OneSignal REST API](https://documentation.onesignal.com/reference)

## 📋 Özet - Yapılması Gerekenler

### ✅ Zaten Mevcut Olanlar
- OneSignal SDK entegrasyonu
- Permission prompt sistemi
- Kullanıcı ayarları yönetimi
- MMKV storage entegrasyonu
- Event handling
- Graceful degradation

### 🔧 Eklenmesi Gerekenler
1. **Push Token Kaydetme**: `savePushToken` fonksiyonunu `notificationService.ts`'e ekleyin
2. **Push Token Silme**: `deletePushToken` fonksiyonunu `notificationService.ts`'e ekleyin
3. **Login Entegrasyonu**: `configureNotificationsAfterLogin` fonksiyonuna push token kaydetme ekleyin
4. **Logout Entegrasyonu**: `cleanupNotificationsOnLogout` fonksiyonunu ekleyin

### 🎯 Sonuç
UI'da OneSignal entegrasyonu %90 tamamlanmış durumda. Sadece push token'ların backend'e kaydedilmesi kısmı eksik. Bu kısmı tamamladıktan sonra sistem tamamen çalışır hale gelecek.

## 🔄 Güncellemeler

Bu dokümantasyon, backend'deki OneSignal entegrasyonu güncellemelerine göre güncellenecektir. En güncel bilgiler için backend ekibi ile iletişime geçin.
