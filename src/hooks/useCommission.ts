// Re-render hook that wires a component to the live commission config.
// Use this from any screen that *displays* the rate so it refreshes when
// the async load (or a future admin update) completes.

import { useEffect, useState } from 'react';
import {
  COMMISSION_CONFIG,
  onCommissionChange,
} from '../services/commission.service';
import { CommissionConfig } from '../types/domain';

export function useCommission(): CommissionConfig {
  const [, setTick] = useState(0);
  useEffect(() => onCommissionChange(() => setTick((t) => t + 1)), []);
  return COMMISSION_CONFIG;
}
