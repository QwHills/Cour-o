import { ValidationQuestionnaire } from '../types/domain';

// 3 réponses existantes pour Marie (under_review) — moyenne 4.2
const marieQuestionnaires: ValidationQuestionnaire[] = [
  {
    id: 'vq_1',
    bookingId: 'bk_past_1',
    classId: 'cls_poterie',
    sessionId: 'cls_poterie_past1',
    teacherId: '22222222-2222-2222-2222-222222222002',
    userId: 'u_client1',
    answers: {
      q1_onTime: true,
      q2_asDescribed: true,
      q3_serious: true,
      q4_recommend: true,
      q5_rating: 4,
    },
    comment: 'Très sympathique, beau matériel. Je reviendrai !',
    createdAt: '2026-03-20T18:00:00Z',
  },
  {
    id: 'vq_2',
    bookingId: 'bk_past_2',
    classId: 'cls_poterie',
    sessionId: 'cls_poterie_past2',
    teacherId: '22222222-2222-2222-2222-222222222002',
    userId: 'u_client2',
    answers: {
      q1_onTime: true,
      q2_asDescribed: true,
      q3_serious: true,
      q4_recommend: true,
      q5_rating: 5,
    },
    createdAt: '2026-03-28T19:30:00Z',
  },
  {
    id: 'vq_3',
    bookingId: 'bk_past_3',
    classId: 'cls_poterie',
    sessionId: 'cls_poterie_past3',
    teacherId: '22222222-2222-2222-2222-222222222002',
    userId: 'u_client3',
    answers: {
      q1_onTime: true,
      q2_asDescribed: false,
      q3_serious: true,
      q4_recommend: true,
      q5_rating: 4,
    },
    comment: "Cours un peu court mais Marie est très pédagogue.",
    createdAt: '2026-04-05T15:00:00Z',
  },
];

// 89 avis pour Sophie Martin (yoga, certifiée) — moyenne 4.9
// 80 × 5★ + 9 × 4★ = 436 / 89 = 4.90
const sophieComments: string[] = [
  "Sophie est une prof exceptionnelle. Séance de Vinyasa fluide, ambiance très apaisante. Je recommande les yeux fermés !",
  "Premier cours de yoga de ma vie et je ressors conquise. Sophie adapte les postures aux débutants, vraiment bienveillante.",
  "Cours de Yin très profond, beaucoup de relâchement. Lieu magnifique, petits effectifs, parfait pour se reconnecter.",
  "Je suis cliente depuis 6 mois et chaque séance est différente. Sophie connaît son métier, niveau exigeant mais accessible.",
  "Super ambiance, salle lumineuse et Sophie guide la respiration avec beaucoup de justesse. Pratique complète.",
  "Vinyasa dynamique mais sans jamais pousser dans ses retranchements. J'ai bien transpiré et me sens régénérée !",
  "Une vraie pédagogue. Elle corrige les postures avec douceur, explique l'intention de chaque asana. Top.",
  "Cours du mardi soir génial pour décompresser après le boulot. Sophie est aussi très à l'écoute avant la séance.",
  "Très bon rapport qualité/prix pour la région rennaise. Sophie prend le temps d'accueillir chacun individuellement.",
  "J'apprécie particulièrement la méditation guidée de fin de séance. On repart vraiment zen.",
  "Sophie maîtrise son sujet, on sent les 500h de formation derrière. Cours structuré, progression claire.",
  "Endroit calme en plein centre-ville, c'est un vrai petit cocon. Sophie accueille toujours avec un grand sourire.",
  "Yin yoga du dimanche matin = mon rituel. Sophie crée une vraie bulle hors du temps.",
  "J'ai essayé plein de profs à Rennes, Sophie est de loin la plus pédagogue. Je recommande à mes collègues.",
  "Petit groupe de 8 max, du coup Sophie passe voir tout le monde. Gros plus vs les grands studios anonymes.",
  "Cours exigeant niveau intermédiaire, pile ce que je cherchais. Bonne variété de flows d'une semaine à l'autre.",
  "Un seul bémol : les créneaux partent vite ! Pensez à réserver tôt. Cours au top sinon.",
  "Sophie propose vraiment des alternatives pour chaque posture selon ton niveau. J'ai beaucoup progressé en 3 mois.",
  "Vraiment professionnelle, ponctuelle, le matériel est impeccable. Je reprendrai à la rentrée.",
  "Séance restorative du vendredi soir, pur moment de lâcher-prise. Merci Sophie !",
];

