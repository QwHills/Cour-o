import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii } from '../../theme/theme';

const SECTIONS = [
  {
    title: '1. Objet',
    content:
      "Les présentes Conditions Générales d'Utilisation (CGU) encadrent l'utilisation de l'application Koureo, plateforme permettant de :\n\n• Découvrir des cours et activités\n• Réserver et payer des prestations\n• Mettre en relation des participants et des professeurs",
  },
  {
    title: '2. Rôle de Koureo',
    content:
      "Koureo agit exclusivement comme une plateforme de mise en relation entre des participants et des professeurs (professionnels ou particuliers).\n\nKoureo n'est ni organisateur, ni prestataire des cours proposés.",
  },
  {
    title: '3. Responsabilité des professeurs',
    content:
      "Chaque professeur est seul responsable de l'organisation de ses cours, du contenu pédagogique, du respect des règles de sécurité, de l'accueil des participants et du lieu de l'activité.\n\nLe professeur s'engage à :\n• Proposer des cours adaptés au niveau annoncé\n• Garantir des conditions de sécurité normales\n• Être titulaire d'une assurance responsabilité civile couvrant son activité",
  },
  {
    title: '4. Responsabilité des participants',
    content:
      "Le participant reconnaît participer volontairement aux activités, être en capacité physique de suivre le cours réservé et respecter les consignes du professeur.\n\nIl est responsable de son comportement, de ses effets personnels et de son état de santé.",
  },
  {
    title: '5. Limitation de responsabilité',
    content:
      "Koureo ne pourra être tenu responsable en cas d'accident survenu pendant un cours, de blessure ou dommage corporel, de litige entre participant et professeur, ou d'annulation ou modification du cours.\n\nKoureo agit uniquement comme intermédiaire technique.",
  },
  {
    title: '6. Réservation et paiement',
    content:
      "Le paiement est effectué via la plateforme. Koureo prélève une commission de 12%. Le solde est reversé au professeur après le cours.",
  },
  {
    title: '7. Annulation',
    content:
      "Annulation possible jusqu'à 48h avant le cours avec remboursement intégral. Au-delà, aucun remboursement sauf exception.",
  },
  {
    title: '8. Système de notation',
    content:
      "Les participants peuvent évaluer les cours. Koureo peut suspendre un professeur en cas de mauvaise qualité récurrente.",
  },
  {
    title: '9. Statut des professeurs',
    content:
      "Les professeurs peuvent être : particuliers en phase d'évaluation, professeurs certifiés, ou professionnels.\n\nLes particuliers doivent valider 3 cours gratuits et obtenir une note moyenne ≥ 4/5 pour accéder aux cours payants.",
  },
  {
    title: '10. Données personnelles',
    content:
      "Koureo collecte uniquement les données nécessaires à la gestion des réservations, la mise en relation et le paiement.",
  },
  {
    title: '11. Acceptation',
    content:
      "L'utilisation de l'application implique l'acceptation des présentes CGU.",
  },
];

export default function CGUScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>KOUREO</Text>
        <Text style={styles.pageTitle}>
          Conditions Générales{'\n'}d'Utilisation
        </Text>
        <Text style={styles.lastUpdate}>
          Dernière mise à jour : avril 2026
        </Text>

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Koureo SAS · Rennes, France
          </Text>
        </View>
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
  headerTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  brand: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textLight,
    letterSpacing: 6,
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  lastUpdate: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textLight,
  },
});
