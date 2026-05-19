// Resolves the TeacherProfile that matches the currently-authenticated user.
// Every pro-side screen should use this instead of the hardcoded
// DEMO_TEACHER_ID so Sophie / Marie / James / Alex each land on THEIR own
// dashboard, classes, planning, stats and offers.

import { useEffect, useState } from 'react';
import { authService } from '../services/auth.service';
import { teachersService } from '../services/teachers.service';
import { TeacherProfile } from '../types/domain';

export function useCurrentTeacher(): TeacherProfile | undefined {
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const u = authService.getCurrentUser();
      if (!u) {
        if (!cancelled) setTeacher(undefined);
        return;
      }
      const t = await teachersService.getByUserId(u.id);
      if (!cancelled) setTeacher(t);
    };

    resolve();

    // Re-resolve when auth changes (login / logout / role switch), so the
    // same pro screen instance reflects the real signed-in teacher.
    const unsub = authService.onChange(() => {
      resolve();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return teacher;
}

// Convenience shortcut: returns the id or undefined until it resolves.
export function useCurrentTeacherId(): string | undefined {
  return useCurrentTeacher()?.id;
}
