# Baxter Industries — Landing Site

A one-page marketing site for Baxter Industries (property maintenance & remodeling, New Hampshire). Built with **Next.js (App Router) + TypeScript + plain CSS**. Deploys to Vercel with zero config.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up email (so the quote form works). Copy the example env file and add your Resend API key:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and set `RESEND_API_KEY` to a key from https://resend.com/api-keys.

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

> The site renders fine without a Resend key — only the quote form submission needs it.

## Quote form / email

- Form posts to `/api/quote`, which emails **both** `tbaxter941@gmail.com` and `brody@baxterindustries.org` via [Resend](https://resend.com).
- The API key is read from the `RESEND_API_KEY` environment variable (never hardcoded).
- By default emails are sent from Resend's shared `onboarding@resend.dev` address, which works without verifying a domain. For production, verify your own domain in Resend and change the `from:` address in `app/api/quote/route.ts`.

## Swap in real photos

Every image is a clearly labeled dashed placeholder box. To use real photos, replace each `<div className="placeholder ...">…</div>` in `app/page.tsx` with an `<img>` (or Next.js `<Image>`) pointing at your photo.

## Deploy to Vercel

1. Push this folder to a Git repo.
2. Import it at https://vercel.com/new.
3. Add the `RESEND_API_KEY` environment variable in the Vercel project settings.
4. Deploy.
