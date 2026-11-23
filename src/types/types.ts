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

interface LoadingState {
  type: "loading";
}

interface ErrorState{
  type: "error";
  message: string;
}

interface SuccessState {
  type: "success";
}
export type ComponentState = LoadingState | ErrorState | SuccessState