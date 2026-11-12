// Server-side proxy: the Gemini key stays in the environment variable GEMINI_API_KEY (never in the browser).
const ALLOWED_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
const MAX_TOKENS_CAP = 1500;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  // Only accept calls coming from your own site (set ALLOWED_ORIGIN, e.g. https://deine-domain.de)
  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin || "";
  if (allowed && origin !== allowed) return res.status(403).json({ error: { message: "Forbidden" } });

  const model = String((req.query && req.query.model) || "");
  if (!ALLOWED_MODELS.includes(model)) return res.status(400).json({ error: { message: "Invalid model" } });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (!body.contents) return res.status(400).json({ error: { message: "Bad request" } });
  body.generationConfig = Object.assign({}, body.generationConfig, {
    maxOutputTokens: Math.min(Number(body.generationConfig && body.generationConfig.maxOutputTokens) || 400, MAX_TOKENS_CAP)
  });

  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY }, body: JSON.stringify(body) }
    );
    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: { message: "Upstream error" } });
  }
};
