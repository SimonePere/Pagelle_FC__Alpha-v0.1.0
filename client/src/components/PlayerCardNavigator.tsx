import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlayerAttributes } from "@/types/playerCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckCircle2, Clock, Star } from "lucide-react";
import { usePlayerSpecialties } from "@/hooks/usePlayerSpecialties";
import { SpecialtiesBadgeList } from "@/components/SpecialtyBadge";
import PaginatedSwiper from "@/components/PaginatedSwiper";

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
    con: number;
    int: number;
    prt: number;
  };
  goalkeeperAttributes?: {
    tf: number;
    pr: number;
    rn: number;
    pz: number;
    rf: number;
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
  initialPlayerId?: string;
}

type CardMode = 'empty' | 'voting' | 'completed';

export function PlayerCardNavigator({
  players,
  sessions,
  onCreateSession,
  onVote,
  onLoadResults,
  initialPlayerId,
}: PlayerCardNavigatorProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialPlayerId) {
      const index = players.findIndex(p => p.id === initialPlayerId);
      return index >= 0 ? index : 0; // Se non trova, parte da 0
    }
    return 0;
  });

  const [cardResults, setCardResults] = useState<Record<string, PlayerCardResult>>({});
  const [loadingResults, setLoadingResults] = useState<Record<string, boolean>>({});

  const currentPlayer = players[currentIndex];

  // Lazy-load risultati quando la card corrente è in modalità 'completed'.
  useEffect(() => {
    if (!currentPlayer || !onLoadResults) return;
    const session = sessions.find(s => s.targetId === currentPlayer.id);
    if (!session || session.status !== 'completed') return;
    if (cardResults[currentPlayer.id] || loadingResults[currentPlayer.id]) return;

    setLoadingResults(prev => ({ ...prev, [currentPlayer.id]: true }));
    onLoadResults(currentPlayer.id)
      .then(result => {
        if (result) {
          setCardResults(prev => ({ ...prev, [currentPlayer.id]: result }));
        }
      })
      .catch(error => {
        console.error('Error loading results:', error);
      })
      .finally(() => {
        setLoadingResults(prev => ({ ...prev, [currentPlayer.id]: false }));
      });
  }, [currentIndex, currentPlayer, sessions, onLoadResults, cardResults, loadingResults]);

  if (!currentPlayer) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Nessun giocatore disponibile</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 sm:space-y-6">
      {/* Main Card Area — swipe orizzontale + pallini sotto via PaginatedSwiper */}
      <div className="relative min-h-[520px] sm:min-h-[610px]">
        <PaginatedSwiper
          items={players}
          pageSize={1}
          initialPage={currentIndex}
          onPageChange={setCurrentIndex}
          renderPage={([player]) => {
            const session = sessions.find(s => s.targetId === player?.id);
            const mode: CardMode = !session
              ? 'empty'
              : session.status === 'completed'
                ? 'completed'
                : 'voting';
            const result = cardResults[player.id];
            const loading = !!loadingResults[player.id];
            return (
              <PlayerCard
                player={player}
                mode={mode}
                session={session}
                result={result}
                isResultLoading={loading}
                onCreateSession={() => onCreateSession(player.id)}
                onVote={() => session && onVote(session.id)}
              />
            );
          }}
        />
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
  isResultLoading?: boolean;
  onCreateSession: () => void;
  onVote: () => void;
}

