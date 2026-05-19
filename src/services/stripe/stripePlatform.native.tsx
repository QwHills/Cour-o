// Native re-export — just forwards the real Stripe React Native hooks/components.
// Metro picks stripePlatform.web.ts on web builds instead.

export { StripeProvider, useStripe } from '@stripe/stripe-react-native';
