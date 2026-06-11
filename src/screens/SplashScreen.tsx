import React, { useEffect, useRef, useState } from 'react';
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

const TYPED_WORD = 'aussi simple';
const TYPE_INTERVAL_MS = 90; // ~12 chars × 90ms ≈ 1.1s
const CURSOR_BLINK_MS = 450;

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const brandFade = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(12)).current;
  const punchFade = useRef(new Animated.Value(0)).current;
  const punchY = useRef(new Animated.Value(20)).current;
  const punchScale = useRef(new Animated.Value(0.98)).current;
  const dotFade = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const outFade = useRef(new Animated.Value(1)).current;

  // Typewriter — how many chars of TYPED_WORD are currently revealed (0..12).
  // While < TYPED_WORD.length the cursor is shown; once full we hide it and
  // reveal the trailing dot.
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    let typeInterval: ReturnType<typeof setInterval> | null = null;
    let cursorLoop: Animated.CompositeAnimation | null = null;

    // Stage 1: brand fades in + slides up, then the first line of the
    // punchline (everything up to but excluding "aussi simple") appears.
    Animated.sequence([
      Animated.parallel([
        Animated.timing(brandFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(brandY,    { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(punchFade,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(punchY,     { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.timing(punchScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.delay(120),
    ]).start(() => {
      // Stage 2: start the blinking cursor and type "aussi simple" one char
      // at a time. setInterval is the simplest fit since each step changes
      // text content — Animated would only help if we faded each char.
      cursorLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: CURSOR_BLINK_MS, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: CURSOR_BLINK_MS, useNativeDriver: true }),
        ]),
      );
      cursorLoop.start();

      let i = 0;
      typeInterval = setInterval(() => {
        i += 1;
        setTypedChars(i);
        if (i >= TYPED_WORD.length) {
          if (typeInterval) clearInterval(typeInterval);
          if (cursorLoop) cursorLoop.stop();
          // Stage 3: drop the dot, hold, fade out.
          Animated.sequence([
            Animated.timing(dotFade, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(1200),
            Animated.timing(outFade, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]).start(() => onFinish());
        }
      }, TYPE_INTERVAL_MS);
    });

    return () => {
      if (typeInterval) clearInterval(typeInterval);
      if (cursorLoop) cursorLoop.stop();
    };
  }, []);

  const isTyping = typedChars < TYPED_WORD.length;

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
          n'a jamais été{' '}
          <Text style={styles.pizzaWord}>
            {TYPED_WORD.slice(0, typedChars)}
          </Text>
          {isTyping && (
            <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
              |
            </Animated.Text>
          )}
          <Animated.Text style={[styles.punchDot, { opacity: dotFade }]}>
            .
          </Animated.Text>
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
  pizzaWord: {
    color: colors.primary,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  cursor: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 30,
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
