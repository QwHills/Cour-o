import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { bookingsService } from '../../services/bookings.service';
import { coursesService } from '../../services/courses.service';
import { questionnaireService } from '../../services/questionnaire.service';
import { authService } from '../../services/auth.service';
import { teachersService } from '../../services/teachers.service';
import { QuestionnaireAnswers } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const QUESTIONS = [
  { key: 'q1_onTime', label: 'Le professeur était-il à l\'heure ?' },
  { key: 'q2_asDescribed', label: 'Le cours correspondait-il à la description ?' },
  { key: 'q3_serious', label: 'Avez-vous trouvé le professeur sérieux ?' },
  { key: 'q4_recommend', label: 'Recommanderiez-vous ce cours ?' },
] as const;

export default function PostClassQuestionnaireScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { bookingId } = route.params;
  const booking = bookingsService.get(bookingId);
  const course = booking ? coursesService.get(booking.classId) : null;

  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!booking || !course || !course.teacher) {
    return <View style={styles.container} />;
  }

  const teacherStatus = teachersService.getStatus(course.teacher.id) ?? 'new_teacher';
  const isInEvaluation = questionnaireService.isRequiredFor(teacherStatus);
  const subtitle = isInEvaluation
    ? `Ton avis aide ${course.teacher.displayName} à progresser vers la certification.`
    : `Ton avis aide la communauté à choisir et ${course.teacher.displayName} à s'améliorer.`;

  const allAnswered =
    answers.q1_onTime !== undefined &&
    answers.q2_asDescribed !== undefined &&
    answers.q3_serious !== undefined &&
    answers.q4_recommend !== undefined &&
    answers.q5_rating !== undefined;

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Non connecté');
      await questionnaireService.submit({
        bookingId: booking.id,
        classId: booking.classId,
        sessionId: booking.sessionId,
        teacherId: booking.teacherId,
        userId: user.id,
        answers: answers as QuestionnaireAnswers,
        comment: comment || undefined,
      });
      bookingsService.markQuestionnaireCompleted(booking.id);
      Alert.alert(
        'Merci pour ton retour ! 🙏',
        isInEvaluation
          ? "Ton avis aide la plateforme à valider les nouveaux professeurs."
          : "Ton avis est publié et aide toute la communauté Koureo.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ton retour</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <Text style={styles.title}>
          Comment s'est passé ton cours de{'\n'}
          <Text style={{ color: colors.primary }}>{course.class.title}</Text> ?
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {QUESTIONS.map((q) => (
          <Card key={q.key} style={styles.block}>
            <Text style={styles.question}>{q.label}</Text>
            <View style={styles.yesNoRow}>
              <YesNoButton
                label="Oui"
                active={answers[q.key] === true}
                onPress={() => setAnswers({ ...answers, [q.key]: true })}
                variant="yes"
              />
              <YesNoButton
                label="Non"
                active={answers[q.key] === false}
                onPress={() => setAnswers({ ...answers, [q.key]: false })}
                variant="no"
              />
            </View>
          </Card>
        ))}

        <Card style={styles.block}>
          <Text style={styles.question}>Note globale</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setAnswers({ ...answers, q5_rating: star as 1 | 2 | 3 | 4 | 5 })}
                style={styles.starBtn}
              >
                <Text
                  style={[
                    styles.starIcon,
                    (answers.q5_rating ?? 0) >= star && styles.starActive,
                  ]}
                >
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <View style={styles.block}>
          <Input
            label="Commentaire (facultatif)"
            placeholder="Partage ton expérience…"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 100 }}
          />
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label={loading ? 'Envoi…' : 'Envoyer mon retour'}
          onPress={handleSubmit}
          disabled={!allAnswered}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function YesNoButton({
  label,
  active,
  onPress,
  variant,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  variant: 'yes' | 'no';
}) {
  const activeColor = variant === 'yes' ? colors.success : colors.error;
  return (
    <TouchableOpacity
      style={[
        styles.yesNoBtn,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.yesNoText, active && { color: '#FFFFFF' }]}>
        {label}
      </Text>
    </TouchableOpacity>
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
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  close: { fontSize: 22, color: colors.text, width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 30, marginBottom: spacing.sm, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 19 },
  block: { marginBottom: spacing.md },
  question: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  yesNoRow: { flexDirection: 'row', gap: spacing.md },
  yesNoBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  yesNoText: { fontSize: 14, fontWeight: '700', color: colors.text },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  starBtn: { padding: spacing.xs },
  starIcon: { fontSize: 44, color: colors.borderLight },
  starActive: { color: colors.accent },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
