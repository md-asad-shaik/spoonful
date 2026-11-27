import { NextResponse } from "next/server";
import { toContactInput, validateContact } from "@/lib/contact";

/**
 * POST /api/contact/ — replaces Contact Form 7.
 *
 * 1. Read the JSON body
 * 2. Validate it again on the server (the browser check can be bypassed)
 * 3. Silently accept spam (honeypot filled) without sending anything
 * 4. Send the email with Resend if RESEND_API_KEY is set, otherwise just log it
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const input = toContactInput(body);
  const errors = validateContact(input);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ message: "Please fix the highlighted fields.", errors }, { status: 400 });
  }

  // Bots fill the hidden "website" field. Pretend it worked so they don't retry.
  if (input.website) {
    return NextResponse.json({ ok: true });
  }

  const subject = input.subject || `New message from ${input.name}`;
  const text = `Name: ${input.name}\nEmail: ${input.email}\nSubject: ${subject}\n\n${input.message}`;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    // No email service configured (e.g. local development): log the message instead.
    console.log("[contact] RESEND_API_KEY / CONTACT_TO_EMAIL not set, message logged instead of emailed:\n" + text);
    return NextResponse.json({ ok: true });
  }

  // Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL || "Spoonful <onboarding@resend.dev>",
      to: [to],
      reply_to: input.email, // hitting "Reply" in your inbox answers the visitor
      subject: `[Spoonful] ${subject}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error("[contact] Resend error", res.status, await res.text());
    return NextResponse.json({ message: "Sorry, we couldn't send your message. Please try again later." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
