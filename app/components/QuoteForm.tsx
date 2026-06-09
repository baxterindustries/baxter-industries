"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function QuoteForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong.");
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  }

  return (
    <form className="quote-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required autoComplete="name" />
      </div>

      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" required autoComplete="tel" />
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="message">What can we help with?</label>
        <textarea
          id="message"
          name="message"
          required
          placeholder="Tell us a bit about your project…"
        />
      </div>

      {status === "success" && (
        <div className="form-status success">
          🎉 Thanks! Your request is on its way — we&apos;ll get right back to
          you.
        </div>
      )}

      {status === "error" && (
        <div className="form-status error">
          😕 {errorMsg || "Couldn't send your request."} Please try again or
          call us.
        </div>
      )}

      <button
        type="submit"
        className="btn btn-orange btn-full"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Send my request"}
      </button>

      <a href="tel:6039296684" className="btn btn-green btn-full call-btn">
        📞 Call now: (603) 929-6684
      </a>
    </form>
  );
}
