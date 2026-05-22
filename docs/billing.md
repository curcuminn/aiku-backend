# Fatura Bilgileri API Dokümantasyonu

Bu dokümantasyon, kullanıcıların abonelik ödemeleri için fatura bilgilerini yönetmelerini sağlayan API endpointlerini açıklamaktadır.

## Genel Bakış

Fatura bilgileri API'si, kullanıcıların bireysel veya kurumsal fatura bilgilerini eklemelerine, güncellemelerine, görüntülemelerine ve silmelerine olanak tanır. Her kullanıcı birden fazla fatura bilgisi ekleyebilir ve bunlardan birini varsayılan olarak ayarlayabilir.

## Endpoint URL

Tüm fatura bilgileri API'leri için temel URL: `https://api.aikuaihub.com/api/billing-info`

## Kimlik Doğrulama

Tüm API istekleri kimlik doğrulama gerektirir. API isteklerinde `Authorization` başlığında Bearer token gönderilmelidir.

```
Authorization: Bearer <token>
```

## Veri Modeli

### Fatura Bilgisi

Fatura bilgisi aşağıdaki alanları içerir:

#### Ortak Alanlar (Bireysel ve Kurumsal)

| Alan        | Tip      | Açıklama                                  |
|-------------|----------|-------------------------------------------|
| _id         | String   | Fatura bilgisi benzersiz ID               |
| user        | String   | Kullanıcı ID'si                           |
| billingType | String   | Fatura tipi ('individual' veya 'corporate') |
| address     | String   | Adres (Zorunlu)                           |
| city        | String   | Şehir (Zorunlu)                           |
| district    | String   | İlçe (Opsiyonel)                         |
| zipCode     | String   | Posta kodu (Opsiyonel)                    |
| phone       | String   | Telefon (Zorunlu)                         |
| email       | String   | Email (Zorunlu)                           |
| isDefault   | Boolean  | Varsayılan fatura bilgisi mi?             |

#### Bireysel Fatura Bilgileri (billingType = 'individual')

| Alan           | Tip    | Açıklama                               |
|----------------|--------|----------------------------------------|
| identityNumber | String | TC Kimlik Numarası (11 haneli, zorunlu) |
| firstName      | String | İsim (Zorunlu)                        |
| lastName       | String | Soyisim (Zorunlu)                     |

#### Kurumsal Fatura Bilgileri (billingType = 'corporate')

| Alan        | Tip    | Açıklama                             |
|-------------|--------|--------------------------------------|
| companyName | String | Firma Adı (Zorunlu)                 |
| taxNumber   | String | Vergi Numarası (Zorunlu)            |
| taxOffice   | String | Vergi Dairesi (Zorunlu)             |

## Endpointler

### 1. Fatura Bilgisi Oluşturma

Yeni bir fatura bilgisi ekler.

- **URL**: `/api/billing-info`
- **Metod**: `POST`
- **Yetkilendirme**: Gerekli

#### İstek Gövdesi

```json
{
  "billingType": "individual", // "individual" veya "corporate"
  
  // Bireysel fatura için
  "identityNumber": "12345678901", // TC Kimlik No (11 haneli, bireysel için zorunlu)
  "firstName": "Ali",             // Bireysel için zorunlu
  "lastName": "Yılmaz",           // Bireysel için zorunlu
  
  // Kurumsal fatura için
  "companyName": "ABC Şirketi",   // Kurumsal için zorunlu
  "taxNumber": "1234567890",      // Kurumsal için zorunlu
  "taxOffice": "İstanbul",        // Kurumsal için zorunlu
  
  // Ortak alanlar (zorunlu)
  "address": "Örnek Mahallesi, Örnek Sokak No:1",
  "city": "İstanbul",
  "district": "Kadıköy",         // Opsiyonel
  "zipCode": "34000",            // Opsiyonel
  "phone": "05001234567",
  "email": "ornek@email.com",
  "isDefault": true              // Opsiyonel, varsayılan: false
}
```

#### Başarılı Yanıt

```json
{
  "_id": "60d21b4667d0d8992e610c85",
  "user": "60d21b4667d0d8992e610c80",
  "billingType": "individual",
  "identityNumber": "12345678901",
  "firstName": "Ali",
  "lastName": "Yılmaz",
  "address": "Örnek Mahallesi, Örnek Sokak No:1",
  "city": "İstanbul",
  "district": "Kadıköy",
  "zipCode": "34000",
  "phone": "05001234567",
  "email": "ornek@email.com",
  "isDefault": true,
  "createdAt": "2023-06-22T12:00:00.000Z",
  "updatedAt": "2023-06-22T12:00:00.000Z"
}
```

