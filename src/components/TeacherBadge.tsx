import React from 'react';
import { ViewStyle } from 'react-native';
import Badge from './ui/Badge';
import { TeacherStatus } from '../types/domain';

interface TeacherBadgeProps {
  status: TeacherStatus;
  small?: boolean;
  style?: ViewStyle;
}

const STATUS_MAP: Record<TeacherStatus, { label: string; variant: 'gold' | 'warning' | 'success' | 'pro' }> = {
  new_teacher: { label: 'Nouveau', variant: 'gold' },
  under_review: { label: 'En évaluation', variant: 'warning' },
  certified_teacher: { label: 'Certifié', variant: 'success' },
  professional: { label: 'Pro', variant: 'pro' },
};

export default function TeacherBadge({ status, small, style }: TeacherBadgeProps) {
  const { label, variant } = STATUS_MAP[status];
  return <Badge label={label} variant={variant} small={small} style={style} />;
}
