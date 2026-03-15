# 🤖 Telegram API Gate v1.1.0

Multi-Bot Telegram API Gateway — Proxy بين n8n وـ Telegram يدعم أكتر من بوت.

---

## 🚀 Deploy على Vercel (بدون CLI)

1. ارفع المجلد ده على **GitHub** (repo جديد)
2. روح [vercel.com](https://vercel.com) → **Add New Project** → اختار الـ repo
3. اضغط **Deploy** مباشرة (مش محتاج env variables)
4. بعد الـ deploy، اضبط الـ webhook لكل بوت:

```
https://YOUR-PROJECT.vercel.app/api/setwebhook?token=BOT_TOKEN&url=https://YOUR-PROJECT.vercel.app/api/webhook?token=BOT_TOKEN
```

---

## 📡 Endpoints

| Endpoint | الوصف |
|---|---|
| `POST /api/webhook?token=xxx&n8n_url=xxx` | استقبال من Telegram → n8n |
| `POST /api/telegram?method=sendMessage&token=xxx` | إرسال رسالة |
| `GET  /api/me?token=xxx` | معلومات البوت |
| `GET  /api/setwebhook?token=xxx&url=xxx` | ضبط الـ webhook |
| `GET  /api/webhookinfo?token=xxx` | حالة الـ webhook |
| `GET  /api/deletewebhook?token=xxx` | حذف الـ webhook |
| `GET  /api/file?file_id=xxx&token=xxx` | تحميل ملف |
| `POST /api/upload?method=sendDocument&chat_id=xxx&token=xxx` | رفع ملف |

---

## 🔑 تمرير الـ Token (3 طرق)

```
# Header (الأأمن)
x-bot-token: 123456789:AAxxxxxxxx

# Query
?token=123456789:AAxxxxxxxx

# Body JSON
{ "token": "123456789:AAxxxxxxxx", ... }
```

---

## 🔄 Multi-Bot في n8n

```
URL:    https://YOUR-PROJECT.vercel.app/api/telegram?method=sendMessage
Header: x-bot-token = YOUR_BOT_TOKEN
Body:   { "chat_id": "...", "text": "..." }
```

---

## 📁 Structure

```
telegram-gate/
├── api/
│   └── index.js      ← كل الـ logic هنا
├── vercel.json
└── package.json
```
"# telegram-gate" 
