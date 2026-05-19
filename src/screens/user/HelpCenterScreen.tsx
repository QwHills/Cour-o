import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radii, shadows } from '../../theme/theme';

const FAQ = [
  {
    category: 'Réservation',
    items: [
      {
        q: 'Comment réserver un cours ?',
        a: "Explore la carte ou utilise la recherche, tape sur un cours qui t'intéresse, choisis un créneau puis paie via la plateforme. Tu reçois une confirmation immédiate.",
      },
      {
        q: 'Puis-je annuler ma réservation ?',
        a: "Oui, jusqu'à 48h avant le cours avec remboursement intégral. Au-delà, l'annulation n'est plus remboursable sauf cas exceptionnel.",
      },
      {
        q: 'Quand l\'adresse exacte m\'est communiquée ?',
        a: "Pour protéger les professeurs, l'adresse exacte n'est dévoilée qu'après confirmation de ta réservation. Avant ça, tu vois le quartier sur la carte.",
      },
    ],
  },
  {
    category: 'Paiement',
    items: [
      {
        q: 'Comment suis-je débité ?',
        a: "Le paiement est effectué via Stripe au moment de la réservation. Ton argent est sécurisé sur Koureo jusqu'au cours, puis versé au professeur.",
      },
      {
        q: 'Que se passe-t-il si j\'ai un problème avec le cours ?',
        a: "Tu as 24h après le cours pour signaler un problème depuis tes réservations. Le paiement est gelé le temps que l'équipe Koureo statue.",
      },
      {
        q: 'Pourquoi certains cours sont-ils gratuits ?',
        a: "Les nouveaux professeurs proposent leurs 3 premiers cours gratuitement pendant leur phase d'évaluation. Ton retour compte pour les aider à être certifiés.",
      },
    ],
  },
  {
    category: 'Profs & Certification',
    items: [
      {
        q: 'Que signifient les badges des professeurs ?',
        a: "Nouveau : débute sur Koureo, 3 cours gratuits requis. En évaluation : a donné ses cours, attend la validation. Certifié : note ≥ 4/5 validée par la plateforme. Pro : professionnel déclaré avec SIRET.",
      },
      {
        q: 'Pourquoi un questionnaire après certains cours ?',
        a: "Les cours avec des nouveaux professeurs déclenchent un questionnaire de 5 questions pour aider à leur certification. C'est rapide et ton avis compte énormément.",
      },
    ],
  },
  {
    category: 'Compte',
    items: [
      {
        q: 'Comment modifier mes informations ?',
        a: "Va dans Profil > Modifier mon profil. Tu peux changer ton prénom, ta ville et ta bio. L'email ne peut pas être modifié depuis l'app.",
      },
      {
        q: 'Comment supprimer mon compte ?',
        a: "Contacte-nous via le formulaire de contact. Ton compte et toutes tes données seront supprimés dans les 30 jours.",
      },
    ],
  },
];

export default function HelpCenterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = FAQ.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (i) =>
        !search ||
        i.q.toLowerCase().includes(search.toLowerCase()) ||
        i.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Centre d'aide</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Comment pouvons-nous{'\n'}t'aider ?</Text>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une question…"
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun résultat trouvé.</Text>
          </View>
        ) : (
          filtered.map((cat) => (
            <View key={cat.category} style={styles.section}>
              <Text style={styles.sectionTitle}>{cat.category}</Text>
              {cat.items.map((item, idx) => {
                const key = `${cat.category}-${idx}`;
                const isOpen = expanded === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.faqItem}
                    activeOpacity={0.85}
                    onPress={() => setExpanded(isOpen ? null : key)}
                  >
                    <View style={styles.faqQuestion}>
                      <Text style={styles.faqQ}>{item.q}</Text>
                      <Text style={styles.faqArrow}>{isOpen ? '−' : '+'}</Text>
                    </View>
                    {isOpen && <Text style={styles.faqA}>{item.a}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.contactCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Contact')}
        >
          <View style={styles.contactIcon}>
            <Text style={styles.contactIconText}>○</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Tu n'as pas trouvé ta réponse ?</Text>
            <Text style={styles.contactText}>Contacte l'équipe Koureo, on te répond sous 24h.</Text>
          </View>
          <Text style={styles.contactArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 32,
    marginBottom: spacing.lg,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchIcon: { fontSize: 18, color: colors.textSecondary },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  faqItem: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  faqArrow: { fontSize: 22, color: colors.textLight, fontWeight: '300' },
  faqA: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactIconText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  contactTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  contactText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  contactArrow: { fontSize: 22, color: colors.textLight, fontWeight: '300' },

  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { fontSize: 13, color: colors.textSecondary },
});
