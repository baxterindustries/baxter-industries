import { NextResponse } from "next/server";
import { Resend } from "resend";

// Temporarily sending only to tbaxter941@gmail.com.
// brody@baxterindustries.org removed for now — re-add when ready.
const TO_EMAILS = ["tbaxter941@gmail.com"];

export async function POST(request: Request) {
  let data: {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
  };

  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const name = data.name?.trim();
  const phone = data.phone?.trim();
  const email = data.email?.trim();
  const message = data.message?.trim();

  if (!name || !phone || !email || !message) {
    return NextResponse.json(
      { error: "Please fill in every field." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set.");
    return NextResponse.json(
      { error: "Email service is not configured. Please call us instead." },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  const html = `
    <div style="font-family: Arial, sans-serif; color: #042c53; line-height: 1.6;">
      <h2 style="color: #185fa5;">New quote request — Baxter Industries</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>What they need:</strong></p>
      <p style="background:#e6f1fb; padding:16px; border-radius:8px; white-space:pre-wrap;">${escapeHtml(
        message
      )}</p>
    </div>
  `;

  const text =
    `New quote request — Baxter Industries\n\n` +
    `Name: ${name}\n` +
    `Phone: ${phone}\n` +
    `Email: ${email}\n\n` +
    `What they need:\n${message}\n`;

  try {
    const { error } = await resend.emails.send({
      // Resend's shared onboarding sender works without domain verification.
      // Swap for an address on your verified domain in production.
      from: "Baxter Industries <onboarding@resend.dev>",
      to: TO_EMAILS,
      replyTo: email,
      subject: `New quote request from ${name}`,
      html,
      text,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "We couldn't send your request right now." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected error sending email:", err);
    return NextResponse.json(
      { error: "We couldn't send your request right now." },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
