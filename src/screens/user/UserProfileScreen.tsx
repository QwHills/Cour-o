import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../../services/auth.service';
import { pointsService } from '../../services/points.service';
import { bookingsService } from '../../services/bookings.service';
import { favoritesService } from '../../services/favorites.service';
import { notificationsService } from '../../services/notifications.service';
import { teachersService } from '../../services/teachers.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';

export default function UserProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const user = authService.getCurrentUser();
  const bookings = user ? bookingsService.listForUser(user.id) : [];
  const [favCount, setFavCount] = useState(user ? favoritesService.count(user.id) : 0);
  const [unreadNotifs, setUnreadNotifs] = useState(
    user ? notificationsService.countUnread(user.id) : 0
  );
  const [pointsTotal, setPointsTotal] = useState<number>(0);

  // Detect if the current user actually has a teacher_profile (= they're a pro
  // who switched to user mode). If so we show a "Retour à mon espace pro"
  // shortcut instead of the "Passer en mode professeur" onboarding card.
  const [isExistingPro, setIsExistingPro] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsExistingPro(false);
      return;
    }
    let cancelled = false;
    teachersService.getByUserId(user.id).then((t) => {
      if (!cancelled) setIsExistingPro(!!t);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    return favoritesService.onChange(() => {
      if (user) setFavCount(favoritesService.count(user.id));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    pointsService.getBalance(user.id).then((b) => {
      if (mounted) setPointsTotal(b?.totalPoints ?? 0);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    return notificationsService.onChange(() => {
      if (user) setUnreadNotifs(notificationsService.countUnread(user.id));
    });
  }, [user]);

  const handleInviteFriend = async () => {
    if (!user) return;
    const url = `https://koureo.fr/?ref=${encodeURIComponent(user.id)}`;
    const message =
      `Salut ! Je t'invite à rejoindre Koureo — la plateforme pour trouver et réserver des cours autour de toi.\n\n` +
      `En passant par mon lien, tu reçois 10 points de bienvenue et on gagne tous les deux. 🎁\n\n` +
      `${url}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        // Mobile web with native share sheet
        await (navigator as any).share({
          title: 'Rejoins-moi sur Koureo',
          text: message,
          url,
        });
      } else if (Platform.OS === 'web') {
        // Desktop web fallback — copy link to clipboard
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          Alert.alert(
            'Lien copié ✓',
            `Le lien d'invitation a été copié dans ton presse-papiers.\n\n${url}`,
          );
        } else {
          Alert.alert("Ton lien d'invitation", url);
        }
      } else {
        await Share.share({
          message,
          url, // iOS specific — adds URL to the share content
          title: 'Rejoins-moi sur Koureo',
        });
      }
    } catch (e) {
      // User cancelled or share failed — silent.
    }
  };

  const handleSignOut = () => {
    // Sign out immediately — no confirm dialog. Rationale: window.confirm can
    // be blocked by browsers or return undefined unexpectedly, and Alert.alert
    // multi-button callbacks are unreliable on react-native-web. Simpler UX
    // anyway; re-login is a tap away from the Welcome screen.
    authService.signOut().catch((e) => {
      console.warn('signOut failed:', (e as Error).message);
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header zone */}
      <View style={styles.headerZone}>
        <Text style={styles.brand}>KOUREO</Text>

        <View style={styles.avatarRow}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {user?.name.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name ?? 'Invité'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editBtnText}>Modifier</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Mes cours')}
        >
          <Text style={styles.statValue}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Réservations ›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Text style={styles.statValue}>{favCount}</Text>
          <Text style={styles.statLabel}>Favoris ›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('MyPoints')}
        >
          <Text style={styles.statValue}>{pointsTotal}</Text>
          <Text style={styles.statLabel}>Points ›</Text>
        </TouchableOpacity>
      </View>

      {/* Inviter un ami — référral CTA. Tap opens the system share sheet
          with a pre-built message + a referral URL `?ref=<userId>`. The
          friend earns +10 pts on signup, the user earns +50 when the friend
          books their first paid class (POINTS_CONFIG.student_referral_first_booking). */}
      <TouchableOpacity
        style={styles.inviteCard}
        activeOpacity={0.9}
        onPress={handleInviteFriend}
      >
        <View style={styles.inviteIcon}>
          <Text style={styles.inviteEmoji}>🎁</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteTitle}>Inviter un ami</Text>
          <Text style={styles.inviteSubtitle}>
            Gagne <Text style={{ fontWeight: '800', color: colors.primary }}>+50 points</Text> dès qu'un ami
            réserve son premier cours.
          </Text>
        </View>
        <Text style={styles.inviteChevron}>›</Text>
      </TouchableOpacity>

      {/* Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.menuTitle}>Mon compte</Text>
        <Card style={styles.menuCard} padding="none">
          <MenuItem
            icon="◆"
            label="Modifier mon profil"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="♥"
            label="Mes favoris"
            sub={favCount > 0 ? `${favCount} cours sauvegardé${favCount > 1 ? 's' : ''}` : 'Aucun favori'}
            onPress={() => navigation.navigate('Favorites')}
          />
          <MenuItem
            icon="○"
            label="Messages"
            sub="1 non lu"
            onPress={() => navigation.navigate('UserMessages')}
          />
          <MenuItem
            icon="◆"
            label="Moyens de paiement"
            sub="Visa •••• 4242"
            onPress={() => navigation.navigate('PaymentMethods')}
          />
          <MenuItem
            icon="◔"
            label="Notifications"
            sub={unreadNotifs > 0 ? `${unreadNotifs} non lue${unreadNotifs > 1 ? 's' : ''}` : 'Tout à jour'}
            onPress={() => navigation.navigate('Notifications')}
          />
          <MenuItem
            icon="◎"
            label="Mes abonnements"
            sub="Crédits, packs & abonnements"
            onPress={() => navigation.navigate('MySubscriptions')}
          />
          <MenuItem
            icon="◆"
            label="Mes factures"
            onPress={() => navigation.navigate('MyInvoices')}
            isLast
          />
        </Card>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuTitle}>Aide</Text>
        <Card style={styles.menuCard} padding="none">
          <MenuItem
            icon="◆"
            label="Centre d'aide"
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <MenuItem
            icon="◆"
            label="Nous contacter"
            onPress={() => navigation.navigate('Contact')}
          />
          <MenuItem icon="◆" label="Conditions d'utilisation" onPress={() => navigation.navigate('CGU')} isLast />
        </Card>
      </View>

      {/* Mode pro
          - Si l'utilisateur a déjà un teacher_profile (= prof qui a basculé en
            mode user) → simple switch local vers son dashboard pro.
          - Sinon → onboarding pro complet (kind, catégories, bio, adresse). */}
      <TouchableOpacity
        style={styles.proCard}
        activeOpacity={0.9}
        onPress={() => {
          if (isExistingPro) {
            authService.switchRole('pro');
          } else {
            navigation.navigate('ProOnboarding1', {
              name: user?.name ?? 'Professeur',
              email: user?.email ?? '',
              password: '', // unused when isUpgrade === true
              isUpgrade: true,
            });
          }
        }}
      >
        <LinearGradient
          colors={[colors.proGradientStart, colors.proGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.proCardGradient}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.proCardTitle}>
              {isExistingPro ? 'Retour à mon espace professeur' : 'Passer en mode professeur'}
            </Text>
            <Text style={styles.proCardText}>
              {isExistingPro
                ? 'Planning, offres, revenus, participants.'
                : 'Accéder à ton espace pro : planning, offres, revenus.'}
            </Text>
          </View>
          <Text style={styles.proCardArrow}>›</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Dev: tester l'onboarding pro complet */}
      <TouchableOpacity
        style={styles.devSwitch}
        onPress={() => authService.signOut()}
      >
        <Text style={styles.devSwitchText}>Voir l'onboarding complet (dev)</Text>
      </TouchableOpacity>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Koureo v1.0 · Fait avec ♥ à Rennes</Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  sub,
  isLast,
  onPress,
}: {
  icon: string;
  label: string;
  sub?: string;
  isLast?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sub && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },

  // Header
  headerZone: {
    backgroundColor: colors.surface,
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  brand: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLight,
    letterSpacing: 6,
    marginBottom: spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: -spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLight,
    marginTop: 3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Menu
  menuSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  menuCard: { overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuIcon: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  menuSub: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 1,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.textLight,
    fontWeight: '300',
  },

  // Inviter un ami
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    ...shadows.card,
  },
  inviteIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  inviteEmoji: { fontSize: 22 },
  inviteTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  inviteSubtitle: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  inviteChevron: { fontSize: 22, color: colors.primary, fontWeight: '700' },

  // Devenir prof
  proCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.buttonPro,
  },
  proCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  proCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  proCardText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
  },
  proCardArrow: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },

  // Dev switch
  devSwitch: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  devSwitchText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },

  // Sign out
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textLight,
    marginTop: spacing.lg,
    letterSpacing: 0.3,
  },
});
