// Supabase Edge Function: create-payment-intent
// ----------------------------------------------
// Deno runtime. Creates a Stripe PaymentIntent server-side so the secret key
// never ships with the mobile app.
//
// Deploy:
//   supabase functions deploy create-payment-intent
//
// Set secrets (ONCE):
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
//
// Test locally:
//   supabase functions serve create-payment-intent --env-file .env.local

// @ts-ignore — Deno import map (resolved at deploy time)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// @ts-ignore — Deno global
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency, bookingReference } = await req.json();

    if (!amount || amount < 50) {
      return new Response(
        JSON.stringify({ error: 'Amount must be ≥ 50 cents' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a minimal Customer so Stripe PaymentSheet can show saved cards
    const customer = await stripe.customers.create({
      metadata: { bookingReference: bookingReference ?? '' },
    });

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-06-20' }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // cents
      currency: currency ?? 'eur',
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      metadata: { bookingReference: bookingReference ?? '' },
      // For escrow later, switch to:
      // capture_method: 'manual',
      // transfer_data: { destination: proStripeAccountId, amount: proNetAmount }
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customer.id,
        // @ts-ignore
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-payment-intent error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
