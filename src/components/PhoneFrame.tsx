import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Text,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/theme';
import { isOnAdminUrl } from '../admin/navigation/adminUrl';

// Intrinsic size of the phone mockup (matches iPhone 14 Pro reference screen)
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Le back-office admin a besoin de la pleine largeur desktop : pas de cadre
  // téléphone. La détection se fait sur l'URL pour rester synchrone côté SSR.
  if (isOnAdminUrl()) {
    return <>{children}</>;
  }

  return <WebFrame>{children}</WebFrame>;
}

function WebFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  // On real mobile browsers (phone/tablet width), skip the phone mockup entirely
  // — the device IS the phone. No "phone inside a phone" weirdness.
  if (width < 700) {
    return <>{children}</>;
  }

  // Desktop: scale so the phone always fits the viewport (leaves 40px breathing room).
  const verticalScale = (height - 40) / PHONE_HEIGHT;
  const horizontalScale = width < 900 ? (width - 40) / PHONE_WIDTH : 1;
  const scale = Math.min(1, verticalScale, horizontalScale);

  // Side panel only on wide desktop
  const showSidePanel = width >= 900;

  return (
    <View style={styles.pageBackground}>
      {showSidePanel && (
        <View style={styles.sidePanel}>
          <Text style={styles.brand}>KOUREO</Text>
          <Text style={styles.tagline}>
            Trouver un cours{'\n'}
            n'a jamais été aussi simple.
          </Text>
          <View style={styles.divider} />
          <View style={styles.features}>
            <FeatureRow icon="checkmark-circle-outline" text="Cours de qualité vérifiés" />
            <FeatureRow icon="calendar-outline" text="Réservation instantanée" />
            <FeatureRow icon="ribbon-outline" text="Professeurs certifiés" />
          </View>
        </View>
      )}

      <View style={styles.phoneWrapper}>
        <View
          style={[
            styles.phoneBezel,
            { transform: [{ scale }] as any },
          ]}
        >
          <View style={styles.notch} />
          <View style={styles.phoneScreen}>{children}</View>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </View>
  );
}

function FeatureRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={20} color={colors.primary} style={styles.featureIcon} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
  },
  sidePanel: {
    maxWidth: 340,
    padding: 48,
    marginRight: 72,
  },
  brand: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: 8,
    marginBottom: 24,
  },
  tagline: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 42,
    letterSpacing: -0.3,
    marginBottom: 32,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    marginBottom: 32,
    borderRadius: 1,
  },
  features: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 20,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  phoneWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    // Flex so it centers on narrow viewports once sidePanel is hidden
    flexShrink: 1,
  },
  phoneBezel: {
    width: 390,
    height: 844,
    backgroundColor: '#0F0E0D',
    borderRadius: 55,
    padding: 12,
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.2,
    shadowRadius: 80,
    position: 'relative',
  },
  notch: {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: [{ translateX: -60 }],
    width: 120,
    height: 30,
    backgroundColor: '#0F0E0D',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    zIndex: 10,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 45,
    overflow: 'hidden',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -67 }],
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 10,
  },
});
