import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { DashboardLayout } from "@/components/DashboardLayout";
import { FileText, Info, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MatchGrid from "@/components/MatchGrid";
import { Component, ReactNode } from "react";
import { createTeam } from '@/redux/slices/teamSlice';
import { refreshUserData, loadEnrichedUserData } from '@/redux/slices/authSlice';
import { fetchTeamMatches } from '@/redux/slices/matchSlice';
import { toast } from 'sonner';
import { isAdmin } from '@/utils/permissions';
import { useActiveTeamId } from '@/hooks/useActiveTeamId';
import { useActiveSeason } from '@/hooks/useActiveSeason';
import SeasonSelector from '@/components/SeasonSelector';

// Gestione Errori per MatchGrid (es. fetch fallito)
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
  const { user, isGuest } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { activeTeamId } = useActiveTeamId();
  const { seasons, selectedSeason, setSelectedSeason, showSelector } = useActiveSeason();

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Re-fetch partite al cambio stagione (fetchTeamMatches legge season_selected da localStorage)
  useEffect(() => {
    if (!activeTeamId) return;
    dispatch(fetchTeamMatches(activeTeamId));
  }, [activeTeamId, selectedSeason, dispatch]);

  const handleSeasonChange = (season: string) => {
    setSelectedSeason(season);
  };

  const handleCreateTeamSubmit = async () => {
    if (!newTeamName.trim()) return;
    setIsCreatingTeam(true);
    try {
      const result = await dispatch(createTeam({ name: newTeamName.trim() }));
      if (createTeam.fulfilled.match(result)) {
        toast.success(`Team "${newTeamName.trim()}" creato con successo!`);
        setCreateTeamOpen(false);
        setNewTeamName('');
        await dispatch(refreshUserData());
        await dispatch(loadEnrichedUserData());
      } else {
        toast.error('Errore nella creazione del team.');
      }
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleCreateMatch = () => {
    navigate('/create-match');
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="pb-4 lg:pb-8">
        <div className="p-4 pt-2 lg:p-8 space-y-5 lg:space-y-8 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-5 sm:p-6 lg:p-8"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4">
                <h1 className="font-display text-3xl sm:text-4xl leading-none font-bold text-foreground flex items-center gap-2 sm:gap-3">
                  <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  Storico
                </h1>
                <div className="flex items-center gap-2">
                  {/* Crea team - solo per utenti registrati senza team */}
                  {!isGuest && !user?.teams?.length && (
                    <>
                      <Button
                        onClick={() => setCreateTeamOpen(true)}
                        size="sm"
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Crea il tuo team
                      </Button>

                      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-accent" />
                              Crea il tuo team
                            </DialogTitle>
                          </DialogHeader>
                          <div className="py-2">
                            <Input
                              placeholder="Nome del team..."
                              value={newTeamName}
                              onChange={(e) => setNewTeamName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateTeamSubmit()}
                              autoFocus
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateTeamOpen(false)}>Annulla</Button>
                            <Button onClick={handleCreateTeamSubmit} disabled={!newTeamName.trim() || isCreatingTeam}>
                              {isCreatingTeam ? 'Creazione...' : 'Crea team'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Informazioni storico"
                        className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                      >
                        <Info className="w-5 h-5 text-primary cursor-pointer" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" side="bottom" align="end">
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground">Come Funziona</h4>
                        <p className="text-sm text-muted-foreground">
                          Rivedi le partite passate e quelle in corso del tuo team.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
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
              <MatchGrid showStats={false} onCreateMatch={isAdmin(user) && user?.teams?.length ? handleCreateMatch : undefined} />
            </ErrorBoundary>
          </motion.div>



        </div>
      </div>
    </DashboardLayout>
  );
}

