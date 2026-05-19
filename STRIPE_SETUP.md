# Stripe Setup — Koureo

Ce guide explique comment activer les paiements Stripe en **mode test**. Commence par là avant de passer en mode live.

## Architecture

```
┌──────────────────────┐     ┌─────────────────────────┐     ┌─────────┐
│  App (React Native)  │────▶│  Supabase Edge Function │────▶│ Stripe  │
│   Stripe SDK         │     │  create-payment-intent  │     │ API     │
└──────────────────────┘     └─────────────────────────┘     └─────────┘
      Clé publique                  Clé secrète
      (pk_test_...)                 (sk_test_...)
```

La clé **secrète** ne sort jamais du backend (Edge Function). L'app ne voit que la clé publique + le `client_secret` d'un PaymentIntent précis.

---

## 1. Récupérer les clés Stripe

1. Va sur https://dashboard.stripe.com/test/apikeys
2. Note :
   - **Publishable key** : commence par `pk_test_...` (déjà dans `.env`)
   - **Secret key** : commence par `sk_test_...` — **ne la mets JAMAIS dans le code client**

---

## 2. Installer Supabase CLI (une seule fois)

```bash
brew install supabase/tap/supabase
```

Vérifie :
```bash
supabase --version
```

---

## 3. Linker le projet Supabase

Depuis la racine du projet Koureo :

```bash
cd "/Users/quentinhillion/Documents/App avec Jo /CoursSurPlace"
supabase login      # ouvre ton navigateur, tu autorises
supabase link --project-ref fjskdokvroylnmkkmsof
```

---

## 4. Uploader les secrets Stripe sur Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_TA_CLE_SECRETE_ICI
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_51Rgop8HWHMNzPiDvpglgwGH0zsxm6CVzVV8wqYYxINnNCjw6q6ZN7O3zvgDmTeOJVeskJw7oSYxnyFzcDn4YR0Mj00gZSUyO6b
```

Vérifie :
```bash
supabase secrets list
```
Tu dois voir `STRIPE_SECRET_KEY` et `STRIPE_PUBLISHABLE_KEY` dans la liste.

---

## 5. Déployer l'Edge Function

```bash
supabase functions deploy create-payment-intent
```

Après succès, teste-la :
```bash
curl -i --location --request POST \
  'https://fjskdokvroylnmkkmsof.supabase.co/functions/v1/create-payment-intent' \
  --header 'Authorization: Bearer TON_ANON_KEY_SUPABASE' \
  --header 'Content-Type: application/json' \
  --data '{"amount": 1500, "currency": "eur", "bookingReference": "test_123"}'
```

Tu dois recevoir un JSON avec `clientSecret`, `ephemeralKey`, `customer`, `publishableKey`.

---

## 6. Tester dans l'app

1. Redémarre Metro : `npx expo start -c`
2. **Pour iOS**, tu dois faire un rebuild natif car `@stripe/stripe-react-native` contient du code iOS/Android :
   ```bash
   npx expo run:ios
   ```
   (ou via EAS Build si tu es sur Expo Go, qui ne supporte pas Stripe)
3. Dans l'app : connecte-toi → choisis un cours **payant** (Yoga du Matin 15€) → Paiement
4. La Stripe PaymentSheet s'ouvre
5. **Carte de test** : `4242 4242 4242 4242`, date future (ex. 12/34), CVC `123`, code postal `75001`
6. Confirme → Paiement OK → Réservation créée
7. Vérifie dans https://dashboard.stripe.com/test/payments → tu dois voir le PaymentIntent

---

## 7. Limitations actuelles

- ❌ **Stripe Connect pas encore branché** : tout l'argent va chez Koureo (compte Stripe principal). Le split 88/12 au prof se fera dans une étape ultérieure.
- ❌ **Pas de webhooks** : les statuts `held`/`released`/`refunded` restent gérés en mémoire locale. En prod il faudra un Edge Function `stripe-webhook` qui écoute `payment_intent.succeeded`, `charge.refunded`, etc.
- ❌ **Expo Go non supporté** : `@stripe/stripe-react-native` a du code natif, il faut `expo run:ios` / `expo run:android` ou un build EAS.

---

## 8. Passer en mode live (plus tard)

Une fois l'app stable en test :
1. Active le compte Stripe (ID vérifiée, RIB, infos business)
2. Récupère `pk_live_...` et `sk_live_...`
3. Remplace dans `.env` et dans `supabase secrets set`
4. Re-déploie l'Edge Function
5. Active Stripe Connect si tu veux le split automatique vers les profs

---

## Cartes de test utiles

| Numéro                | Comportement                         |
|-----------------------|--------------------------------------|
| 4242 4242 4242 4242   | Succès                               |
| 4000 0025 0000 3155   | Nécessite 3D Secure (authentification) |
| 4000 0000 0000 0002   | Refusée (`card_declined`)            |
| 4000 0000 0000 9995   | Fonds insuffisants                   |

Plus sur https://stripe.com/docs/testing