#### Hata Yanıtları

- `400 Bad Request`: Eksik veya geçersiz parametreler
- `401 Unauthorized`: Yetkilendirme hatası
- `500 Internal Server Error`: Sunucu hatası

### 2. Tüm Fatura Bilgilerini Getirme

Kullanıcıya ait tüm fatura bilgilerini getirir.

- **URL**: `/api/billing-info`
- **Metod**: `GET`
- **Yetkilendirme**: Gerekli

#### Başarılı Yanıt

```json
[
  {
    "_id": "60d21b4667d0d8992e610c85",
    "user": "60d21b4667d0d8992e610c80",
    "billingType": "individual",
    "identityNumber": "12345678901",
    "firstName": "Ali",
    "lastName": "Yılmaz",
    "address": "Örnek Mahallesi, Örnek Sokak No:1",
    "city": "İstanbul",
    "district": "Kadıköy",
    "zipCode": "34000",
    "phone": "05001234567",
    "email": "ornek@email.com",
    "isDefault": true,
    "createdAt": "2023-06-22T12:00:00.000Z",
    "updatedAt": "2023-06-22T12:00:00.000Z"
  },
  {
    "_id": "60d21b4667d0d8992e610c86",
    "user": "60d21b4667d0d8992e610c80",
    "billingType": "corporate",
    "companyName": "ABC Şirketi",
    "taxNumber": "1234567890",
    "taxOffice": "İstanbul",
    "address": "Örnek Caddesi No:10",
    "city": "İstanbul",
    "district": "Beşiktaş",
    "zipCode": "34500",
    "phone": "02121234567",
    "email": "info@abc-sirketi.com",
    "isDefault": false,
    "createdAt": "2023-06-22T12:30:00.000Z",
    "updatedAt": "2023-06-22T12:30:00.000Z"
  }
]
```

#### Hata Yanıtları

- `401 Unauthorized`: Yetkilendirme hatası
- `500 Internal Server Error`: Sunucu hatası

### 3. Belirli Bir Fatura Bilgisini Getirme

ID'ye göre belirli bir fatura bilgisini getirir.

- **URL**: `/api/billing-info/:id`
- **Metod**: `GET`
- **Yetkilendirme**: Gerekli

#### Başarılı Yanıt

```json
{
  "_id": "60d21b4667d0d8992e610c85",
  "user": "60d21b4667d0d8992e610c80",
  "billingType": "individual",
  "identityNumber": "12345678901",
  "firstName": "Ali",
  "lastName": "Yılmaz",
  "address": "Örnek Mahallesi, Örnek Sokak No:1",
  "city": "İstanbul",
  "district": "Kadıköy",
  "zipCode": "34000",
  "phone": "05001234567",
  "email": "ornek@email.com",
  "isDefault": true,
  "createdAt": "2023-06-22T12:00:00.000Z",
  "updatedAt": "2023-06-22T12:00:00.000Z"
}
```

#### Hata Yanıtları

- `400 Bad Request`: Geçersiz ID
- `401 Unauthorized`: Yetkilendirme hatası
- `404 Not Found`: Fatura bilgisi bulunamadı
- `500 Internal Server Error`: Sunucu hatası

### 4. Varsayılan Fatura Bilgisini Getirme

Kullanıcının varsayılan fatura bilgisini getirir.

- **URL**: `/api/billing-info/default`
- **Metod**: `GET`
- **Yetkilendirme**: Gerekli

#### Başarılı Yanıt

```json
{
  "_id": "60d21b4667d0d8992e610c85",
  "user": "60d21b4667d0d8992e610c80",
  "billingType": "individual",
  "identityNumber": "12345678901",
  "firstName": "Ali",
  "lastName": "Yılmaz",
  "address": "Örnek Mahallesi, Örnek Sokak No:1",
  "city": "İstanbul",
  "district": "Kadıköy",
  "zipCode": "34000",
  "phone": "05001234567",
  "email": "ornek@email.com",
  "isDefault": true,
  "createdAt": "2023-06-22T12:00:00.000Z",
  "updatedAt": "2023-06-22T12:00:00.000Z"
}
```

#### Hata Yanıtları

- `401 Unauthorized`: Yetkilendirme hatası
- `404 Not Found`: Varsayılan fatura bilgisi bulunamadı
- `500 Internal Server Error`: Sunucu hatası

