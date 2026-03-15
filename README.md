# 🤖 Telegram API Gate

**Multi-Bot Telegram API Gateway** — Proxy احترافي بين n8n وـ Telegram يدعم أكتر من بوت في نفس الوقت.

---

## 🚀 Deploy على Vercel

1. ارفع المجلد على **GitHub** (repo جديد)
2. روح [vercel.com](https://vercel.com) → **Add New Project** → اختار الـ repo
3. اضغط **Deploy** مباشرة ✅ (مش محتاج Environment Variables)

---

## ⚠️ أول خطوة بعد الـ Deploy — إعداد الـ Webhook (مش اختياري!)

> 🔴 **البوت مش هيشتغل ولا هيستقبل أي رسالة من غير ما تعمل الخطوة دي**
> لازم تعملها **مرة واحدة** لكل بوت بعد الـ Deploy مباشرة.

---

### الخطوة 1 — تأكد إن الـ Gateway شغال

افتح في المتصفح:
```
https://YOUR-PROJECT.vercel.app/api/me?token=BOT_TOKEN
```

✅ لو رجعلك اسم البوت → الـ Gateway شغال، كمّل
❌ لو رجعلك error → فيه مشكلة في الـ Deploy، راجعه الأول

---

### الخطوة 2 — اضبط الـ Webhook

افتح في المتصفح (غير `BOT_TOKEN` و `N8N_WEBHOOK_URL`):

```
https://YOUR-PROJECT.vercel.app/api/setwebhook?token=BOT_TOKEN&url=https://YOUR-PROJECT.vercel.app/api/webhook?token=BOT_TOKEN%26n8n_url=N8N_WEBHOOK_URL
```

✅ لو رجعلك:
```json
{ "ok": true, "description": "Webhook was set" }
```
يبقى اتضبط تمام ✅

---

### الخطوة 3 — تأكد من الـ Webhook

افتح في المتصفح:
```
https://YOUR-PROJECT.vercel.app/api/webhookinfo?token=BOT_TOKEN
```

المفروض تشوف الـ URL بتاع الـ Webhook في الـ result ✅

---

### لو عندك أكتر من بوت

كرر **الخطوة 2 و 3** لكل بوت بـ token مختلف — الـ Gateway نفسه بيخدم كل البوتات.

---

## 🔑 تمرير الـ Token (3 طرق)

في كل request، تقدر تبعت الـ token بـ 3 طرق:

| الطريقة | المثال |
|---|---|
| **Header** (الأأمن) | `x-bot-token: 123456789:AAxxxxxxxx` |
| **Query Param** | `?token=123456789:AAxxxxxxxx` |
| **Body JSON** | `{ "token": "123456789:AAxxxxxxxx" }` |

> ⚠️ الـ token بيتحذف تلقائياً من الـ body قبل ما يتبعت لـ Telegram

---

## 📡 كل الـ Endpoints

---

### 1️⃣ معلومات البوت

```
GET /api/me?token=BOT_TOKEN
```

**الرد:**
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "first_name": "MyBot",
    "username": "MyBot"
  }
}
```

---

### 2️⃣ إرسال رسالة نصية

```
POST /api/telegram?method=sendMessage&token=BOT_TOKEN
```

**الـ Body:**
```json
{
  "chat_id": "123456789",
  "text": "مرحبا!",
  "parse_mode": "HTML"
}
```

**إرسال مع أزرار (Inline Keyboard):**
```json
{
  "chat_id": "123456789",
  "text": "اختار:",
  "reply_markup": {
    "inline_keyboard": [[
      { "text": "زر 1", "callback_data": "btn1" },
      { "text": "زر 2", "callback_data": "btn2" }
    ]]
  }
}
```

---

### 3️⃣ إرسال صورة

```
POST /api/telegram?method=sendPhoto&token=BOT_TOKEN
```

**الـ Body:**
```json
{
  "chat_id": "123456789",
  "photo": "https://example.com/photo.jpg",
  "caption": "وصف الصورة"
}
```

---

### 4️⃣ إرسال فيديو

```
POST /api/telegram?method=sendVideo&token=BOT_TOKEN
```

**الـ Body:**
```json
{
  "chat_id": "123456789",
  "video": "https://example.com/video.mp4",
  "caption": "وصف الفيديو"
}
```

---

### 5️⃣ إرسال صوت / ملف صوتي

#### Audio (ملف موسيقى):
```
POST /api/telegram?method=sendAudio&token=BOT_TOKEN
```
```json
{
  "chat_id": "123456789",
  "audio": "https://example.com/audio.mp3",
  "caption": "اسم الأغنية"
}
```

#### Voice (رسالة صوتية):
```
POST /api/telegram?method=sendVoice&token=BOT_TOKEN
```
```json
{
  "chat_id": "123456789",
  "voice": "https://example.com/voice.ogg"
}
```

---

### 6️⃣ إرسال مستند / ملف

```
POST /api/telegram?method=sendDocument&token=BOT_TOKEN
```

**الـ Body:**
```json
{
  "chat_id": "123456789",
  "document": "https://example.com/file.pdf",
  "caption": "اسم الملف"
}
```

---

### 7️⃣ تحميل ملف من Telegram ⬇️

لما المستخدم يبعتلك ملف (صورة، فيديو، صوت، مستند)، Telegram بيديك `file_id` — استخدمه هنا تحمّل الملف الفعلي.

```
GET /api/file?file_id=FILE_ID&token=BOT_TOKEN
```

**يرجع:** الملف مباشرة كـ binary

**كيف تجيب الـ file_id من كل نوع؟**

| نوع الملف | الـ field |
|---|---|
| 🖼️ صورة | `message.photo[-1].file_id` |
| 🎥 فيديو | `message.video.file_id` |
| 🎵 صوت (audio) | `message.audio.file_id` |
| 🎤 رسالة صوتية (voice) | `message.voice.file_id` |
| 📄 مستند / ملف | `message.document.file_id` |
| 🎞️ GIF | `message.animation.file_id` |
| 🎭 ملصق (sticker) | `message.sticker.file_id` |

**مثال في n8n:**
```
Method: GET
URL: https://YOUR-GATE.vercel.app/api/file
Query:
  file_id = {{ $json.body.message.voice.file_id }}
  token   = BOT_TOKEN
