/**
 * ╔══════════════════════════════════════════════════════╗
 * ║         Telegram API Gate - Multi-Bot Proxy          ║
 * ║                      v1.1.0                          ║
 * ╚══════════════════════════════════════════════════════╝
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-bot-token, x-n8n-url");
  if (req.method === "OPTIONS") return res.status(200).end();

  const path = req.url.split("?")[0];

  // ── Helpers ────────────────────────────────────────────

  function resolveToken() {
    return (
      req.headers["x-bot-token"] ||
      req.query?.token ||
      req.body?.token ||
      process.env.TELEGRAM_TOKEN ||
      null
    );
  }

  function resolveN8nUrl() {
    return (
      req.headers["x-n8n-url"] ||
      req.query?.n8n_url ||
      req.body?.n8n_url ||
      process.env.N8N_WEBHOOK_URL ||
      null
    );
  }

  function missingToken() {
    return res.status(401).json({
      ok: false,
      error: "Bot token is required",
      hint: "Pass via Header (x-bot-token), Query (?token=), or Body ({ token: '' })",
    });
  }

  function makeSignal(ms = 9000) {
    if (typeof AbortSignal?.timeout === "function") return AbortSignal.timeout(ms);
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), ms);
    return ctrl.signal;
  }

  // ══════════════════════════════════════════════════════
  // POST /api/webhook — استقبال من Telegram → n8n
  // ══════════════════════════════════════════════════════
  if (path === "/api/webhook") {
    if (req.method !== "POST")
      return res.status(200).json({ status: "Webhook endpoint ready" });

    const token = resolveToken();
    if (!token) return missingToken();

    const n8nUrl = resolveN8nUrl();
    if (!n8nUrl)
      return res.status(500).json({ ok: false, error: "N8N_WEBHOOK_URL not configured" });

    const enrichedBody = { ...(req.body || {}), _bot_token: token };

    try {
      const n8nRes = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedBody),
        signal: makeSignal(9000),
      });
      console.log(`[webhook] n8n responded: ${n8nRes.status}`);
    } catch (err) {
      console.error("[webhook] forward failed:", err.message);
    }

    return res.status(200).json({ ok: true });
  }

  // ══════════════════════════════════════════════════════
  // POST /api/telegram?method=xxx — إرسال لـ Telegram
  // ══════════════════════════════════════════════════════
  if (path === "/api/telegram") {
    if (req.method !== "POST")
      return res.status(200).json({ status: "Telegram proxy endpoint ready" });

    const token = resolveToken();
    if (!token) return missingToken();

    const method = req.query?.method || "sendMessage";
    const { token: _t, n8n_url: _n, ...cleanBody } = req.body || {};

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanBody),
        signal: makeSignal(9000),
      });
      const tgData = await tgRes.json();
      return res.status(200).json(tgData);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ══════════════════════════════════════════════════════
  // GET /api/file?file_id=xxx — تحميل ملف من Telegram
  // ══════════════════════════════════════════════════════
  if (path === "/api/file") {
    if (req.method !== "GET")
      return res.status(405).json({ error: "Use GET" });

    const token = resolveToken();
    if (!token) return missingToken();

    const file_id = req.query?.file_id;
    if (!file_id) return res.status(400).json({ error: "file_id is required" });

    try {
      const getFileRes = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id }),
      });
      const getFileData = await getFileRes.json();

      if (!getFileData.ok)
        return res.status(400).json({ error: "Failed to get file path", details: getFileData });

      const file_path = getFileData.result.file_path;
      const fileRes   = await fetch(`https://api.telegram.org/file/bot${token}/${file_path}`);

      if (!fileRes.ok) return res.status(500).json({ error: "Failed to download file" });

      const mimeMap = {
        mp4:"video/mp4", mov:"video/quicktime", avi:"video/x-msvideo",
        mp3:"audio/mpeg", ogg:"audio/ogg", m4a:"audio/mp4", wav:"audio/wav",
        jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", gif:"image/gif", webp:"image/webp",
        pdf:"application/pdf", zip:"application/zip", json:"application/json",
      };
      const ext         = file_path.split(".").pop().toLowerCase();
      const contentType = mimeMap[ext] || fileRes.headers.get("content-type") || "application/octet-stream";
      const fileName    = file_path.split("/").pop();
      const buffer      = await fileRes.arrayBuffer();

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.send(Buffer.from(buffer));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ══════════════════════════════════════════════════════
  // POST /api/upload — رفع ملف Binary لـ Telegram
  // ══════════════════════════════════════════════════════
  if (path === "/api/upload") {
    if (req.method !== "POST")
      return res.status(200).json({ status: "Upload endpoint ready" });

    const token = resolveToken();
    if (!token) return missingToken();

    const method   = req.query?.method   || "sendDocument";
    const chat_id  = req.query?.chat_id;
    const caption  = req.query?.caption  || "";
    const filename = req.query?.filename || "file";
    const mimetype = req.query?.mimetype || "application/octet-stream";

    if (!chat_id) return res.status(400).json({ error: "chat_id is required" });

    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const fieldMap = {
        sendDocument:"document", sendPhoto:"photo", sendVideo:"video",
        sendAudio:"audio", sendVoice:"voice", sendAnimation:"animation", sendSticker:"sticker",
      };

      const formData = new FormData();
      formData.append("chat_id", chat_id);
      if (caption) formData.append("caption", caption);
      formData.append(fieldMap[method] || "document", new Blob([buffer], { type: mimetype }), filename);

      const tgRes  = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", body: formData });
      const tgData = await tgRes.json();
      return res.status(200).json(tgData);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ══════════════════════════════════════════════════════
  // Utility Endpoints
  // ══════════════════════════════════════════════════════
  if (path === "/api/me") {
    const token = resolveToken();
    if (!token) return missingToken();
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      return res.status(200).json(await r.json());
    } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
  }

  if (path === "/api/webhookinfo") {
    const token = resolveToken();
    if (!token) return missingToken();
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      return res.status(200).json(await r.json());
    } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
  }

  if (path === "/api/setwebhook") {
    const token = resolveToken();
    if (!token) return missingToken();
    const webhookUrl = req.query?.url;
    if (!webhookUrl) return res.status(400).json({ error: "url param is required" });
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      return res.status(200).json(await r.json());
    } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
  }

  if (path === "/api/deletewebhook") {
    const token = resolveToken();
    if (!token) return missingToken();
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      return res.status(200).json({ ok: true, telegram: await r.json() });
    } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
  }

  // ══════════════════════════════════════════════════════
  // Health Check
  // ══════════════════════════════════════════════════════
  return res.status(200).json({
    name     : "Telegram API Gate",
    version  : "1.1.0",
    status   : "Running ✅",
    multi_bot: true,
    endpoints: {
      webhook      : "POST   /api/webhook?token=xxx&n8n_url=xxx",
      setwebhook   : "GET    /api/setwebhook?token=xxx&url=xxx",
      webhookinfo  : "GET    /api/webhookinfo?token=xxx",
      deletewebhook: "GET    /api/deletewebhook?token=xxx",
      me           : "GET    /api/me?token=xxx",
      send         : "POST   /api/telegram?method=sendMessage&token=xxx",
      file         : "GET    /api/file?file_id=xxx&token=xxx",
      upload       : "POST   /api/upload?method=sendDocument&chat_id=xxx&token=xxx",
    },
  });
};
