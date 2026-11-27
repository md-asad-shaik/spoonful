"use client";

import { useState, type FormEvent } from "react";
import { toContactInput, validateContact, type ContactErrors } from "@/lib/contact";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Replaces the Contact Form 7 form. It sends JSON to our own API route
 * (app/api/contact/route.ts), which validates again and sends the email.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [serverMessage, setServerMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = toContactInput(Object.fromEntries(new FormData(form)));

    // 1. Check in the browser first so the user gets instant feedback.
    const found = validateContact(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // 2. Send to the server.
    setStatus("sending");
    try {
      const res = await fetch("/api/contact/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? {});
        setServerMessage(data.message ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      form.reset();
      setStatus("sent");
    } catch {
      setServerMessage("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-2xl border border-basil/30 bg-basil/10 p-6">
        <p className="font-serif text-xl font-semibold text-basil">Thank you! Your message was sent.</p>
        <p className="mt-1 text-muted">We will reply within two working days.</p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-4 text-sm font-semibold text-tomato underline">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Your name" autoComplete="name" error={errors.name} />
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      </div>
      <Field name="subject" label="Subject (optional)" error={errors.subject} />
      <Field name="message" label="Message" multiline error={errors.message} />

      {/* Honeypot: hidden from people, but spam bots fill it in. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status === "error" && serverMessage && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {serverMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center gap-2 rounded-full bg-tomato px-6 py-3 font-semibold text-white hover:bg-tomato-dark disabled:opacity-60"
      >
        {status === "sending" && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
        )}
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
  error?: string;
}

function Field({ name, label, type = "text", autoComplete, multiline, error }: FieldProps) {
  const id = `contact-${name}`;
  const shared = {
    id,
    name,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    className: `w-full rounded-xl border bg-cream/40 px-4 py-3 ${error ? "border-red-500" : "border-line"}`,
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {multiline ? <textarea rows={6} {...shared} /> : <input type={type} {...shared} />}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
