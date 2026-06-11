// Supabase Edge Function: create-payment-intent
// ----------------------------------------------
// Deno runtime. Creates a Stripe PaymentIntent server-side so the secret key
// never ships with the mobile app.
//
// SÉCURITÉ : le client n'envoie QUE des session_ids. Le montant, la promo,
// la commission et le compte Stripe du prof sont (re)calculés côté serveur
// depuis la base — on ne fait jamais confiance aux montants du client.
// L'appelant doit être authentifié (JWT Supabase transmis par
// supabase.functions.invoke).
//
// Deploy:
//   supabase functions deploy create-payment-intent
//
// Secrets requis (supabase secrets set …):
//   STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement)

// @ts-ignore — Deno import map (resolved at deploy time)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Mêmes taux que la vitrine (src/lib/payments.ts) :
// élève invité par le prof → 8 %, élève apporté par la plateforme → 20 %.
const NEW_STUDENT_COMMISSION_PERCENT = 20;
const EXISTING_STUDENT_FEE_PERCENT = 8;

// @ts-ignore — Deno global
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type SessionRow = {
  id: string;
  class_id: string;
  status: string | null;
  booked_count: number | null;
  max_participants: number | null;
  starts_at: string | null;
  promo_price: number | null;
  promo_active: boolean | null;
  promo_expires_at: string | null;
};

