import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../theme/theme';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const brandFade = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(12)).current;
  const punchFade = useRef(new Animated.Value(0)).current;
  const punchY = useRef(new Animated.Value(20)).current;
  const punchScale = useRef(new Animated.Value(0.98)).current;
  const highlightFade = useRef(new Animated.Value(0)).current;
  const outFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence: brand → punchline → highlight → hold → fade out
    Animated.sequence([
      // Brand appears
      Animated.parallel([
        Animated.timing(brandFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(brandY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      // Punchline appears
      Animated.parallel([
        Animated.timing(punchFade, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(punchY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(punchScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
      // Highlight on "pizza"
      Animated.timing(highlightFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(1500),
      // Fade out everything
      Animated.timing(outFade, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: outFade }]}>
      <LinearGradient
        colors={['#f8fbfa', '#ecfbf7', '#d1f5ec']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.circle1]} />
      <View style={[styles.decorCircle, styles.circle2]} />
      <View style={[styles.decorCircle, styles.circle3]} />

      {/* Brand */}
      <Animated.View
        style={[
          styles.brandContainer,
          { opacity: brandFade, transform: [{ translateY: brandY }] },
        ]}
      >
        <Text style={styles.brand}>KOUREO</Text>
        <View style={styles.brandDivider} />
      </Animated.View>

      {/* Punchline */}
      <Animated.View
        style={[
          styles.punchContainer,
          {
            opacity: punchFade,
            transform: [{ translateY: punchY }, { scale: punchScale }],
          },
        ]}
      >
        <Text style={styles.punchline}>
          Trouver une activité{'\n'}
          <Animated.Text
            style={[
              styles.punchHighlight,
              { opacity: highlightFade.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) },
            ]}
          >
            n'a jamais été{' '}
            <Animated.Text style={[styles.pizzaWord, { opacity: highlightFade }]}>
              aussi simple
            </Animated.Text>
          </Animated.Text>
          <Text style={styles.punchDot}>.</Text>
        </Text>
      </Animated.View>

      {/* Tagline footer */}
      <Animated.Text style={[styles.tagline, { opacity: punchFade }]}>
        Découvre. Réserve. Partage.
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circle1: {
    width: 260,
    height: 260,
    backgroundColor: 'rgba(67,196,176,0.12)',
    top: -80,
    right: -60,
  },
  circle2: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(47,175,155,0.15)',
    bottom: 80,
    left: -40,
  },
  circle3: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(126,181,166,0.12)',
    top: height * 0.35,
    left: width * 0.15,
  },

  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  brand: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: 10,
  },
  brandDivider: {
    width: 28,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
    marginTop: spacing.md,
  },

  punchContainer: {
    paddingHorizontal: spacing.xl,
    maxWidth: 360,
  },
  punchline: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  punchHighlight: {
    fontWeight: '700',
  },
  pizzaWord: {
    color: colors.primary,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  punchDot: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '800',
  },

  tagline: {
    position: 'absolute',
    bottom: 80,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
