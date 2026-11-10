// Browser-side settings. The client token and price id are public by design;
// the secret PADDLE_API_KEY lives only in the server's environment variables.
// Create a separate product + monthly price for the site builder in Paddle
// (do not reuse PostIQ's price), then fill these in.
export const PADDLE = {
  clientToken: '',          // e.g. "live_..." (or "test_..." with environment "sandbox")
  priceId: '',              // e.g. "pri_..." - must match PADDLE_PRICE_ID on the server
  environment: 'production' // or "sandbox"
};

export const PRICE_LABEL = '49 ₪ לחודש';
