import { ClassOffer, ClassSession } from '../types/domain';

function iso(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function addMinutes(isoStr: string, minutes: number): string {
  const d = new Date(isoStr);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export const mockClasses: ClassOffer[] = [
  // Alex — new_teacher — GRATUIT obligatoire
  {
    id: 'cls_salsa_decouverte',
    teacherId: '22222222-2222-2222-2222-222222222001',
    title: 'Salsa Découverte',
    category: 'Danse',
    format: 'group',
    level: 'beginner',
    durationMinutes: 60,
    price: 0,
    isFree: true,
    maxParticipants: 8,
    description:
      "Première initiation à la salsa cubaine ! Pas besoin de partenaire, rotation pendant le cours. Je débute comme prof sur la plateforme — cette session est gratuite.",
    imageUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
    cancellationHoursBefore: 48,
  },
  // Sophie — certified_teacher — PAYANT
  {
    id: 'cls_yoga',
    teacherId: '22222222-2222-2222-2222-222222222003',
    title: 'Yoga du Matin',
    category: 'Sport',
    format: 'group',
    level: 'all',
    durationMinutes: 60,
    price: 15,
    isFree: false,
    maxParticipants: 12,
    description:
      "Vinyasa flow doux pour bien commencer la journée. Respirations, postures dynamiques, méditation finale. Tapis fournis.",
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    cancellationHoursBefore: 48,
  },
  // James — professional — PAYANT
  {
    id: 'cls_english',
    teacherId: '22222222-2222-2222-2222-222222222004',
    title: 'English Conversation',
    category: 'Langues',
    format: 'group',
    level: 'intermediate',
    durationMinutes: 60,
    price: 10,
    isFree: false,
    maxParticipants: 6,
    description:
      "Practice your English in a cozy café setting. Free discussion, role-plays, pronunciation games.",
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    cancellationHoursBefore: 48,
  },
  // Marie — under_review — GRATUIT (en attente de certification)
  {
    id: 'cls_poterie',
    teacherId: '22222222-2222-2222-2222-222222222002',
    title: 'Poterie Initiation',
    category: 'Créatif',
    format: 'group',
    level: 'all',
    durationMinutes: 120,
    price: 0,
    isFree: true,
    maxParticipants: 5,
    description:
      "Atelier découverte de la poterie : modelage, premiers tours. Argile et outils fournis. J'attends ma certification pour proposer des ateliers payants.",
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80',
    cancellationHoursBefore: 48,
  },
  // James — PAYANT
  {
    id: 'cls_dj',
    teacherId: '22222222-2222-2222-2222-222222222004',
    title: 'DJ Débutant',
    category: 'Créatif',
    format: 'group',
    level: 'beginner',
    durationMinutes: 120,
    price: 20,
    isFree: false,
    maxParticipants: 8,
    description:
      "Initiation au DJing : mixage, transitions, effets. Platines Pioneer pro fournies. Ambiance conviviale garantie.",
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=800&q=80',
    cancellationHoursBefore: 48,
  },
  // Sophie — PAYANT
  {
    id: 'cls_yoga_yin',
    teacherId: '22222222-2222-2222-2222-222222222003',
    title: 'Yin Yoga Restoratif',
    category: 'Sport',
    format: 'group',
    level: 'all',
    durationMinutes: 75,
    price: 18,
    isFree: false,
    maxParticipants: 10,
    description:
      "Séance Yin : postures tenues longtemps pour relâcher les tensions profondes. Idéal en fin de journée.",
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    cancellationHoursBefore: 48,
  },
];

// Generate sessions per class
export const mockSessions: ClassSession[] = mockClasses.flatMap((cls, idx) => {
  const hours = [19, 8, 18, 14, 20, 17];
  const hour = hours[idx] ?? 18;
  return [0, 1, 3].map((delta, sIdx) => {
    const startsAt = iso(delta, hour);
    const endsAt = addMinutes(startsAt, cls.durationMinutes);
    const bookedCount = Math.floor(cls.maxParticipants * [0.3, 0.6, 0.1][sIdx]!);
    return {
      id: `${cls.id}_s${sIdx}`,
      classId: cls.id,
      startsAt,
      endsAt,
      bookedCount,
      maxParticipants: cls.maxParticipants,
      status:
        bookedCount >= cls.maxParticipants
          ? ('full' as const)
          : ('open' as const),
    };
  });
});

export function getClassById(id: string): ClassOffer | undefined {
  return mockClasses.find((c) => c.id === id);
}

export function getSessionsForClass(classId: string): ClassSession[] {
  return mockSessions
    .filter((s) => s.classId === classId)
    .filter((s) => new Date(s.startsAt) > new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function getSessionById(id: string): ClassSession | undefined {
  return mockSessions.find((s) => s.id === id);
}

export function computeDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
