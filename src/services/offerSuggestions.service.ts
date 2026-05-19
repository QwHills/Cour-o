// Offer suggestions service — Supabase-backed
// Un prof suggère un produit (pack/abo) à un élève régulier.
// Flow : check cooldown 14j → envoie notif + message chat → log la suggestion.

import { supabase } from './supabase/client';
import { Product } from '../types/domain';
import { messagingService } from './messaging.service';
import { notificationsService } from './notifications.service';

export interface SuggestionResult {
  ok: boolean;
  reason?: 'cooldown' | 'error';
  cooldownDaysRemaining?: number;
  message?: string;
}

function priceLabel(p: Product): string {
  const eur = `${p.price.toFixed(0)} €`;
  if (p.kind === 'monthly_subscription') return `${eur} / mois`;
  if (p.kind === 'credit_pack') return `${eur} pour ${p.creditsGranted ?? '?'} cours`;
  return eur;
}

function buildMessage(
  teacherName: string,
  studentName: string,
  product: Product,
  unitPaymentsCount: number,
): string {
  const productSummary = `${product.name} — ${priceLabel(product)}`;
  return [
    `Salut ${studentName.split(' ')[0]} !`,
    '',
    `Je vois que tu réserves régulièrement chez moi à l'unité` +
      (unitPaymentsCount > 0 ? ` (${unitPaymentsCount} fois)` : '') +
      `. J'ai une offre qui pourrait t'intéresser :`,
    '',
    `→ ${productSummary}`,
    '',
    product.kind === 'credit_pack'
      ? `Tu utilises les crédits à ton rythme sur mes cours.`
      : product.kind === 'monthly_subscription'
        ? `Tu accèdes à tous mes cours sans repasser par la caisse.`
        : '',
    '',
    `Dis-moi ce que tu en penses !`,
    `— ${teacherName}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Lightweight record returned by the list helpers — only the fields the UI
 * needs to render a CTA below the chat message. Joined product is optional
 * because it might be missing if the product was deleted after suggestion.
 */
export interface OfferSuggestionRow {
  id: string;
  teacherId: string;
  userId: string;
  productId: string;
  messageId: string | null;
  notificationId: string | null;
  createdAt: string;
}

function rowToSuggestion(row: any): OfferSuggestionRow {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    userId: row.user_id,
    productId: row.product_id,
    messageId: row.message_id ?? null,
    notificationId: row.notification_id ?? null,
    createdAt: row.created_at,
  };
}

export const offerSuggestionsService = {
  /**
   * Fetch suggestions exchanged between (user, teacher) — used by the chat
   * UI to render a CTA ("Voir les offres de X") below the linked message.
   * Returns most recent first.
   */
  async listForConversation(
    userId: string,
    teacherId: string,
  ): Promise<OfferSuggestionRow[]> {
    const { data, error } = await supabase
      .from('offer_suggestions')
      .select('*')
      .eq('user_id', userId)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('list offer suggestions:', error.message);
      return [];
    }
    return (data ?? []).map(rowToSuggestion);
  },

  /**
   * Check whether the cooldown allows suggesting the product to the student
   * again. Returns null if allowed, or the days remaining if blocked.
   */
  async checkCooldown(
    teacherId: string,
    userId: string,
    productId: string,
  ): Promise<{ allowed: boolean; daysRemaining?: number }> {
    const { data, error } = await supabase
      .from('offer_suggestions')
      .select('created_at')
      .eq('teacher_id', teacherId)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      console.warn('cooldown check:', error.message);
      return { allowed: true }; // fail open
    }
    if (!data || data.length === 0) return { allowed: true };
    const last = new Date(data[0].created_at).getTime();
    const elapsedDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
    const remaining = Math.max(0, Math.ceil(14 - elapsedDays));
    return { allowed: false, daysRemaining: remaining };
  },

  /**
   * Send a suggestion :
   *  1. Insert into `offer_suggestions` (cooldown log)
   *  2. Send in-app notification to the student
   *  3. Auto-send a chat message in the (user, teacher) conversation
   *
   * All three are best-effort; if step 1 fails the whole call aborts.
   * If step 2 or 3 fails, we still consider the suggestion sent so the
   * cooldown applies (avoids retry-spam).
   */
  async sendSuggestion(input: {
    teacherId: string;
    teacherUserId: string; // public.users.id of the teacher (for chat sender)
    teacherDisplayName: string;
    student: { id: string; name: string };
    product: Product;
    unitPaymentsCount: number;
  }): Promise<SuggestionResult> {
    const { teacherId, teacherDisplayName, student, product } = input;

    // 1. Cooldown
    const cd = await this.checkCooldown(teacherId, student.id, product.id);
    if (!cd.allowed) {
      return {
        ok: false,
        reason: 'cooldown',
        cooldownDaysRemaining: cd.daysRemaining,
        message: `Tu as déjà suggéré cette offre à ${student.name.split(' ')[0]} récemment. Tu pourras lui reproposer dans ${cd.daysRemaining} jour${(cd.daysRemaining ?? 0) > 1 ? 's' : ''}.`,
      };
    }

    // 2. Chat message
    let messageId: string | null = null;
    try {
      const conv = await messagingService.getOrCreateConversation(
        student.id,
        teacherId,
      );
      const body = buildMessage(
        teacherDisplayName,
        student.name,
        product,
        input.unitPaymentsCount,
      );
      const msg = await messagingService.sendMessage(conv.id, 'teacher', body);
      messageId = msg.id;
    } catch (e) {
      console.warn('offer suggestion: chat message send failed', (e as Error).message);
    }

    // 3. In-app notification
    let notificationId: string | null = null;
    try {
      const notif = await notificationsService.send({
        userId: student.id,
        type: 'offer_suggestion',
        title: `💡 ${teacherDisplayName} a une offre pour toi`,
        body: `${product.name} — ${priceLabel(product)}. Consulte ses offres pour en profiter.`,
        action: {
          screen: 'TeacherProfile',
          params: { teacherId },
        },
      });
      notificationId = notif?.id ?? null;
    } catch (e) {
      console.warn('offer suggestion: notification send failed', (e as Error).message);
    }

    // 4. Log
    const { error: logError } = await supabase.from('offer_suggestions').insert({
      teacher_id: teacherId,
      user_id: student.id,
      product_id: product.id,
      message_id: messageId,
      notification_id: notificationId,
    });
    if (logError) {
      console.warn('offer suggestion log:', logError.message);
      return {
        ok: false,
        reason: 'error',
        message:
          "Suggestion envoyée mais impossible d'enregistrer. Tu pourras peut-être la renvoyer immédiatement.",
      };
    }

    return {
      ok: true,
      message: `Suggestion envoyée à ${student.name.split(' ')[0]} ✓`,
    };
  },
};