function PlayerCard({ player, mode, session, result, isResultLoading = false, onCreateSession, onVote }: PlayerCardProps) {
  // Helper per convertire API results in PlayerAttributes format
  const convertToPlayerAttributes = (apiResult: PlayerCardResult): PlayerAttributes => {
    // 🐛 DEBUG: Verifica che i dati delle stelle arrivino
    return {
      shooting: apiResult.finalAttributes.tir,
      passing: apiResult.finalAttributes.pas,
      dribbling: apiResult.finalAttributes.dri,
      finalizzazione: apiResult.finalAttributes.fin,
      visione: apiResult.finalAttributes.vis,
      stamina: apiResult.finalAttributes.res,
      strength: apiResult.finalAttributes.for,
      contrast: apiResult.finalAttributes.con,
      interception: apiResult.finalAttributes.int,
      headPrecision: apiResult.finalAttributes.prt,

      tuffo: apiResult.goalkeeperAttributes?.tf,
      presa: apiResult.goalkeeperAttributes?.pr,
      rinvio: apiResult.goalkeeperAttributes?.rn,
      piazzamento: apiResult.goalkeeperAttributes?.pz,
      riflessi: apiResult.goalkeeperAttributes?.rf,

      position: apiResult.profile.mostVotedPosition as 'POR' | 'DIF' | 'CEN' | 'ATT' || 'CEN',
      weakFoot: apiResult.finalAdditionalAttributes?.piedeDebole || 3, // ⭐ STELLE DAL DATABASE
      skillMoves: apiResult.finalAdditionalAttributes?.skill || 3,     // ⭐ STELLE DAL DATABASE
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
        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < count ? "fill-primary text-primary" : "text-muted"}`}
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
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                {player.name}
              </h2>
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
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
              <div className="text-xs sm:text-sm text-muted-foreground mt-2">
                {session.submissionsCount} voti raccolti
                {session.participationRate && (
                  <div> {session.participationRate}% partecipazione</div>
                )}
              </div>
            )}
          </div>

          {/* TOT Rating per completed */}
          {mode === 'completed' && result && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">TOT</div>
              <div className={`font-display text-4xl sm:text-5xl font-black ${getOverallColor(result.finalOverallRating)} leading-none`}>
                {result.finalOverallRating}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                {result.profile.mostVotedPosition || 'N/A'}
              </div>
            </div>
          )}

          {mode === 'completed' && !result && isResultLoading && (
            <div className="text-center space-y-2">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">TOT</div>
              <Skeleton className="h-12 w-20 mx-auto" />
              <Skeleton className="h-4 w-14 mx-auto" />
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-1">
          {player.age && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              Età: {player.age}
            </div>
          )}
        </div>
      </div>

      {/* Content basato sulla modalità */}
      <div className="flex-1 px-4 sm:px-6">
        {mode === 'completed' && result ? (
          (() => {
            // ✅ FIX: Controlla se ha VERI attributi portiere (non solo oggetto con valori null)
            const hasValidGoalkeeperAttributes = result.goalkeeperAttributes &&
              Object.values(result.goalkeeperAttributes).some(value => value !== null && value !== undefined);

            return hasValidGoalkeeperAttributes ? (
              // UI PORTIERI - Solo 5 attributi goalkeeper
              <div className="space-y-3 sm:space-y-4">

                <div className="space-y-2 sm:space-y-3">
                  <AttributeBar label="Tuffo" value={result.goalkeeperAttributes.tf} />
                  <AttributeBar label="Presa" value={result.goalkeeperAttributes.pr} />
                  <AttributeBar label="Rinvio" value={result.goalkeeperAttributes.rn} />
                  <AttributeBar label="Piazzamento" value={result.goalkeeperAttributes.pz} />
                  <AttributeBar label="Riflessi" value={result.goalkeeperAttributes.rf} />
                </div>

                {/* 🌟 SPECIALITÀ PORTIERE */}
                {(() => {
                  const specialties = usePlayerSpecialties(
                    result.finalAttributes,
                    result.goalkeeperAttributes
                  );

                  // 🎨 LOGICA BADGE RESPONSIVE: più specialità = badge più piccoli
                  const getBadgeSize = (count: number): 'xs' | 'sm' | 'md' => {
                    if (count <= 2) return 'md';  // Badge grandi per poche specialità
                    if (count <= 4) return 'sm';  // Badge medi per media quantità
                    return 'xs';                   // Badge piccoli per tante specialità
                  };

                  return specialties.length > 0 && (
                    <div className="pt-4 border-t border-border/30">
                      <div className="text-xs text-muted-foreground mb-2">Specialità</div>
                      <SpecialtiesBadgeList
                        specialties={specialties}
                        size={getBadgeSize(specialties.length)}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : (
              // UI GIOCATORI NORMALI - 10 attributi a DUE COLONNE + stelle
              <div className="space-y-3 sm:space-y-4">
                {/* Layout a due colonne per ottimizzare spazio */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Colonna Sinistra - 5 attributi */}
                  <div className="space-y-2 sm:space-y-3">
                    <AttributeBar label="Tiro" value={result.finalAttributes.tir} />
                    <AttributeBar label="Passaggio" value={result.finalAttributes.pas} />
                    <AttributeBar label="Dribbling" value={result.finalAttributes.dri} />
                    <AttributeBar label="Visione" value={result.finalAttributes.vis} />
                    <AttributeBar label="Finalizzazione" value={result.finalAttributes.fin} />
                  </div>

                  {/* Colonna Destra - 5 attributi */}
                  <div className="space-y-2 sm:space-y-3">
                    <AttributeBar label="Resistenza" value={result.finalAttributes.res} />
                    <AttributeBar label="Forza" value={result.finalAttributes.for} />
                    <AttributeBar label="Contrasto" value={result.finalAttributes.con} />
                    <AttributeBar label="Intercettazione" value={result.finalAttributes.int} />
                    <AttributeBar label="Pr. testa" value={result.finalAttributes.prt} />
                  </div>
                </div>

                {/* 🌟 SPECIALITÀ - TRA ATTRIBUTI E STELLE */}
                {(() => {
                  const specialties = usePlayerSpecialties(
                    result.finalAttributes,
                    null // Giocatori normali non hanno attributi portiere
                  );

                  // 🎨 LOGICA BADGE RESPONSIVE: più specialità = badge più piccoli
                  const getBadgeSize = (count: number): 'xs' | 'sm' | 'md' => {
                    if (count <= 2) return 'md';  // Badge grandi per poche specialità
                    if (count <= 4) return 'sm';  // Badge medi per media quantità
                    return 'xs';                   // Badge piccoli per tante specialità
                  };

                  return specialties.length > 0 && (
                    <div className="pt-4 border-t border-border/30">
                      <div className="text-xs text-muted-foreground mb-2">Specialità</div>
                      <SpecialtiesBadgeList
                        specialties={specialties}
                        size={getBadgeSize(specialties.length)}
                      />
                    </div>
                  );
                })()}

                {/* Star Ratings - Solo per giocatori normali */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                  <div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground mb-1">Piede Debole</div>
                    <div className="flex gap-0.5">{renderStars((() => {
                      const piedeDebole = result.finalAdditionalAttributes?.piedeDebole || 3;
                      return piedeDebole;
                    })())}</div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground mb-1">Skill</div>
                    <div className="flex gap-0.5">{renderStars((() => {
                      const skill = result.finalAdditionalAttributes?.skill || 3;
                      return skill;
                    })())}</div>
                  </div>
                </div>
              </div>
            )
          })() // ← Chiusura della funzione anonima
        ) : mode === 'completed' && isResultLoading ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, idx) => (
                <Skeleton key={`completed-attr-skeleton-${idx}`} className="h-4 w-full" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 border-t border-border/50">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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
        <div className="p-4 sm:p-6 pt-0 space-y-2">
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