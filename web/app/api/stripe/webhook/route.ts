import { NextRequest, NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const stripe = requireStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createAdminClient();

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId) {
      // Upgrade user to Premium
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: 'premium',
          daily_log_limit: 9999, // Unlimited
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user profile after payment:', error);
      } else {
        console.log(`User ${userId} successfully upgraded to Premium!`);
      }
    }
  } else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: subscription.status === 'active' ? 'premium' : 'free',
        daily_log_limit: subscription.status === 'active' ? 9999 : 3,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
      
    if (error) console.error('Error updating subscription:', error);
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        daily_log_limit: 3,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) console.error('Error downgrading subscription:', error);
  } else if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        daily_log_limit: 3,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', invoice.customer as string);

    if (error) console.error('Error flagging payment failed:', error);
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        daily_log_limit: 3,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', charge.customer as string);

    if (error) console.error('Error handling refund:', error);
  }

  return NextResponse.json({ received: true });
}
