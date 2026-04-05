import { ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';

interface QueryErrorBoundaryProps {
  children: ReactNode;
}

export const QueryErrorBoundary = ({ children }: QueryErrorBoundaryProps) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallback={
            <div className="min-h-screen flex items-center justify-center p-4">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4">Failed to load data</h2>
                <button onClick={reset} className="btn btn-primary">
                  Try Again
                </button>
              </div>
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};