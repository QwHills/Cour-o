import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme/theme';

export default function OrgClassesScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cours & créneaux</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.body}>
        <Ionicons name="grid-outline" size={48} color={colors.textLight} />
        <Text style={styles.title}>Cours multi-profs</Text>
        <Text style={styles.text}>
          Ici tu créeras les cours de ta structure et tu assigneras un prof à
          chaque séance (Clara le lundi, Marc le mercredi…). Disponible en
          phase 3.
        </Text>
      </View>
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
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  text: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
