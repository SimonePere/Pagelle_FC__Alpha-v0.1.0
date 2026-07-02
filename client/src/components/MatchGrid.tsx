import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Trophy,
  Calendar,
  Users,
  ArrowUp,
  ArrowDown,
  Eye,
  FileText,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import useEnrichedMatches from '@/hooks/useEnrichedMatches';
import { useActiveSeason } from '@/hooks/useActiveSeason';
import SeasonSelector from '@/components/SeasonSelector';
import { useActiveTeamId } from '@/hooks/useActiveTeamId';
import { fetchTeamMatches } from '@/redux/slices/matchSlice';
import { AppDispatch } from '@/redux/store/store';



import { useDispatch } from 'react-redux';




// Componente MatchCard per partite
interface MatchCardProps {
  match: any;
  index: number;
  isAbstainedInfoLoading?: boolean;
}

interface MatchGridProps {
  showStats?: boolean;
  title?: string;
  onCreateMatch?: () => void;
}

const MatchGridLoadingSkeleton: React.FC<{ showStats: boolean; showCreateAction: boolean }> = ({ showStats, showCreateAction }) => {
  return (
    <div className="space-y-6">
      {showStats && (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`stats-skeleton-${idx}`} className="text-center p-3 bg-secondary/40 rounded-lg">
              <Skeleton className="h-8 w-10 mx-auto mb-2" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-9 w-24" />
        {showCreateAction && <Skeleton className="h-9 w-9 rounded-md ml-auto" />}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={`match-card-skeleton-${idx}`} className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-7 w-44" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-6">
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

function MatchCard({ match, index, isAbstainedInfoLoading = false }: MatchCardProps) {
  const navigate = useNavigate();

  // Controllo di sicurezza per l'oggetto match
  if (!match) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card p-4">
        <CardContent>
          <p className="text-muted-foreground">Dati partita non disponibili</p>
        </CardContent>
      </Card>
    );
  }

  // Formatta la data completa con controlli di sicurezza
  const getFormattedDate = (date: string) => {
    try {
      if (!date) return 'Data non disponibile';
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Data non valida';
      return format(dateObj, 'dd MMMM yyyy', { locale: it });
    } catch (error) {
      console.error('Errore formattazione data:', error, 'Data:', date);
      return 'Errore data';
    }
  };

  // ✅ Tipo di campo dal backend (playersCount) vs partecipanti effettivi (teamMemberIds.length)
  const getMatchType = () => {
    // Usa playersCount dal backend per il tipo di campo
    const fieldType = match.playersCount || 8;
    return `⚽ Calcio a ${fieldType}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-green-50';
      case 'active':
        return 'bg-blue-500 text-blue-50';
      case 'draft':
        return 'bg-orange-500 text-orange-50';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completata';
      case 'active': return 'In Corso';
      case 'draft': return 'Creata';
      default: return status;
    }
  };

  // Handler per navigazione ai dettagli partita
  const handleViewDetails = () => {
    if (match?.id) {
      navigate(`/match/${match.id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Card
        className="bg-card/80 backdrop-blur-sm border-border shadow-card transition-all duration-300 relative cursor-pointer hover:shadow-lg hover:bg-card/90"
        onClick={handleViewDetails}
      >
        {/* Numero nell'angolino sinistro */}
        <span className="absolute top-3 left-3 text-xs font-mono bg-secondary/40 px-2 py-1 rounded text-muted-foreground z-10">
          #{index + 1}
        </span>

        <CardHeader className="pb-3 pt-12">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <CardTitle className="font-display text-2xl flex items-center gap-3 pr-4">
                {getMatchType()}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground pr-4">
                <Calendar className="w-4 h-4" />
                <span>{getFormattedDate(match.date)}</span>
              </div>

            </div>
            <div className="space-y-2 text-right">
              <Badge className={getStatusColor(match.status)}>
                {getStatusLabel(match.status)}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {match.teamMemberIds?.length || 0} partecipanti
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Note partita - Sfrutta tutta la larghezza */}
        {match.notes && (
          <div className="px-6 pb-6">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed">{match.notes}</span>
            </div>
          </div>
        )}

        {isAbstainedInfoLoading && match.status !== 'draft' && (
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0 text-orange-400" />
              <Skeleton className="h-4 w-56 max-w-[80%]" />
            </div>
          </div>
        )}

        {/* 🧪 TEST: Sezione Astenuti - NUOVA */}
        {!isAbstainedInfoLoading && match.hasAbstained && (
          <div className="px-6 pb-6">
            <div className="flex items-start gap-2 text-sm">
              <Users className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" />
              <span className="text-orange-700 dark:text-orange-400 font-medium">
                {match.abstainedNames.join(', ')} astenuto/i dalla votazione
              </span>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

const MatchGrid: React.FC<MatchGridProps> = ({ showStats = true, onCreateMatch }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeTeamId } = useActiveTeamId();
  const { seasons, selectedSeason, setSelectedSeason, showSelector } = useActiveSeason();

  // Re-fetch partite al cambio stagione (fetchTeamMatches legge season_selected da localStorage)
  useEffect(() => {
    if (!activeTeamId) return;
    dispatch(fetchTeamMatches(activeTeamId));
  }, [activeTeamId, selectedSeason, dispatch]);

  const handleSeasonChange = (season: string) => {
    setSelectedSeason(season);
  };


  // 🧪 TEST: Sostituiamo useAppData con useEnrichedMatches
  const { matches, isLoading, abstainedInfoLoading } = useEnrichedMatches();

  const matchesAreLoading = isLoading.matches;

  // Controllo di sicurezza per l'array matches
  const safeMatches = Array.isArray(matches) ? matches : [];

  // Stati per filtri e ordinamento
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // desc = più recenti prime
  // Ottieni anni disponibili dalle partite
  const getAvailableYears = () => {
    const years = safeMatches.map(match => new Date(match.date).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a); // Ordine decrescente
  };

  // Filtra e ordina le partite
  const getFilteredAndSortedMatches = () => {
    let filteredMatches = [...safeMatches]; // Creo copia per evitare read-only

    // Filtro per anno
    if (selectedYear !== 'all') {
      filteredMatches = safeMatches.filter(match =>
        new Date(match.date).getFullYear().toString() === selectedYear
      );
    }

    // Ordinamento per data - creo una copia per evitare errori read-only
    return [...filteredMatches].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };

  const filteredMatches = getFilteredAndSortedMatches();
  const availableYears = getAvailableYears();

  // Stats calcolate sui dati filtrati
  const stats = {
    totalMatches: filteredMatches.length,
    completedMatches: filteredMatches.filter(m => m.status === 'completed').length,
    activeMatches: filteredMatches.filter(m => m.status === 'active').length,
    draftMatches: filteredMatches.filter(m => m.status === 'draft').length
  };

  return (
    <div className="space-y-6">
      {/* Loading state */}
      {matchesAreLoading && (
        <MatchGridLoadingSkeleton showStats={showStats} showCreateAction={!!onCreateMatch} />
      )}

      {/* Content */}
      {!matchesAreLoading && (
        <>
          {/* Dashboard Stats per Partite - opzionali */}
          {showStats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.totalMatches}</div>
                <div className="text-xs text-muted-foreground">Totali</div>
              </div>
              <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.draftMatches}</div>
                <div className="text-xs text-muted-foreground">Create</div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.activeMatches}</div>
                <div className="text-xs text-muted-foreground">Attive</div>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.completedMatches}</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
          )}

          {/* Controlli di filtro e ordinamento */}
          <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg">


            {/* Selettore stagione — visibile solo se ci sono più stagioni */}
            {showSelector && (
              <div className="shrink-0">
                <SeasonSelector
                  seasons={seasons}
                  selectedSeason={selectedSeason}
                  onSeasonChange={handleSeasonChange}
                  showSelector={showSelector}
                  showAllOption
                />
              </div>
            )}



            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-2"
              >
                {sortOrder === 'desc' ? (
                  <>
                    <ArrowDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Recenti</span>
                  </>
                ) : (
                  <>
                    <ArrowUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Vecchie</span>
                  </>
                )}
              </Button>
            </div>

            {onCreateMatch && (
              <Button
                size="icon"
                onClick={onCreateMatch}
                className="ml-auto bg-accent hover:bg-accent/90 text-accent-foreground"
                aria-label="Aggiungi nuova partita"
                title="Nuova partita"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}

          </div>

          {/* Lista partite */}
          <div className="space-y-4">
            {filteredMatches.length === 0 ? (
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
                <CardContent className="p-12 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">
                    {selectedYear === 'all' ? 'Nessuna partita trovata' : `Nessuna partita nel ${selectedYear}`}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedYear === 'all'
                      ? 'Non ci sono ancora partite registrate per il tuo team.'
                      : `Prova a selezionare un altro anno o "Tutti".`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMatches.map((match, index) => (
                <MatchCard
                  key={match?.id || `match-${index}`}
                  match={match}
                  index={index}
                  isAbstainedInfoLoading={abstainedInfoLoading}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MatchGrid;