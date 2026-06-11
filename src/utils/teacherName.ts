// Privacy helper — students see teachers' first names only. The full name is
// only revealed to the teacher themselves (their own pro screens) and to the
// student once a booking is confirmed (invoices, post-class flow, etc.).
//
// Rule: take the first whitespace-separated token of the display name. This
// preserves hyphenated first names ("Jean-Pierre Martin" → "Jean-Pierre") and
// single-word names ("Sophie" → "Sophie") without special-casing.

import { TeacherProfile } from '../types/domain';

export function publicTeacherName(
  teacher: Pick<TeacherProfile, 'displayName'> | undefined | null,
): string {
  if (!teacher?.displayName) return '';
  const first = teacher.displayName.trim().split(/\s+/)[0];
  return first || teacher.displayName;
}

// Convenience overload when callers only have the raw display name string.
export function firstName(displayName: string | undefined | null): string {
  if (!displayName) return '';
  const first = displayName.trim().split(/\s+/)[0];
  return first || displayName;
}