### 5. Fatura Bilgisini Güncelleme

Belirli bir fatura bilgisini günceller.

- **URL**: `/api/billing-info/:id`
- **Metod**: `PUT`
- **Yetkilendirme**: Gerekli

#### İstek Gövdesi

```json
{
  "address": "Yeni Adres Bilgisi",
  "phone": "05009876543",
  "isDefault": true
  // Diğer güncellenecek alanlar...
}
```

#### Başarılı Yanıt

```json
{
  "_id": "60d21b4667d0d8992e610c85",
  "user": "60d21b4667d0d8992e610c80",
  "billingType": "individual",
  "identityNumber": "12345678901",
  "firstName": "Ali",
  "lastName": "Yılmaz",
  "address": "Yeni Adres Bilgisi",
  "city": "İstanbul",
  "district": "Kadıköy",
  "zipCode": "34000",
  "phone": "05009876543",
  "email": "ornek@email.com",
  "isDefault": true,
  "createdAt": "2023-06-22T12:00:00.000Z",
  "updatedAt": "2023-06-22T13:00:00.000Z"
}
```

#### Hata Yanıtları

- `400 Bad Request`: Geçersiz ID veya geçersiz parametreler
- `401 Unauthorized`: Yetkilendirme hatası
- `404 Not Found`: Fatura bilgisi bulunamadı
- `500 Internal Server Error`: Sunucu hatası

### 6. Fatura Bilgisini Varsayılan Yapma

Belirli bir fatura bilgisini varsayılan olarak ayarlar.

- **URL**: `/api/billing-info/:id/set-default`
- **Metod**: `PUT`
- **Yetkilendirme**: Gerekli

#### Başarılı Yanıt

```json
{
  "message": "Fatura bilgisi varsayılan olarak ayarlandı",
  "billingInfo": {
    "_id": "60d21b4667d0d8992e610c86",
    "user": "60d21b4667d0d8992e610c80",
    "billingType": "corporate",
    "companyName": "ABC Şirketi",
    "taxNumber": "1234567890",
    "taxOffice": "İstanbul",
    "address": "Örnek Caddesi No:10",
    "city": "İstanbul",
    "district": "Beşiktaş",
    "zipCode": "34500",
    "phone": "02121234567",
    "email": "info@abc-sirketi.com",
    "isDefault": true,
    "createdAt": "2023-06-22T12:30:00.000Z",
    "updatedAt": "2023-06-22T14:00:00.000Z"
  }
}
```

#### Hata Yanıtları

- `400 Bad Request`: Geçersiz ID
- `401 Unauthorized`: Yetkilendirme hatası
- `404 Not Found`: Fatura bilgisi bulunamadı
- `500 Internal Server Error`: Sunucu hatası

### 7. Fatura Bilgisini Silme

Belirli bir fatura bilgisini siler.

- **URL**: `/api/billing-info/:id`
- **Metod**: `DELETE`
- **Yetkilendirme**: Gerekli

#### Başarılı Yanıt

```json
{
  "message": "Fatura bilgisi başarıyla silindi"
}
```

#### Hata Yanıtları

- `400 Bad Request`: Geçersiz ID
- `401 Unauthorized`: Yetkilendirme hatası
- `404 Not Found`: Fatura bilgisi bulunamadı
- `500 Internal Server Error`: Sunucu hatası

## Frontend Entegrasyonu Örneği

### 1. Yeni Fatura Bilgisi Ekleme

```javascript
// Fatura bilgisi formu örneği
const addBillingInfo = async (formData) => {
  try {
    const response = await fetch('https://api.aikuaihub.com/api/billing-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fatura bilgisi eklenirken bir hata oluştu');
    }
    
    const billingInfo = await response.json();
    console.log('Fatura bilgisi başarıyla eklendi:', billingInfo);
    
    return billingInfo;
  } catch (error) {
    console.error('Fatura bilgisi eklenirken hata:', error);
    throw error;
  }
};
```

### 2. Fatura Bilgilerini Listeleme

```javascript
// Kullanıcının tüm fatura bilgilerini getirme
const getBillingInfos = async () => {
  try {
    const response = await fetch('https://api.aikuaihub.com/api/billing-info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fatura bilgileri alınırken bir hata oluştu');
    }
    
    const billingInfos = await response.json();
    return billingInfos;
  } catch (error) {
    console.error('Fatura bilgileri alınırken hata:', error);
    throw error;
  }
};
```

### 3. Fatura Bilgisi Formu Örneği

