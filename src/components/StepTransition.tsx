import { ReactNode } from 'react';

interface Props {
  className?: string;
  children: ReactNode;
}

export function StepTransition({ className = '', children }: Props) {
  return (
    <div className={`motion-safe:animate-step-enter ${className}`.trim()}>
      {children}
    </div>
  );
}
