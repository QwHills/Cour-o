// Personalization helper — picks the courses to show in the "Pour toi" row on
// the Explorer screen. Logic stays simple/deterministic; can be upgraded later
// with real analytics.
//
// Fallback cascade:
//   1. Favorites (classes the user bookmarked)
//   2. Top categories (deduced from past bookings)
//   3. Highest-rated teachers nearby
//   4. Generic popular (sorted by distance × rating)

import { coursesService, EnrichedCourse } from './courses.service';
import { favoritesService } from './favorites.service';
import { bookingsService } from './bookings.service';

const MAX_SUGGESTIONS = 10;

export const personalizationService = {
  // Returns up to MAX_SUGGESTIONS courses for the "Pour toi" section.
  suggestionsFor(userId: string | null): EnrichedCourse[] {
    const all = coursesService.search({});
    if (all.length === 0) return [];

    const bag: EnrichedCourse[] = [];
    const seen = new Set<string>();
    const add = (c: EnrichedCourse) => {
      if (seen.has(c.class.id)) return;
      seen.add(c.class.id);
      bag.push(c);
    };

    if (userId) {
      // 1. Favorites first
      const favIds = favoritesService.list(userId);
      all.filter((c) => favIds.includes(c.class.id)).forEach(add);

      // 2. Suggestions by category of past bookings
      const myBookings = bookingsService.listForUser(userId);
      if (myBookings.length > 0) {
        const catWeights = new Map<string, number>();
        myBookings.forEach((b) => {
          const c = all.find((x) => x.class.id === b.classId);
          if (!c) return;
          catWeights.set(c.class.category, (catWeights.get(c.class.category) ?? 0) + 1);
        });
        const topCats = [...catWeights.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((e) => e[0]);
        all
          .filter((c) => topCats.includes(c.class.category))
          .sort(byQuality)
          .forEach(add);
      }
    }

    // 3 / 4. Fallback: best-rated nearby courses
    all
      .slice()
      .sort(byQuality)
      .forEach(add);

    return bag.slice(0, MAX_SUGGESTIONS);
  },
};

// Sort helper: rating DESC, then distance ASC, then price ASC
function byQuality(a: EnrichedCourse, b: EnrichedCourse): number {
  const ra = a.teacher?.rating ?? 0;
  const rb = b.teacher?.rating ?? 0;
  if (rb !== ra) return rb - ra;
  if (a.distanceMeters !== b.distanceMeters) return a.distanceMeters - b.distanceMeters;
  return a.class.price - b.class.price;
}
