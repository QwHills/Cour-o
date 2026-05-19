// Supabase Edge Function: stripe-webhook
// ----------------------------------------
// Listens for Stripe events and persists them into the public.payments,
// payouts, disputes tables so the app can show real revenue / escrow state.
//
// Deploy:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// (no-verify-jwt because Stripe calls us with its own signature, not a
// Supabase JWT.)
//
// Then register the webhook URL in Stripe:
//   https://dashboard.stripe.com/test/webhooks → Add endpoint
//   URL: https://fjskdokvroylnmkkmsof.supabase.co/functions/v1/stripe-webhook
//   Events:
//     payment_intent.succeeded
//     payment_intent.payment_failed
//     charge.refunded
//     charge.dispute.created
//
// Copy the "Signing secret" (whsec_...) and set it as a secret:
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

// @ts-ignore
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=deno';

// @ts-ignore — Deno env
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
// @ts-ignore
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
// @ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
// @ts-ignore
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

// Service-role client bypasses RLS (we need to write on behalf of users)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      // @ts-ignore
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Webhook signature failed:', message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  console.log('Stripe event:', event.type, event.id);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingReference = pi.metadata?.bookingReference ?? null;

        // Persist a payment row. booking_id may be missing if PaymentIntent
        // was created before the booking row (expected flow — the app creates
        // the booking AFTER the PaymentSheet succeeds).
        await supabase.from('payments').upsert(
          {
            stripe_payment_intent_id: pi.id,
            amount: pi.amount / 100,
            currency: pi.currency.toUpperCase(),
            status: 'succeeded',
            escrow_status: 'held',
            booking_reference: bookingReference,
          },
          { onConflict: 'stripe_payment_intent_id' }
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (piId) {
          await supabase
            .from('payments')
            .update({ status: 'refunded', escrow_status: 'refunded' })
            .eq('stripe_payment_intent_id', piId);
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const piId = typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id;
        if (piId) {
          await supabase
            .from('payments')
            .update({ escrow_status: 'disputed' })
            .eq('stripe_payment_intent_id', piId);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook handler error:', message);
    return new Response(`Handler error: ${message}`, { status: 500 });
  }
});
