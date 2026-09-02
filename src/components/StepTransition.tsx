import { ReactNode } from 'react';

interface Props {
  stepKey: string;
  className?: string;
  children: ReactNode;
}

export function StepTransition({ stepKey, className = '', children }: Props) {
  return (
    <div key={stepKey} className={`step-enter ${className}`.trim()}>
      {children}
    </div>
  );
}
