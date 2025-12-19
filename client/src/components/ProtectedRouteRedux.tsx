// src/components/ProtectedRouteRedux.tsx

// Componente per proteggere le route con Redux
// Sostituisce i check Context nei singoli componenti
// Centralizza il controllo autenticazione a livello App.tsx

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRouteRedux = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Mostra loading mentre Redux si inizializza
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Caricamento...</div>
      </div>
    );
  }

  // Redirect a login se non autenticato con Redux
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};