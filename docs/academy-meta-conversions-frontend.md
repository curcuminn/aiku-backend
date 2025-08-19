### Aloha Akademi – Meta Conversions API Frontend Entegrasyon Rehberi

Bu doküman, Akademi sohbet sayfasında Meta Conversions API (CAPI) için gerekli frontend tetiklerini nasıl göndereceğinizi anlatır. Backend uçları hazırdır ve Events Manager’daki veri setine (ID: 1389532595173830) gönderim yapılır.

---

### 1) Gereklilikler
- Backend en az şu sürümü içermelidir: `/api/meta/*` uçları mevcut.
- Uçlar:
  - POST `/api/meta/kvkk-consent` → KVKK onayı (popup “Anladım”)
  - POST `/api/meta/whatsapp-click` → WhatsApp/telefon CTA tıklaması
  - POST `/api/meta/event` → Generic (isteğe bağlı, test veya ek aşamalar)
- Backend, IP/UA’ı kendisi ekler; sizden beklenen mümkünse `_fbp`/`_fbc` cookie’leri ve opsiyonel `email/phone/leadId`’dir.

---

### 2) Yardımcı servis (TrackingService)
`src/api/TrackingService.ts` dosyası ekleyin.

```ts
import axiosInstance from "./axiosInstance";

const getCookie = (name: string) => {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : undefined;
};

export const sendKvkkConsent = (extra?: { email?: string; phone?: string; leadId?: string|number }) =>
  axiosInstance.post("/meta/kvkk-consent", {
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
    ...extra,
  });

export const sendWhatsappClick = (extra?: { email?: string; phone?: string; leadId?: string|number }) =>
  axiosInstance.post("/meta/whatsapp-click", {
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
    ...extra,
  });

export const sendGenericEvent = (eventName: string, extra?: Record<string, any>) =>
  axiosInstance.post("/meta/event", {
    eventName,
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
    ...extra,
  });
```

Notlar:
- `axiosInstance` zaten `/api` base’i kullanıyorsa path’ler doğrudan `/meta/...` olmalıdır.
- `email/phone` varsa E.164 formatında gönderin (örn. `+90555...`). Backend SHA‑256 ile hash’ler.

---

### 3) KVKK onayı tetiklemesi
`ChatPage` içindeki “Anladım” butonunun `onClick`’inde çağırın.

```diff
+ import { sendKvkkConsent } from "../../api/TrackingService";

- const handlePopupClose = () => {
-   if (checkboxChecked) setShowPopup(false);
- };
+ const handlePopupClose = async () => {
+   if (!checkboxChecked) return;
+   try { await sendKvkkConsent(); } finally { setShowPopup(false); }
+ };
```

---

### 4) WhatsApp/Telefon tıklaması tetiklemesi
Sohbet balonlarında dinamik linkler olduğundan event delegation önerilir.

```diff
// ChatComponent
+ import { sendWhatsappClick } from "../../api/TrackingService";

+ useEffect(() => {
+   const root = document.querySelector(".chat-component-container");
+   if (!root) return;
+   const onClick = async (e: any) => {
+     const a = (e.target && (e.target.closest?.("a") as HTMLAnchorElement)) || null;
+     if (!a) return;
+     const href = a.getAttribute("href") || "";
+     const isWa = href.includes("wa.me") || href.includes("whatsapp");
+     const isTel = href.startsWith("tel:") || href.includes("0850 757 9427");
+     if (isWa || isTel) {
+       e.preventDefault();
+       try { await sendWhatsappClick(); } finally {
+         const target = href || "tel:+908507579427";
+         window.open(target, "_blank");
+       }
+     }
+   };
+   root.addEventListener("click", onClick);
+   return () => root.removeEventListener("click", onClick);
+ }, []);
```

İpucu: Eğer metin içinde telefon numarasını plain text gösteriyorsanız, onu render aşamasında `tel:` linkine çevirin.

---

### 5) Sohbet başlangıcı
İlk mesajla yeni session oluştuğunda backend otomatik `AcademicChat_Started` event’i gönderir. Frontend’de ekstra işlem gerekmez.

---

### 6) Test Events (isteğe bağlı)
Events Manager’daki Test Events kodunuzu frontend’den şu şekilde yollayabilirsiniz:

```ts
import { sendGenericEvent } from "../../api/TrackingService";

await sendGenericEvent("Lead", { testEventCode: "<TEST_EVENT_CODE>" });
```

---

### 7) Hata ve retry
- Bu çağrılar kritik akışı engellememeli; `await` kullanıyorsanız `try/finally` ile kullanıcı aksiyonunu sürdürün.
- Ağ hatalarında kullanıcıya bildirim göstermek zorunlu değil; sessiz geçilebilir.

---

### 8) Özet payload’lar (frontend)
- KVKK: `{ fbp?, fbc?, email?, phone?, leadId? }`
- WhatsApp: `{ fbp?, fbc?, email?, phone?, leadId? }`
- Generic: `{ eventName, testEventCode?, fbp?, fbc?, ... }`

Backend tarafında bu veriler şu alanlara dönüştürülür: `action_source: system_generated`, `custom_data.event_source: crm`, `custom_data.lead_event_source: Aloha CRM`, `user_data.em/ph/lead_id/fbp/fbc/client_ip_address/client_user_agent`.

---

### 9) Sık Sorular
- Email/telefon yoksa yine gönderelim mi? Evet; `fbp/fbc + IP/UA` eşleştirme için yeterlidir.
- `wa.me` linkim yoksa? `tel:+90...` da ölçümlenir. Hem tetik gönderin hem yönlendirin.
- Çoklu gönderim olur mu? Backend idempotent değil; aynı aksiyon için tekrarı minimumda tutun (KVKK sadece bir kez, WhatsApp sadece tıklamada).


