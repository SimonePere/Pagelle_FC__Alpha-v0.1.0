import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerAttributes } from "@/types/playerCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Users, CheckCircle2, Clock, Star } from "lucide-react";

// Types per il nuovo componente
interface PlayerInfo {
  id: string;
  name: string;
  email?: string;
  age?: number;
}

interface PlayerCardSession {
  id: string;
  targetId: string;
  status: 'active' | 'completed';
  hasVoted: boolean;
  canVote: boolean;
  submissionsCount: number;
  participationRate?: number;
}

interface PlayerCardResult {
  finalAttributes: {
    tir: number;
    pas: number;
    dri: number;
    fin: number;
    vis: number;
    res: number;
    for: number;
  };
  finalAdditionalAttributes?: {
    piedeDebole?: number;
    skill?: number;
  };
  finalOverallRating: number;
  grade: string;
  profile: {
    mostVotedPosition?: string;
    preferredRole?: string;
  };
  metadata: {
    totalVoters: number;
    confidence: number;
  };
}

interface PlayerCardNavigatorProps {
  players: PlayerInfo[];
  sessions: PlayerCardSession[];
  onCreateSession: (playerId: string) => void;
  onVote: (sessionId: string) => void;
  onLoadResults?: (playerId: string) => Promise<PlayerCardResult | null>;
}

type CardMode = 'empty' | 'voting' | 'completed';

// Animation variants per slide
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

