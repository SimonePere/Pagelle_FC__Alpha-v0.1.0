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
  /**
   * Rotta preclusa ai visitatori in modalità demo.
   * Usata per la God Dashboard: è la console del creatore, non fa parte di
   * ciò che la demo mostra. Il backend la protegge già con requireGod, ma
   * intercettarla qui evita di far vedere una pagina che poi fallisce.
   */
  blockDemo?: boolean;
}

export const ProtectedRouteRedux = ({ children, blockDemo = false }: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated, isDemo } = useSelector((state: RootState) => state.auth);

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

  // Visitatore demo su una rotta a lui preclusa → torna alla home della demo
  if (blockDemo && isDemo) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};