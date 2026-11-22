import type { ReactNode } from 'react';

export interface Action {
  label: string;
  onAction?: (...props: unknown[]) => unknown;
  id?: string;
  enabled?: boolean;
  title?: string;
  icon?: ReactNode;
  enabledIcon?: ReactNode;
  disabledIcon?: ReactNode;
  disabled?: boolean;
  className?: string;
}
