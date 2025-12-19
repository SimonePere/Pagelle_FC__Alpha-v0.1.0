import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Trophy,
  Calendar,
  Users,
  ArrowUp,
  ArrowDown,
  Eye
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store/store';
import { fetchTeamMatches } from '../redux/slices/matchSlice';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';



// Componente MatchCard per partite
interface MatchCardProps {
  match: any;
  index: number;
}

interface MatchGridProps {
  showStats?: boolean;
  title?: string;
}

function MatchCard({ match, index }: MatchCardProps) {
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
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card transition-all duration-300 relative">
        {/* Numero nell'angolino sinistro */}
        <span className="absolute top-3 left-3 text-xs font-mono bg-secondary/40 px-2 py-1 rounded text-muted-foreground z-10">
          #{index + 1}
        </span>

        <CardHeader className="pb-3 pt-12">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1 pr-4">
              <CardTitle className="font-display text-2xl flex items-center gap-3">
                {getMatchType()}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

        <CardContent>
          {/* 
            🔧 PULSANTE DETTAGLI COMPLETI - ATTIVO SOLO PER PARTITE COMPLETATE
            ==================================================================
            
            ✅ COSA È STATO FATTO:
            - Pulsante sempre visibile (non più condizionato)
            - Collegato alla route GET /api/v1/matches/:id con matchId corretto
            - Handler onClick per navigazione implementato
            - Abilitato solo per partite con status 'completed'
            
            🎯 LOGICA ATTUALE:
            - disabled={match.status !== 'completed'} 
            - Solo le partite completate mostrano dettagli completi
            
            🔗 ROUTING: navigate(`/matches/${match.id}`) → GET /api/v1/matches/:id
          */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full transition-colors"
              disabled={match.status !== 'completed'}
              onClick={handleViewDetails}
            >
              <Eye className="w-4 h-4 mr-2" />
              Vedi dettagli completi
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const MatchGrid: React.FC<MatchGridProps> = ({ showStats = true }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { matches, isLoading } = useSelector((state: RootState) => state.matches);
  const dispatch = useDispatch<AppDispatch>();

  // Controllo di sicurezza per l'array matches
  const safeMatches = Array.isArray(matches) ? matches : [];

  // Stati per filtri e ordinamento
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // desc = più recenti prime

  // Carica le partite reali dal backend
  useEffect(() => {
    if (!user || !user.teams?.length) {
      return;
    }

    const teamId = user.teams[0].id;
    dispatch(fetchTeamMatches(teamId));
  }, [user, dispatch]);

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

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Caricamento partite...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
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
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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