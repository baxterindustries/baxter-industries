import { handleQuote, quoteEnvironment } from "../../../worker/quote.mjs";

// Preserve the existing Vercel endpoint until DNS cutover. Both hosting targets
// use the same quote validation and provider request implementation.
export async function POST(request: Request) {
  return handleQuote(request, quoteEnvironment({
    ...process.env,
    QUOTE_DELIVERY_MODE: process.env.QUOTE_DELIVERY_MODE ?? "live",
  }));
}
