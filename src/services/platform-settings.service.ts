import { CertificationThresholds, PlatformSettings } from '../types/domain';

// 🔧 Platform settings — configurable. In production, read from `platform_settings` table.
const DEFAULT_SETTINGS: PlatformSettings = {
  certification: {
    minFreeClasses: 3,
    minAvgRating: 4,
    minResponseCount: 3,
  },
};

let currentSettings: PlatformSettings = DEFAULT_SETTINGS;

export const platformSettingsService = {
  getCertificationThresholds(): CertificationThresholds {
    return currentSettings.certification;
  },

  getSettings(): PlatformSettings {
    return currentSettings;
  },

  // Dev helper — update settings at runtime
  update(patch: Partial<PlatformSettings>) {
    currentSettings = { ...currentSettings, ...patch };
  },
};
