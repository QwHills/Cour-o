// Demo IDs — match those in src/services/supabase/seed.sql
// Used by pro screens that need a hardcoded "signed-in teacher" identity.
// In production, resolve via teachersService.getByUserId(authService.getCurrentUser().id).

export const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003'; // Sophie Martin
export const DEMO_TEACHER_ALEX = '22222222-2222-2222-2222-222222222001';
export const DEMO_TEACHER_MARIE = '22222222-2222-2222-2222-222222222002';
export const DEMO_TEACHER_JAMES = '22222222-2222-2222-2222-222222222004';
