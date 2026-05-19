// Global React error boundary.
//
// Catches *render* errors anywhere in the tree and shows a friendly fallback
// instead of the white-screen crash that React produces by default. Each
// caught error is also shipped to Sentry (or logged in dev).
//
// What it does NOT catch:
//   • Errors in event handlers (use try/catch + captureException there)
//   • Errors in async code (same)
//   • Server-side errors (we're SPA-only)
//
// Usage: wrap the root <App /> once in App.tsx. Optional per-screen
// boundaries can use the same component with a smaller fallback if needed.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { captureException } from '../services/monitoring';
import { colors, spacing, radii } from '../theme/theme';

interface Props {
  children: React.ReactNode;
  /** Custom fallback. If omitted, the default Koureo fallback is used. */
  fallback?: (props: { error: Error; reset: () => void }) => React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Ship to Sentry (or log to console in dev).
    captureException(error, {
      source: 'ErrorBoundary',
      componentStack: errorInfo.componentStack ?? 'unknown',
    });
  }

  reset = () => this.setState({ error: null });

  reload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      // On native, the safest is to reset the tree — a true app restart
      // requires DevSettings.reload() in dev or a native module in prod.
      this.reset();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>!</Text>
        </View>
        <Text style={styles.title}>Oups, un problème est survenu</Text>
        <Text style={styles.subtitle}>
          L'application a rencontré une erreur. On a été notifié·e automatiquement.
        </Text>
        <Text style={styles.errorDetail} numberOfLines={3}>
          {this.state.error.message || String(this.state.error)}
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={this.reload} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Recharger l'application</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={this.reset} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>Essayer de continuer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.error + '14',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: { fontSize: 32, fontWeight: '800', color: colors.error },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  errorDetail: {
    fontSize: 11,
    color: colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryBtn: { paddingVertical: spacing.sm },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
});
