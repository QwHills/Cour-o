// Invoice service — Supabase-backed
// Table: invoices — one row per paid booking.
import { supabase } from './supabase/client';
import {
  Invoice,
  VatRegime,
  Booking,
  TeacherBillingConfig,
} from '../types/domain';
import { teachersService } from './teachers.service';
import { coursesService } from './courses.service';
import { calculateCommission } from './commission.service';
import { formatFullDate, formatDuration } from '../utils/date';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Cache
const cache = new Map<string, Invoice>();
const byBooking = new Map<string, string>(); // bookingId → invoiceId

function rowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    bookingId: row.booking_id,
    teacherId: row.teacher_id,
    participantId: row.user_id,
    priceHT: Number(row.price_ht ?? 0),
    vatRate: Number(row.vat_rate ?? 0),
    vatAmount: Number(row.vat_amount ?? 0),
    priceTTC: Number(row.price_ttc ?? 0),
    commissionHT: Number(row.commission_ht ?? 0),
    teacherNetAmount: Number(row.teacher_net_amount ?? 0),
    vatRegime: row.vat_regime as VatRegime,
    vatMention: row.vat_mention,
    issuedAt: row.issued_at,
    teacherName: row.teacher_name,
    teacherAddress: row.teacher_address ?? '',
    teacherSiret: row.teacher_siret ?? undefined,
    teacherVatNumber: row.teacher_vat_number ?? undefined,
    participantName: row.participant_name,
    participantEmail: row.participant_email,
    courseTitle: row.course_title,
    courseDate: row.course_date,
    courseDuration: row.course_duration,
  };
}

function cacheInvoice(inv: Invoice) {
  cache.set(inv.id, inv);
  byBooking.set(inv.bookingId, inv.id);
}

function getVatDetails(regime: VatRegime, priceTTC: number) {
  switch (regime) {
    case 'tva_20':
      const ht = Math.round((priceTTC / 1.2) * 100) / 100;
      const vatAmount = Math.round((priceTTC - ht) * 100) / 100;
      return {
        priceHT: ht,
        vatRate: 0.2,
        vatAmount,
        priceTTC,
        mention: 'TVA 20%',
      };
    case 'exonere_formation':
      return {
        priceHT: priceTTC,
        vatRate: 0,
        vatAmount: 0,
        priceTTC,
        mention: "Exonération de TVA, art. 261-4-4° du CGI",
      };
    case 'non_assujetti':
    default:
      return {
        priceHT: priceTTC,
        vatRate: 0,
        vatAmount: 0,
        priceTTC,
        mention: 'TVA non applicable, art. 293 B du CGI',
      };
  }
}

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });
  const n = (count ?? 0) + 1;
  return `KOUREO-${year}-${String(n).padStart(4, '0')}`;
}

export const invoiceService = {
  async load(): Promise<void> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('issued_at', { ascending: false });
    if (error) {
      console.warn('load invoices:', error.message);
      return;
    }
    cache.clear();
    byBooking.clear();
    (data ?? []).forEach((r: any) => cacheInvoice(rowToInvoice(r)));
    notify();
  },

  async generateInvoice(
    booking: Booking,
    participantName: string,
    participantEmail: string
  ): Promise<Invoice> {
    // Idempotent: return existing
    const existingId = byBooking.get(booking.id);
    if (existingId) {
      const existing = cache.get(existingId);
      if (existing) return existing;
    }
    // Also check DB in case cache is stale
    const { data: existingRow } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', booking.id)
      .maybeSingle();
    if (existingRow) {
      const inv = rowToInvoice(existingRow);
      cacheInvoice(inv);
      return inv;
    }

    const teacher = teachersService.getCached(booking.teacherId);
    const cls = coursesService.getClass(booking.classId);
    if (!teacher || !cls) throw new Error('Données introuvables');

    const billing: TeacherBillingConfig = teacher.billingConfig ?? {
      vatRegime: 'non_assujetti',
      legalName: teacher.displayName,
      address: teacher.address,
    };

    const vat = getVatDetails(billing.vatRegime, booking.priceTotal);
    const commission = calculateCommission(booking.priceTotal);
    const invoiceNumber = await nextInvoiceNumber();

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        booking_id: booking.id,
        teacher_id: booking.teacherId,
        user_id: booking.userId,
        price_ht: vat.priceHT,
        vat_rate: vat.vatRate,
        vat_amount: vat.vatAmount,
        price_ttc: vat.priceTTC,
        commission_ht: commission.commissionAmount,
        teacher_net_amount: commission.proAmount,
        vat_regime: billing.vatRegime,
        vat_mention: vat.mention,
        teacher_name: billing.legalName,
        teacher_address: billing.address,
        teacher_siret: billing.siret ?? null,
        teacher_vat_number: billing.vatNumber ?? null,
        participant_name: participantName,
        participant_email: participantEmail,
        course_title: cls.title,
        course_date: formatFullDate(booking.sessionStartsAt),
        course_duration: formatDuration(cls.durationMinutes),
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Facture échouée');

    const invoice = rowToInvoice(data);
    cacheInvoice(invoice);
    notify();
    return invoice;
  },

  getForBooking(bookingId: string): Invoice | undefined {
    const id = byBooking.get(bookingId);
    return id ? cache.get(id) : undefined;
  },

  getForTeacher(teacherId: string): Invoice[] {
    return Array.from(cache.values())
      .filter((i) => i.teacherId === teacherId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  getForUser(userId: string): Invoice[] {
    return Array.from(cache.values())
      .filter((i) => i.participantId === userId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  getVatLabel(regime: VatRegime): string {
    switch (regime) {
      case 'non_assujetti': return 'Non assujetti (auto-entrepreneur)';
      case 'tva_20': return 'TVA 20%';
      case 'exonere_formation': return 'Exonéré formation';
    }
  },

  getVatShortLabel(regime: VatRegime): string {
    switch (regime) {
      case 'non_assujetti': return 'Sans TVA';
      case 'tva_20': return '20% TVA';
      case 'exonere_formation': return 'Exonéré';
    }
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
