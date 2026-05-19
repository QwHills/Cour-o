// Web stub for @stripe/stripe-react-native.
// The native Stripe SDK doesn't build on web; this provides a drop-in shim so
// CheckoutScreen can render & simulate a payment for Jo's internal test.
// When we wire real web payments later, replace this with Stripe Elements or
// a redirect to Stripe Checkout.

import React from 'react';

export const StripeProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

interface PaymentSheetError {
  code: string;
  message: string;
}

interface InitPaymentSheetParams {
  merchantDisplayName?: string;
  paymentIntentClientSecret?: string;
  customerId?: string;
  customerEphemeralKeySecret?: string;
  defaultBillingDetails?: unknown;
  allowsDelayedPaymentMethods?: boolean;
}

export function useStripe() {
  return {
    initPaymentSheet: async (
      _params: InitPaymentSheetParams
    ): Promise<{ error?: PaymentSheetError }> => {
      // No-op on web — we do nothing here, the real work happens in present.
      return {};
    },

    presentPaymentSheet: async (): Promise<{ error?: PaymentSheetError }> => {
      // Confirm with the user that this is a simulated payment (web only).
      const confirmed =
        typeof window !== 'undefined' &&
        window.confirm(
          '🧪 Mode démo web\n\nLe paiement Stripe réel n\'est pas branché sur web (il fonctionne en natif iOS/Android).\n\nConfirmer une "simulation de paiement réussi" ?'
        );
      if (!confirmed) {
        return { error: { code: 'Canceled', message: 'Annulé par l\'utilisateur' } };
      }
      return {};
    },
  };
}