```

---

### 8️⃣ رفع ملف Binary لـ Telegram ⬆️

لو عندك ملف Binary (مش رابط) وعايز ترفعه للبوت مباشرة.

```
POST /api/upload?method=METHOD&chat_id=CHAT_ID&token=BOT_TOKEN&filename=FILENAME&mimetype=MIMETYPE
```

**الـ Body:** الـ binary data للملف مباشرة

**أنواع الـ method:**

| method | نوع الملف | mimetype |
|---|---|---|
| `sendDocument` | أي ملف | `application/octet-stream` |
| `sendPhoto` | صورة | `image/jpeg` أو `image/png` |
| `sendVideo` | فيديو | `video/mp4` |
| `sendAudio` | صوت | `audio/mpeg` |
| `sendVoice` | رسالة صوتية | `audio/ogg` |
| `sendAnimation` | GIF | `image/gif` |
| `sendSticker` | ملصق | `image/webp` |

**مثال — رفع PDF:**
```
POST /api/upload?method=sendDocument&chat_id=123456789&token=BOT_TOKEN&filename=report.pdf&mimetype=application/pdf
Body: [binary PDF data]
```

**مثال في n8n:**
```
Method: POST
URL: https://YOUR-GATE.vercel.app/api/upload
Query:
  method   = sendDocument
  chat_id  = 123456789
  token    = BOT_TOKEN
  filename = report.pdf
  mimetype = application/pdf
Body: [binary data من node سابق]
```

---

### 9️⃣ Webhook — استقبال الرسائل من Telegram

#### ضبط الـ Webhook:
```
GET /api/setwebhook?token=BOT_TOKEN&url=https://YOUR-GATE.vercel.app/api/webhook?token=BOT_TOKEN%26n8n_url=N8N_WEBHOOK_URL
```

#### حالة الـ Webhook:
```
GET /api/webhookinfo?token=BOT_TOKEN
```

#### حذف الـ Webhook:
```
GET /api/deletewebhook?token=BOT_TOKEN
```

**الـ body اللي بيوصل لـ n8n:**
```json
{
  "update_id": 123456,
  "message": {
    "chat": { "id": 123456789 },
    "from": { "first_name": "Ali" },
    "text": "مرحبا"
  },
  "_bot_token": "BOT_TOKEN"
}
```

> الـ `_bot_token` بيتضاف تلقائياً عشان n8n يعرف الرسالة جت من أي بوت

---

### 🔟 Methods إضافية

#### تعديل رسالة:
```
POST /api/telegram?method=editMessageText&token=BOT_TOKEN
```
```json
{ "chat_id": "123", "message_id": 456, "text": "النص الجديد" }
```

#### حذف رسالة:
```
POST /api/telegram?method=deleteMessage&token=BOT_TOKEN
```
```json
{ "chat_id": "123", "message_id": 456 }
```

#### الرد على Callback Query (أزرار):
```
POST /api/telegram?method=answerCallbackQuery&token=BOT_TOKEN
```
```json
{ "callback_query_id": "xxx", "text": "تم!", "show_alert": false }
```

#### إرسال Chat Action (جار الكتابة...):
```
POST /api/telegram?method=sendChatAction&token=BOT_TOKEN
```
```json
{ "chat_id": "123", "action": "typing" }
```

---

## 🔄 Multi-Bot في n8n

كل بوت بيستخدم نفس الـ Gateway بس بـ token مختلف:

```
URL:    https://YOUR-GATE.vercel.app/api/telegram?method=sendMessage
Header: x-bot-token = BOT_TOKEN
Body:   { "chat_id": "...", "text": "..." }
```

---

## 🔀 Multi-n8n Routing

كل بوت يقدر يروح لـ n8n مختلف:

```
بوت 1 → /api/webhook?token=TOKEN1&n8n_url=https://n8n-1.com/webhook/xxx
بوت 2 → /api/webhook?token=TOKEN2&n8n_url=https://n8n-2.com/webhook/xxx
```

---

## 📁 Structure

```
telegram-gate/
├── api/
│   └── index.js      ← كل الـ logic هنا
├── vercel.json
├── package.json
└── README.md
```