export function PlayerCardNavigator({
  players,
  sessions,
  onCreateSession,
  onVote,
  onLoadResults
}: PlayerCardNavigatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [cardResults, setCardResults] = useState<Record<string, PlayerCardResult>>({});

  const currentPlayer = players[currentIndex];

  // Trova la sessione per il player corrente
  const currentSession = sessions.find(session =>
    session.targetId === currentPlayer?.id
  );

  // Determina la modalità della card
  const getCardMode = (): CardMode => {
    if (!currentSession) return 'empty';
    if (currentSession.status === 'completed') return 'completed';
    return 'voting';
  };

  // Navigation functions
  const navigateToPlayer = (newIndex: number) => {
    if (newIndex === currentIndex) return;

    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  };

  const navigatePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : players.length - 1;
    navigateToPlayer(newIndex);
  };

  const navigateNext = () => {
    const newIndex = currentIndex < players.length - 1 ? currentIndex + 1 : 0;
    navigateToPlayer(newIndex);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigatePrev();
      if (e.key === 'ArrowRight') navigateNext();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  // Load results quando necessario
  useEffect(() => {
    if (getCardMode() === 'completed' && onLoadResults && currentPlayer) {
      if (!cardResults[currentPlayer.id]) {
        onLoadResults(currentPlayer.id).then(result => {
          if (result) {
            setCardResults(prev => ({
              ...prev,
              [currentPlayer.id]: result
            }));
          }
        });
      }
    }
  }, [currentIndex, currentPlayer, getCardMode, onLoadResults]);

  if (!currentPlayer) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Nessun giocatore disponibile</p>
      </div>
    );
  }

  const cardMode = getCardMode();
  const currentResult = cardResults[currentPlayer.id];

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Main Card Area */}
      <div className="relative h-[600px] overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0"
          >
            <PlayerCard
              player={currentPlayer}
              mode={cardMode}
              session={currentSession}
              result={currentResult}
              onCreateSession={() => onCreateSession(currentPlayer.id)}
              onVote={() => currentSession && onVote(currentSession.id)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center space-x-4">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={navigatePrev}
          disabled={players.length <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Dots Indicator */}
        <div className="flex space-x-2">
          {players.map((_, index) => (
            <button
              key={index}
              onClick={() => navigateToPlayer(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${index === currentIndex
                ? 'bg-primary'
                : 'bg-muted hover:bg-muted-foreground/50'
                }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={navigateNext}
          disabled={players.length <= 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Player Counter */}
      <div className="text-center text-sm text-muted-foreground">
        {currentIndex + 1} / {players.length}
      </div>
    </div>
  );
}

// Componente per la singola card
interface PlayerCardProps {
  player: PlayerInfo;
  mode: CardMode;
  session?: PlayerCardSession;
  result?: PlayerCardResult;
  onCreateSession: () => void;
  onVote: () => void;
}

function PlayerCard({ player, mode, session, result, onCreateSession, onVote }: PlayerCardProps) {
  // Helper per convertire API results in PlayerAttributes format
  const convertToPlayerAttributes = (apiResult: PlayerCardResult): PlayerAttributes => {
    // 🐛 DEBUG: Verifica che i dati delle stelle arrivino
    console.log('🔍 DEBUG convertToPlayerAttributes:', {
      playerId: player.id,
      finalAdditionalAttributes: apiResult.finalAdditionalAttributes,
      piedeDebole: apiResult.finalAdditionalAttributes?.piedeDebole,
      skill: apiResult.finalAdditionalAttributes?.skill
    });

    return {
      shooting: apiResult.finalAttributes.tir,
      passing: apiResult.finalAttributes.pas,
      dribbling: apiResult.finalAttributes.dri,
      finalizzazione: apiResult.finalAttributes.fin,
      visione: apiResult.finalAttributes.vis,
      stamina: apiResult.finalAttributes.res,
      strength: apiResult.finalAttributes.for,
      weakFoot: apiResult.finalAdditionalAttributes?.piedeDebole || 3, // ⭐ STELLE DAL DATABASE
      skillMoves: apiResult.finalAdditionalAttributes?.skill || 3,     // ⭐ STELLE DAL DATABASE
      position: 'CEN' as any, // TODO: Convertire da mostVotedPosition
      preferredRole: apiResult.profile.preferredRole || 'Non specificato',
      age: player.age || 25
    };
  };

  const getOverallColor = (rating: number) => {
    if (rating >= 80) return "text-green-500";
    if (rating >= 70) return "text-yellow-500";
    if (rating >= 60) return "text-orange-500";
    return "text-red-500";
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < count ? "fill-primary text-primary" : "text-muted"}
      />
    ));
  };

  const AttributeBar = ({ label, value }: { label: string; value: number }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary to-accent"
        />
      </div>
    </div>
  );

  return (
    <Card className="gradient-card border-border/50 shadow-card h-full flex flex-col">
      {/* Header */}
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {player.name}
              </h2>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {mode === 'completed' && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completa
                </Badge>
              )}
              {mode === 'voting' && (
                <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                  <Clock className="w-3 h-3 mr-1" />
                  In Corso
                </Badge>
              )}
              {mode === 'empty' && (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  Non Iniziata
                </Badge>
              )}
              {session?.hasVoted && (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  Hai Votato
                </Badge>
              )}
            </div>

            {/* Session Info */}
            {session && (
              <div className="text-sm text-muted-foreground mt-2">
                {session.submissionsCount} voti raccolti
                {session.participationRate && (
                  <span> • {session.participationRate}% partecipazione</span>
                )}
              </div>
            )}
          </div>

          {/* TOT Rating per completed */}
          {mode === 'completed' && result && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">TOT</div>
              <div className={`font-display text-5xl font-black ${getOverallColor(result.finalOverallRating)} leading-none`}>
                {result.finalOverallRating}
              </div>
              <div className="text-sm text-muted-foreground font-medium mt-1">
                {result.profile.mostVotedPosition || 'N/A'}
              </div>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-1">
          {player.age && (
            <div className="text-sm text-muted-foreground">
              Età: {player.age}
            </div>
          )}
        </div>
      </div>

      {/* Content basato sulla modalità */}
      <div className="flex-1 px-6">
        {mode === 'completed' && result ? (
          // Modalità Completed - Mostra attributi completi
          <div className="space-y-4">
            <div className="space-y-3">
              <AttributeBar label="TIR (Tiro)" value={result.finalAttributes.tir} />
              <AttributeBar label="PAS (Passaggio)" value={result.finalAttributes.pas} />
              <AttributeBar label="DRI (Dribbling)" value={result.finalAttributes.dri} />
              <AttributeBar label="FIN (Finalizzazione)" value={result.finalAttributes.fin} />
              <AttributeBar label="VIS (Visione)" value={result.finalAttributes.vis} />
              <AttributeBar label="RES (Resistenza)" value={result.finalAttributes.res} />
              <AttributeBar label="FOR (Forza)" value={result.finalAttributes.for} />
            </div>

            {/* Star Ratings */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Piede Debole</div>
                <div className="flex gap-0.5">{renderStars((() => {
                  const piedeDebole = result.finalAdditionalAttributes?.piedeDebole || 3;
                  console.log('🔍 DEBUG Piede Debole:', {
                    playerId: player.id,
                    playerName: player.name,
                    finalAdditionalAttributes: result.finalAdditionalAttributes,
                    piedeDebole: piedeDebole
                  });
                  return piedeDebole;
                })())}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Skill</div>
                <div className="flex gap-0.5">{renderStars((() => {
                  const skill = result.finalAdditionalAttributes?.skill || 3;
                  console.log('🔍 DEBUG Skill:', {
                    playerId: player.id,
                    playerName: player.name,
                    finalAdditionalAttributes: result.finalAdditionalAttributes,
                    skill: skill
                  });
                  return skill;
                })())}</div>
              </div>
            </div>


          </div>
        ) : (
          // Modalità Empty/Voting - Placeholder o progress
          <div className="flex items-center justify-center h-64">
            {mode === 'empty' ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Nessuna sessione attiva per questo giocatore
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Votazione in corso...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {mode !== 'completed' && (
        <div className="p-6 pt-0 space-y-2">
          {mode === 'empty' && (
            <Button
              className="w-full"
              onClick={onCreateSession}
            >
              Crea Sessione PlayerCard
            </Button>
          )}

          {mode === 'voting' && session?.canVote && (
            <Button
              className="w-full"
              variant={session.hasVoted ? "outline" : "default"}
              onClick={onVote}
            >
              {session.hasVoted ? "Aggiorna la Tua Valutazione" : "Vota Questo Giocatore"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}