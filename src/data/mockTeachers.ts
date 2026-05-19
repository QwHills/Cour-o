import { TeacherProfile } from '../types/domain';

// 4 profils démo avec statuts variés
export const mockTeachers: TeacherProfile[] = [
  {
    id: '22222222-2222-2222-2222-222222222001',
    userId: '11111111-1111-1111-1111-111111111001',
    kind: 'particulier',
    status: 'new_teacher',
    displayName: 'Alex Moreau',
    bio: "Passionné de salsa depuis 5 ans, je souhaite partager ma passion. Débutant sur la plateforme — cours d'initiation gratuits pour me lancer !",
    photoUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80',
    categories: ['Danse'],
    address: '12 Rue Saint-Michel, Rennes',
    latitude: 48.1108,
    longitude: -1.6795,
    rating: 0,
    reviewCount: 0,
    freeClassesCompleted: 1,
    avgValidationScore: 0,
    validationResponseCount: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222002',
    userId: '11111111-1111-1111-1111-111111111002',
    kind: 'particulier',
    status: 'under_review',
    displayName: 'Marie Lefèvre',
    bio: "Céramiste amateure. J'ai déjà donné mes 3 premiers cours gratuits, et j'attends d'être certifiée pour proposer des ateliers payants.",
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    categories: ['Créatif'],
    address: '5 Rue de Dinan, Rennes',
    latitude: 48.114,
    longitude: -1.683,
    rating: 4.2,
    reviewCount: 3,
    freeClassesCompleted: 3,
    avgValidationScore: 4.2,
    validationResponseCount: 3,
  },
  {
    id: '22222222-2222-2222-2222-222222222003',
    userId: '11111111-1111-1111-1111-111111111003',
    kind: 'particulier',
    status: 'certified_teacher',
    displayName: 'Sophie Martin',
    bio: "Prof de yoga certifiée 500h. J'enseigne Vinyasa et Yin depuis 6 ans dans le centre de Rennes.",
    photoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
    categories: ['Sport'],
    address: '8 Place de la République, Rennes',
    latitude: 48.11,
    longitude: -1.6785,
    rating: 4.9,
    reviewCount: 89,
    freeClassesCompleted: 3,
    avgValidationScore: 4.9,
    validationResponseCount: 89,
    certifiedAt: '2024-06-15T00:00:00Z',
    billingConfig: {
      vatRegime: 'non_assujetti',
      legalName: 'Sophie Martin',
      siret: '987 654 321 00015',
      address: '8 Place de la République, 35000 Rennes',
    },
    photos: {
      place: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80',
      self: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80',
      activity: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    },
  },
  {
    id: '22222222-2222-2222-2222-222222222004',
    userId: '11111111-1111-1111-1111-111111111004',
    kind: 'professional',
    status: 'professional',
    displayName: 'James Wilson',
    bio: "Native English speaker from London. Professeur d'anglais diplômé, CELTA certified, 10+ ans d'expérience.",
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    categories: ['Langues'],
    address: '22 Rue Saint-Georges, Rennes',
    latitude: 48.1125,
    longitude: -1.6815,
    rating: 4.7,
    reviewCount: 56,
    freeClassesCompleted: 0,
    avgValidationScore: 4.7,
    validationResponseCount: 56,
    stripeAccountId: 'acct_mock_james',
    billingConfig: {
      vatRegime: 'tva_20',
      vatNumber: 'FR32123456789',
      legalName: 'Wilson English SARL',
      siret: '123 456 789 00012',
      address: '22 Rue Saint-Georges, 35000 Rennes',
    },
    photos: {
      place: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
      self: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
      activity: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    },
  },
];

export function getTeacherById(id: string): TeacherProfile | undefined {
  return mockTeachers.find((t) => t.id === id);
}

export function getTeacherByUserId(userId: string): TeacherProfile | undefined {
  return mockTeachers.find((t) => t.userId === userId);
}

export function addTeacher(profile: TeacherProfile): void {
  mockTeachers.push(profile);
}

export function updateTeacher(id: string, patch: Partial<TeacherProfile>): void {
  const idx = mockTeachers.findIndex((t) => t.id === id);
  if (idx >= 0) {
    mockTeachers[idx] = { ...mockTeachers[idx]!, ...patch };
  }
}
