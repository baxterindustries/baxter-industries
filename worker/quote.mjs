const MAX_BODY_BYTES = 16 * 1024;
const FIELD_LIMITS = { name: 160, phone: 64, email: 254, message: 8000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_ERROR = "We couldn't send your request right now.";
const CONFIG_ERROR = "Email service is not configured. Please call us instead.";

// Preserve current routing: only Tim receives quotes. A verified sender can be
// configured later without changing the shared quote implementation.
export function quoteEnvironment(env) {
  return {
    QUOTE_DELIVERY_MODE: env.QUOTE_DELIVERY_MODE,
    RESEND_API_KEY: env.RESEND_API_KEY,
    QUOTE_FROM_EMAIL: env.QUOTE_FROM_EMAIL ?? "Baxter Industries <onboarding@resend.dev>",
    QUOTE_TO_EMAILS: env.QUOTE_TO_EMAILS ?? "tbaxter941@gmail.com",
  };
}

function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security": "max-age=63072000",
      ...extraHeaders,
    },
  });
}

// Read with a byte limit even when the client omits Content-Length.
async function readBody(request) {
  if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES) {
    return { error: json({ error: "Request body is too large." }, 413) };
  }
  const reader = request.body?.getReader();
  if (!reader) return { error: json({ error: "Invalid request body." }, 400) };
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return { error: json({ error: "Request body is too large." }, 413) };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { data: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { error: json({ error: "Invalid request body." }, 400) };
  } finally {
    reader.releaseLock();
  }
}

export async function handleQuote(request, env, send = globalThis.fetch) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  }
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "Please send a JSON request." }, 415);
  }
  const result = await readBody(request);
  if (result.error) return result.error;
  const data = result.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return json({ error: "Invalid request body." }, 400);
  }

  const fields = {};
  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    if (data[field] === undefined) {
      return json({ error: "Please fill in every field." }, 400);
    }
    if (typeof data[field] !== "string") {
      return json({ error: "Invalid request body." }, 400);
    }
    fields[field] = data[field].trim();
    if (!fields[field]) return json({ error: "Please fill in every field." }, 400);
    if (fields[field].length > limit) {
      return json({ error: "One of the fields is too long." }, 400);
    }
  }
  if (!EMAIL_PATTERN.test(fields.email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  // Preview never constructs a provider request, sends email, or persists fields.
  if (env.QUOTE_DELIVERY_MODE === "preview") {
    return json({ ok: true, preview: true });
  }
  const recipients = (env.QUOTE_TO_EMAILS || "").split(",").map((email) => email.trim()).filter(Boolean);
  if (
    env.QUOTE_DELIVERY_MODE !== "live" ||
    !env.RESEND_API_KEY ||
    !env.QUOTE_FROM_EMAIL ||
    recipients.length === 0 ||
    recipients.some((email) => !EMAIL_PATTERN.test(email))
  ) {
    return json({ error: CONFIG_ERROR }, 503);
  }

  const { name, phone, email, message } = fields;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #042c53; line-height: 1.6;">
      <h2 style="color: #185fa5;">New quote request — Baxter Industries</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>What they need:</strong></p>
      <p style="background:#e6f1fb; padding:16px; border-radius:8px; white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;
  const text = `New quote request — Baxter Industries\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\n\nWhat they need:\n${message}\n`;
  try {
    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.QUOTE_FROM_EMAIL,
        to: recipients,
        reply_to: email,
        subject: `New quote request from ${name.replace(/[\r\n]/g, " ")}`,
        html,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const accepted = await response.json().catch(() => null);
    if (!response.ok || typeof accepted?.id !== "string" || !accepted.id) {
      return json({ error: SEND_ERROR }, 502);
    }
    return json({ ok: true });
  } catch {
    // Provider errors can contain contact details. Never log or return them.
    return json({ error: SEND_ERROR }, 502);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
