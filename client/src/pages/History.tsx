import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { DashboardLayout } from "@/components/DashboardLayout";
import { FileText, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import MatchGrid from "@/components/MatchGrid";
import { Component, ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode; fallback: (error: Error) => ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function ErrorFallback(error: Error) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold text-destructive mb-2">
        Errore nel caricamento delle partite
      </h2>
      <p className="text-muted-foreground mb-4">
        {error.message}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        Ricarica pagina
      </button>
    </div>
  );
}

export default function History() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const handleCreateMatch = () => {
    // Naviga alla pagina CreateMatch per creare un nuovo match
    navigate('/create-match');
  };

  useEffect(() => {
    if (!user || !user.teams?.length) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-8"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="font-display text-4xl font-bold text-foreground flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    Storico
                  </h1>
                  <p className="text-muted-foreground text-lg mt-4">
                    Rivedi le partite passate e quelle in corso del tuo team.
                  </p>
                </div>
                <Button
                  onClick={handleCreateMatch}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-4 py-2 h-auto md:px-6 md:py-3"
                >
                  <Plus className="w-4 h-4 mr-1 md:w-5 md:h-5 md:mr-2" />
                  <span className="text-sm md:text-base">Nuovo</span>
                </Button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
          </motion.div>



          {/* Nuovo componente MatchGrid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ErrorBoundary fallback={ErrorFallback}>
              <MatchGrid showStats={false} />
            </ErrorBoundary>
          </motion.div>



        </div>
      </div>
    </DashboardLayout>
  );
}

