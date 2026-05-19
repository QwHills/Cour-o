import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from './src/services/stripe/stripePlatform';
import RootNavigator from './src/navigation/RootNavigator';
import PhoneFrame from './src/components/PhoneFrame';
import SplashScreen from './src/screens/SplashScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initMockPayments } from './src/data/initMockPayments';
import { captureReferralFromUrl } from './src/services/points/referralStorage';
import { initMonitoring } from './src/services/monitoring';
import { isOnAdminUrl } from './src/admin/navigation/adminUrl';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY ?? '';

// Init crash reporting BEFORE the React tree mounts so even render-time
// errors get reported. Inert if EXPO_PUBLIC_SENTRY_DSN is unset.
initMonitoring();

export default function App() {
  // L'admin n'a pas besoin du splash lifestyle de l'app grand public.
  const [showSplash, setShowSplash] = useState(!isOnAdminUrl());

  useEffect(() => {
    initMockPayments();
    // Captures any ?ref=CODE in the URL (web deep link) so signup can attach it.
    captureReferralFromUrl();
  }, []);

  return (
    <ErrorBoundary>
      <StripeProvider
        publishableKey={STRIPE_KEY}
        merchantIdentifier="merchant.app.koureo"
        urlScheme="koureo"
      >
        <PhoneFrame>
          <StatusBar style="dark" />
          {showSplash ? (
            <SplashScreen onFinish={() => setShowSplash(false)} />
          ) : (
            <RootNavigator />
          )}
        </PhoneFrame>
      </StripeProvider>
    </ErrorBoundary>
  );
}
