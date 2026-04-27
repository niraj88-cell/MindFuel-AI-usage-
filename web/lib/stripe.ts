import Stripe from 'stripe';

// Graceful initialization — allows build to succeed even without STRIPE_SECRET_KEY
// The actual Stripe calls will fail at runtime if the key is missing, which is expected
// for environments that don't use Stripe (e.g. dev without payments)
const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey
  ? new Stripe(stripeKey, {
      apiVersion: '2026-04-22.dahlia',
    })
  : (null as unknown as Stripe);

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return stripe;
}
