// Public, browser-side settings: fill these in before going live.
// Secrets (API keys, the Supabase service key) go ONLY in Vercel's
// environment variables, never here. See README.md.

export const BRAND = {
  name: 'בונה האתרים',         // product name shown on the site, in emails and in the credit line
  supportWhatsApp: '',          // e.g. "972501234567" (digits only). Empty hides the WhatsApp support button
  supportEmail: '',             // e.g. "support@yourdomain.co.il"
  legalName: '',                // the business name that appears in the terms (עוסק / חברה)
  businessId: '',               // ע"מ / ח"פ number
};

export const SUPABASE = {
  url: '',                      // https://<project>.supabase.co
  anonKey: '',                  // the project's anon (public) key
};

export const PADDLE = {
  clientToken: '',              // "live_..." (or "test_..." with environment "sandbox")
  priceId: '',                  // "pri_..." of the site-builder monthly price; must match PADDLE_PRICE_ID on the server
  environment: 'production',    // or "sandbox"
};

export const PRICE_LABEL = '49 ₪ לחודש';
