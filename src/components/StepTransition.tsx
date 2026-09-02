import { ReactNode } from 'react';

interface Props {
  className?: string;
  children: ReactNode;
}

export function StepTransition({ className = '', children }: Props) {
  return (
    <div className={`animate-step-enter ${className}`.trim()}>
      {children}
    </div>
  );
}