const sophieQuestionnaires: ValidationQuestionnaire[] = Array.from({ length: 89 }, (_, i) => {
  const rating: 4 | 5 = i < 9 ? 4 : 5; // 9 × 4★ puis 80 × 5★
  const hasComment = i < sophieComments.length;
  const daysAgo = 3 + i * 4; // étalé sur ~1 an, du plus récent au plus ancien
  const date = new Date('2026-04-20T18:00:00Z');
  date.setUTCDate(date.getUTCDate() - daysAgo);

  return {
    id: `vq_sophie_${i + 1}`,
    bookingId: `bk_sophie_past_${i + 1}`,
    classId: 'cls_yoga',
    sessionId: `cls_yoga_past_${i + 1}`,
    teacherId: '22222222-2222-2222-2222-222222222003',
    userId: `u_yoga_${(i % 40) + 1}`,
    answers: {
      q1_onTime: true,
      q2_asDescribed: rating === 5,
      q3_serious: true,
      q4_recommend: true,
      q5_rating: rating,
    },
    comment: hasComment ? sophieComments[i] : undefined,
    createdAt: date.toISOString(),
  };
});

// 56 avis pour James Wilson (prof d'anglais pro) — moyenne 4.7
// 40 × 5★ + 16 × 4★ = 264 / 56 = 4.71
const jamesComments: string[] = [
  "James est patient et pédagogue, parfait pour reprendre confiance à l'oral. Beaucoup de jeux de rôles, on ne s'ennuie jamais.",
  "Native speaker, ça s'entend ! Accent britannique authentique, vocabulaire riche. Je progresse vite en conversation.",
  "Cours en petit groupe (6 max), on a tous largement le temps de parler. James corrige sans interrompre, top.",
  "Great teacher. Lessons are well structured, mix of grammar drills and free talk. Highly recommended.",
  "J'avais besoin de préparer un entretien pro en anglais, James m'a coaché sur 4 séances. Job obtenu !",
  "Ambiance café très agréable, on oublie qu'on apprend. Idéal pour pratiquer sans la pression du cadre scolaire.",
  "Les role-plays sur des situations pro (meetings, calls, presentations) sont hyper utiles au quotidien.",
  "James adapte le niveau individuellement même en groupe. Mon mari est avancé, moi intermédiaire, on est tous les deux challengés.",
  "Super prof, vrais échanges culturels sur UK, humour british inclus. Pas juste de la grammaire sèche.",
  "10 ans de cours particuliers derrière moi — James est dans le top 3. CELTA + expérience = combo gagnant.",
  "Format conversation game-changer. En 2 mois je me suis débloquée à l'oral, je tiens des discussions en anglais maintenant.",
  "Recommande les yeux fermés pour niveau intermédiaire qui veulent passer un cap. Pour débutants complets c'est peut-être trop direct.",
  "James sait créer une bonne ambiance, tout le monde ose parler même les plus timides. Bravo.",
  "Très bons supports pédagogiques, il envoie un récap après chaque cours avec les expressions vues.",
  "Flexible et réactif pour caler des créneaux, même en dernière minute. Vrai pro.",
  "James challenge sans brusquer. Sortie de ma zone de confort à chaque cours = gros progrès.",
];

const jamesQuestionnaires: ValidationQuestionnaire[] = Array.from({ length: 56 }, (_, i) => {
  const rating: 4 | 5 = i < 16 ? 4 : 5; // 16 × 4★ puis 40 × 5★
  const hasComment = i < jamesComments.length;
  const daysAgo = 5 + i * 6; // étalé sur ~10 mois
  const date = new Date('2026-04-15T18:00:00Z');
  date.setUTCDate(date.getUTCDate() - daysAgo);

  return {
    id: `vq_james_${i + 1}`,
    bookingId: `bk_james_past_${i + 1}`,
    classId: 'cls_english',
    sessionId: `cls_english_past_${i + 1}`,
    teacherId: '22222222-2222-2222-2222-222222222004',
    userId: `u_english_${(i % 30) + 1}`,
    answers: {
      q1_onTime: true,
      q2_asDescribed: rating === 5,
      q3_serious: true,
      q4_recommend: rating >= 4,
      q5_rating: rating,
    },
    comment: hasComment ? jamesComments[i] : undefined,
    createdAt: date.toISOString(),
  };
});

export const mockQuestionnaires: ValidationQuestionnaire[] = [
  ...marieQuestionnaires,
  ...sophieQuestionnaires,
  ...jamesQuestionnaires,
];