type ClassRow = {
  id: string;
  teacher_id: string;
  price: number | null;
  is_free: boolean | null;
  max_participants: number | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // @ts-ignore — Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Authentification — JWT de l'utilisateur (header Authorization)
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return jsonResponse({ error: 'Authentification requise.' }, 401);
    }
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(jwt);
    if (authError || !user) {
      return jsonResponse({ error: 'Authentification requise.' }, 401);
    }

    // 2. Entrée : des identifiants UNIQUEMENT (séances OU produit) — jamais de montant
    const body = await req.json().catch(() => ({}));
    const sessionIds: string[] = Array.isArray(body?.session_ids)
      ? body.session_ids.filter((s: unknown) => typeof s === 'string')
      : [];
    const productId: string | null =
      typeof body?.product_id === 'string' ? body.product_id : null;

    // ── Chemin produit (pack de crédits / abonnement) : prix lu en DB,
    //    encaissement plateforme (pas de transfert Connect).
    if (productId) {
      const { data: product, error: prodErr } = await admin
        .from('products')
        .select('id, price, active, kind')
        .eq('id', productId)
        .maybeSingle();
      if (prodErr) throw prodErr;
      if (!product || product.active === false || (product.price ?? 0) <= 0) {
        return jsonResponse({ error: 'Offre introuvable.' }, 404);
      }
      const productAmountCents = Math.round(Number(product.price) * 100);
      const productRef = `product_${product.id}`;
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id, bookingReference: productRef },
      });
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customer.id },
        { apiVersion: '2024-06-20' }
      );
      const paymentIntent = await stripe.paymentIntents.create({
        amount: productAmountCents,
        currency: 'eur',
        customer: customer.id,
        automatic_payment_methods: { enabled: true },
        receipt_email: user.email ?? undefined,
        metadata: {
          kind: 'product_mobile',
          bookingReference: productRef,
          user_id: user.id,
          product_id: product.id,
          price_total: String(product.price),
        },
      });
      return jsonResponse(
        {
          clientSecret: paymentIntent.client_secret,
          ephemeralKey: ephemeralKey.secret,
          customer: customer.id,
          amount: Number(product.price),
          // @ts-ignore
          publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
        },
        200
      );
    }

    if (sessionIds.length === 0 || sessionIds.length > 10) {
      return jsonResponse(
        { error: 'session_ids ou product_id requis.' },
        400
      );
    }
    const uniqueIds = [...new Set(sessionIds)];

    // 3. Séances + cours — données serveur uniquement
    const { data: sessions, error: sessErr } = await admin
      .from('class_sessions')
      .select(
        'id, class_id, status, booked_count, max_participants, starts_at, promo_price, promo_active, promo_expires_at'
      )
      .in('id', uniqueIds);
    if (sessErr) throw sessErr;
    if (!sessions || sessions.length !== uniqueIds.length) {
      return jsonResponse({ error: 'Séance introuvable.' }, 404);
    }

    const classIds = [...new Set((sessions as SessionRow[]).map((s) => s.class_id))];
    const { data: classes, error: clsErr } = await admin
      .from('classes')
      .select('id, teacher_id, price, is_free, max_participants')
      .in('id', classIds);
    if (clsErr) throw clsErr;
    const classById = new Map<string, ClassRow>(
      ((classes ?? []) as ClassRow[]).map((c) => [c.id, c])
    );

    // Un seul prof par paiement (une seule destination de transfert)
    const teacherIds = [...new Set(((classes ?? []) as ClassRow[]).map((c) => c.teacher_id))];
    if (teacherIds.length !== 1) {
      return jsonResponse(
        { error: 'Un paiement ne peut concerner qu’un seul professeur.' },
        400
      );
    }
    const teacherId = teacherIds[0];

    // 4. Validation + prix par séance (promo « offre spéciale » incluse)
    const now = Date.now();
    let totalEuros = 0;
    for (const s of sessions as SessionRow[]) {
      const cls = classById.get(s.class_id);
      if (!cls) {
        return jsonResponse({ error: 'Cours introuvable.' }, 404);
      }
      if (cls.is_free || (cls.price ?? 0) <= 0) {
        return jsonResponse(
          { error: 'Ce cours est gratuit — aucun paiement n’est nécessaire.' },
          400
        );
      }
      if (s.status === 'cancelled' || s.status === 'past') {
        return jsonResponse(
          { error: 'Une des séances n’est plus réservable.' },
          400
        );
      }
      const capacity = s.max_participants ?? cls.max_participants ?? 0;
      if (capacity > 0 && (s.booked_count ?? 0) >= capacity) {
        return jsonResponse({ error: 'Séance complète.' }, 400);
      }
      const promoValid =
        s.promo_active === true &&
        typeof s.promo_price === 'number' &&
        s.promo_price > 0 &&
        (!s.promo_expires_at || new Date(s.promo_expires_at).getTime() > now);
      totalEuros += promoValid ? (s.promo_price as number) : Number(cls.price);
    }
    totalEuros = Math.round(totalEuros * 100) / 100;
    if (totalEuros <= 0) {
      return jsonResponse({ error: 'Montant invalide.' }, 400);
    }

    // 5. Anti-doublon : pas déjà de réservation active sur ces séances
    const { data: existing } = await admin
      .from('bookings')
      .select('id, session_id, status')
      .eq('user_id', user.id)
      .in('session_id', uniqueIds)
      .in('status', ['confirmed', 'completed']);
    if (existing && existing.length > 0) {
      return jsonResponse(
        { error: 'Vous avez déjà une réservation pour une de ces séances.' },
        409
      );
    }

    // 6. Compte Stripe Connect du prof (versement direct)
    const { data: teacher } = await admin
      .from('teacher_profiles')
      .select('id, stripe_account_id, stripe_charges_enabled')
      .eq('id', teacherId)
      .maybeSingle();
    if (!teacher?.stripe_account_id || !teacher.stripe_charges_enabled) {
      return jsonResponse(
        {
          error:
            'Ce professeur n’a pas encore activé les paiements. Réessayez plus tard.',
        },
        409
      );
    }

    // 7. Commission — 8 % si l'élève a été invité par CE prof, 20 % sinon
    const { data: studentRow } = await admin
      .from('users')
      .select('invited_by_teacher_id')
      .eq('id', user.id)
      .maybeSingle();
    const percent =
      studentRow?.invited_by_teacher_id === teacherId
        ? EXISTING_STUDENT_FEE_PERCENT
        : NEW_STUDENT_COMMISSION_PERCENT;
    const commissionEuros = Math.round(totalEuros * percent) / 100;

    const amountCents = Math.round(totalEuros * 100);
    const feeCents = Math.round(commissionEuros * 100);
    const bookingReference = `session_multi_${uniqueIds.join('_')}`;

    // 8. Customer + ephemeral key pour le PaymentSheet mobile
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id, bookingReference },
    });
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-06-20' }
    );

    // 9. PaymentIntent — destination charge vers le compte du prof
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      application_fee_amount: feeCents,
      transfer_data: { destination: teacher.stripe_account_id as string },
      receipt_email: user.email ?? undefined,
      metadata: {
        kind: 'booking_mobile',
        bookingReference,
        user_id: user.id,
        session_ids: uniqueIds.join(','),
        teacher_id: teacherId,
        price_total: String(totalEuros),
        commission_percent: String(percent),
        commission_amount: String(commissionEuros),
      },
    });

    return jsonResponse(
      {
        clientSecret: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customer.id,
        amount: totalEuros,
        // @ts-ignore
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      },
      200
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-payment-intent error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
