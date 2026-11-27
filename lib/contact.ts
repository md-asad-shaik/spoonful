/**
 * Contact form validation, shared by the browser (instant feedback) and the
 * API route (the real check — never trust the browser).
 */

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot: hidden from humans. Bots fill every field, so a value here means spam. */
  website: string;
}

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads unknown input (e.g. a JSON body) safely into trimmed strings. */
export function toContactInput(data: unknown): ContactInput {
  const get = (key: string) => {
    const value = (data as Record<string, unknown> | null)?.[key];
    return typeof value === "string" ? value.trim() : "";
  };
  return {
    name: get("name"),
    email: get("email"),
    subject: get("subject"),
    message: get("message"),
    website: get("website"),
  };
}

export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};

  if (input.name.length < 2) errors.name = "Please enter your name.";
  else if (input.name.length > 80) errors.name = "Name must be 80 characters or fewer.";

  if (!EMAIL_PATTERN.test(input.email)) errors.email = "Please enter a valid email address.";
  else if (input.email.length > 200) errors.email = "Email is too long.";

  if (input.subject.length > 120) errors.subject = "Subject must be 120 characters or fewer.";

  if (input.message.length < 10) errors.message = "Message must be at least 10 characters.";
  else if (input.message.length > 5000) errors.message = "Message must be 5000 characters or fewer.";

  return errors;
}