```jsx
// React form örneği (basitleştirilmiş)
const BillingInfoForm = ({ onSubmit, initialData = {} }) => {
  const [billingType, setBillingType] = useState(initialData.billingType || 'individual');
  const [formData, setFormData] = useState(initialData);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Fatura tipi seçimi */}
      <div className="form-group">
        <label>Fatura Tipi:</label>
        <select 
          name="billingType" 
          value={billingType} 
          onChange={(e) => {
            setBillingType(e.target.value);
            handleChange(e);
          }}
        >
          <option value="individual">Bireysel</option>
          <option value="corporate">Kurumsal</option>
        </select>
      </div>
      
      {/* Bireysel için alanlar */}
      {billingType === 'individual' && (
        <>
          <div className="form-group">
            <label>TC Kimlik No:</label>
            <input 
              type="text" 
              name="identityNumber" 
              maxLength="11"
              value={formData.identityNumber || ''} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Ad:</label>
            <input 
              type="text" 
              name="firstName" 
              value={formData.firstName || ''} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Soyad:</label>
            <input 
              type="text" 
              name="lastName" 
              value={formData.lastName || ''} 
              onChange={handleChange} 
              required 
            />
          </div>
        </>
      )}
      
      {/* Kurumsal için alanlar */}
      {billingType === 'corporate' && (
        <>
          <div className="form-group">
            <label>Firma Adı:</label>
            <input 
              type="text" 
              name="companyName" 
              value={formData.companyName || ''} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Vergi No:</label>
            <input 
              type="text" 
              name="taxNumber" 
              value={formData.taxNumber || ''} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Vergi Dairesi:</label>
            <input 
              type="text" 
              name="taxOffice" 
              value={formData.taxOffice || ''} 
              onChange={handleChange} 
              required 
            />
          </div>
        </>
      )}
      
      {/* Ortak alanlar */}
      <div className="form-group">
        <label>Adres:</label>
        <textarea 
          name="address" 
          value={formData.address || ''} 
          onChange={handleChange} 
          required 
        />
      </div>
      <div className="form-group">
        <label>Şehir:</label>
        <input 
          type="text" 
          name="city" 
          value={formData.city || ''} 
          onChange={handleChange} 
          required 
        />
      </div>
      <div className="form-group">
        <label>İlçe:</label>
        <input 
          type="text" 
          name="district" 
          value={formData.district || ''} 
          onChange={handleChange} 
        />
      </div>
      <div className="form-group">
        <label>Posta Kodu:</label>
        <input 
          type="text" 
          name="zipCode" 
          value={formData.zipCode || ''} 
          onChange={handleChange} 
        />
      </div>
      <div className="form-group">
        <label>Telefon:</label>
        <input 
          type="tel" 
          name="phone" 
          value={formData.phone || ''} 
          onChange={handleChange} 
          required 
        />
      </div>
      <div className="form-group">
        <label>E-posta:</label>
        <input 
          type="email" 
          name="email" 
          value={formData.email || ''} 
          onChange={handleChange} 
          required 
        />
      </div>
      <div className="form-group">
        <label>
          <input 
            type="checkbox" 
            name="isDefault" 
            checked={formData.isDefault || false} 
            onChange={(e) => {
              setFormData({
                ...formData,
                isDefault: e.target.checked
              });
            }} 
          />
          Varsayılan fatura bilgisi olarak ayarla
        </label>
      </div>
      
      <button type="submit">Kaydet</button>
    </form>
  );
};
```

## Önemli Notlar

1. Bireysel fatura tipi için TC Kimlik No tam olarak 11 karakter olmalıdır.
2. Kurumsal fatura tipi için firma adı, vergi numarası ve vergi dairesi zorunludur.
3. Ortak alanlardan adres, şehir, telefon ve e-posta alanları zorunludur.
4. Bir kullanıcı birden fazla fatura bilgisi ekleyebilir ancak sadece bir tanesi varsayılan olabilir.
5. Varsayılan fatura bilgisi değiştirildiğinde, diğer varsayılan fatura bilgileri otomatik olarak varsayılan olmaktan çıkarılır.

## Hata Kodları ve Açıklamaları

| Kod | Açıklama                                              |
|-----|-------------------------------------------------------|
| 400 | Eksik veya geçersiz parametre                         |
| 401 | Yetkilendirme hatası (token eksik, geçersiz veya süresi dolmuş) |
| 404 | İstenen kaynak bulunamadı                            |
| 500 | Sunucu hatası                                        | 