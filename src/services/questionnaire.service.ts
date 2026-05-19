// Questionnaire service — Supabase-backed
// Table: validation_questionnaires
import { supabase } from './supabase/client';
import { QuestionnaireAnswers, ValidationQuestionnaire, TeacherStatus } from '../types/domain';
import { teachersService } from './teachers.service';
import { bookingsService } from './bookings.service';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Cache for sync reads
const cache = new Map<string, ValidationQuestionnaire>();

function rowToQuestionnaire(row: any): ValidationQuestionnaire {
  return {
    id: row.id,
    bookingId: row.booking_id,
    classId: row.class_id,
    sessionId: row.session_id,
    teacherId: row.teacher_id,
    userId: row.user_id,
    comment: row.comment ?? undefined,
    createdAt: row.created_at,
    answers: {
      q1_onTime: !!row.q1_on_time,
      q2_asDescribed: !!row.q2_as_described,
      q3_serious: !!row.q3_serious,
      q4_recommend: !!row.q4_recommend,
      q5_rating: row.q5_rating as QuestionnaireAnswers['q5_rating'],
    },
  };
}

export const questionnaireService = {
  isRequiredFor(status: TeacherStatus): boolean {
    return status === 'new_teacher' || status === 'under_review';
  },

  async load(): Promise<void> {
    const { data, error } = await supabase.from('validation_questionnaires').select('*');
    if (error) {
      console.warn('load questionnaires:', error.message);
      return;
    }
    cache.clear();
    (data ?? []).forEach((r: any) => {
      const q = rowToQuestionnaire(r);
      cache.set(q.id, q);
    });
    notify();
  },

  listForTeacher(teacherId: string): ValidationQuestionnaire[] {
    return Array.from(cache.values()).filter((q) => q.teacherId === teacherId);
  },

  listForUser(userId: string): ValidationQuestionnaire[] {
    return Array.from(cache.values()).filter((q) => q.userId === userId);
  },

  hasAnsweredForBooking(bookingId: string): boolean {
    return Array.from(cache.values()).some((q) => q.bookingId === bookingId);
  },

  async submit(input: {
    bookingId: string;
    classId: string;
    sessionId: string;
    teacherId: string;
    userId: string;
    answers: QuestionnaireAnswers;
    comment?: string;
  }): Promise<ValidationQuestionnaire> {
    const { data, error } = await supabase
      .from('validation_questionnaires')
      .insert({
        booking_id: input.bookingId,
        class_id: input.classId,
        session_id: input.sessionId,
        teacher_id: input.teacherId,
        user_id: input.userId,
        q1_on_time: input.answers.q1_onTime,
        q2_as_described: input.answers.q2_asDescribed,
        q3_serious: input.answers.q3_serious,
        q4_recommend: input.answers.q4_recommend,
        q5_rating: input.answers.q5_rating,
        comment: input.comment ?? null,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Envoi du questionnaire échoué');

    const q = rowToQuestionnaire(data);
    cache.set(q.id, q);

    // Mark booking questionnaire as completed
    await bookingsService.markQuestionnaireCompleted(input.bookingId);

    // Recompute teacher aggregate metrics (rating + review_count + avg_validation_score)
    const responses = this.listForTeacher(input.teacherId);
    if (responses.length > 0) {
      const avg = responses.reduce((s, r) => s + r.answers.q5_rating, 0) / responses.length;
      const rounded = Math.round(avg * 10) / 10;
      await supabase
        .from('teacher_profiles')
        .update({
          avg_validation_score: rounded,
          validation_response_count: responses.length,
          rating: rounded,
          review_count: responses.length,
        })
        .eq('id', input.teacherId);

      // Refresh teacher cache with updated metrics
      await teachersService.refresh(input.teacherId);

      // Attempt auto-promotion (reads from Supabase)
      await teachersService.promoteIfEligible(input.teacherId);
    }

    notify();
    return q;
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
