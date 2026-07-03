import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerAttributes } from "@/types/playerCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, CheckCircle2, Clock, Star } from "lucide-react";
import { usePlayerSpecialties } from "@/hooks/usePlayerSpecialties";
import { SpecialtyBadge, SpecialtiesBadgeList } from "@/components/SpecialtyBadge";
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
  /** Bonus GoldenTot attivi per la stagione corrente. null = nessun bonus. */
  goldenTot?: {
    /** Bonus Pallone d'Oro: +delta al TOT complessivo */
    playerCardTOT?: { delta: number; source: string; sourceSeasonId: string };
    /** Bonus Scarpa d'Oro: +delta sull'attributo Finalizzazione */
    fin?: { delta: number; source: string; sourceSeasonId: string };
  } | null;
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

  const AttributeBar = ({ label, value, bonusDelta, bonusTooltip }: {
    label: string;
    value: number;
    bonusDelta?: number;
    bonusTooltip?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground flex items-center gap-1">
          {value}
          {/* Indicatore bonus Scarpa d'Oro su fin: discreto, cliccabile */}
          {bonusDelta && bonusTooltip && (
            <Popover>
              <PopoverTrigger asChild>
                <span className="text-[10px] font-black text-primary/70 cursor-pointer select-none hover:text-primary transition-colors" title={bonusTooltip}>
                  +{bonusDelta}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-60 text-sm" side="top">
                <p className="font-semibold text-primary mb-1">👟 Bonus Scarpa d’Oro</p>
                <p className="text-muted-foreground">{bonusTooltip}</p>
              </PopoverContent>
            </Popover>
          )}
        </span>
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

  const hasBallonDor = !!(result?.goldenTot?.playerCardTOT);

  return (
    <div className={hasBallonDor ? '[filter:drop-shadow(0_0_20px_rgba(234,179,8,0.40))]' : 'h-full'}>
      <Card className={`h-full flex flex-col ${hasBallonDor
        ? 'border-yellow-500/40 bg-gradient-to-b from-[#565f95] to-[#3d4470]'
        : 'gradient-card border-border/50 shadow-card'
        }`}>
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
                {result.goldenTot?.playerCardTOT ? (
                  /* Con bonus: Popover wrappa numero+badge, click su tutta l'area */
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="relative inline-flex items-start cursor-pointer select-none pr-5">
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`font-display text-4xl sm:text-5xl font-black ${getOverallColor(result.finalOverallRating + result.goldenTot.playerCardTOT.delta)} leading-none`}
                        >
                          {result.finalOverallRating + result.goldenTot.playerCardTOT.delta}
                        </motion.span>
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15 }}
                          className="absolute top-0 right-0 text-[11px] font-black text-primary animate-pulse"
                        >
                          +{result.goldenTot.playerCardTOT.delta}
                        </motion.span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 text-sm" side="top">
                      <p className="font-semibold text-primary mb-1">🏆 Bonus Pallone d’Oro</p>
                      <p className="text-muted-foreground">
                        Hai vinto il Pallone d’Oro della stagione{" "}
                        <span className="font-medium text-foreground">
                          {result.goldenTot.playerCardTOT.sourceSeasonId}
                        </span>.
                        TOT base{" "}
                        <span className="font-medium text-foreground">{result.finalOverallRating}</span>
                        {" "}+{" "}
                        <span className="font-bold text-primary">+{result.goldenTot.playerCardTOT.delta}</span>
                        {" "}={" "}
                        <span className="font-bold text-primary">{result.finalOverallRating + result.goldenTot.playerCardTOT.delta}</span>.{" "}
                        Il bonus si azzera all’inizio della prossima stagione.
                      </p>
                    </PopoverContent>
                  </Popover>
                ) : (
                  /* Senza bonus: numero normale */
                  <div className={`font-display text-4xl sm:text-5xl font-black ${getOverallColor(result.finalOverallRating)} leading-none`}>
                    {result.finalOverallRating}
                  </div>
                )}
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

                  {/* 🌟 SPECIALITÀ PORTIERE + PREMI */}
                  {(() => {
                    const specialties = usePlayerSpecialties(
                      result.finalAttributes,
                      result.goalkeeperAttributes
                    );
                    const awardCount = (result.goldenTot?.playerCardTOT ? 1 : 0) + (result.goldenTot?.fin ? 1 : 0);
                    const totalCount = specialties.length + awardCount;
                    if (totalCount === 0) return null;

                    const size: 'xs' | 'sm' | 'md' = totalCount <= 2 ? 'md' : totalCount <= 4 ? 'sm' : 'xs';

                    return (
                      <div className="pt-4 border-t border-border/30">
                        <div className="text-xs text-muted-foreground mb-2">Specialità</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Premi stagionali — flex-shrink-0: non cedono spazio agli altri */}
                          {result.goldenTot?.playerCardTOT && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 font-semibold rounded-xl border bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30 transition-colors select-none">
                                  <span>🏆</span><span>Pallone d’Oro</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" side="top">
                                <p className="font-semibold text-yellow-400 mb-1">🏆 Pallone d’Oro {result.goldenTot.playerCardTOT.sourceSeasonId}</p>
                                <p className="text-sm text-muted-foreground">Miglior giocatore della stagione. Bonus <span className="font-bold text-yellow-400">+{result.goldenTot.playerCardTOT.delta} TOT</span> attivo per questa stagione.</p>
                              </PopoverContent>
                            </Popover>
                          )}
                          {result.goldenTot?.fin && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 font-semibold rounded-xl border bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30 transition-colors select-none">
                                  <span>👟</span><span>Scarpa d’Oro</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" side="top">
                                <p className="font-semibold text-orange-400 mb-1">👟 Scarpa d’Oro {result.goldenTot.fin.sourceSeasonId}</p>
                                <p className="text-sm text-muted-foreground">Capocannoniere della stagione. Bonus <span className="font-bold text-orange-400">+{result.goldenTot.fin.delta} Finalizzazione</span> attivo per questa stagione.</p>
                              </PopoverContent>
                            </Popover>
                          )}
                          {/* Specialità — flex standard, cedono spazio se necessario */}
                          {specialties.map((specialty) => (
                            <SpecialtyBadge key={specialty.id} specialty={specialty} size={size} />
                          ))}
                        </div>
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
                      <AttributeBar
                        label="Finalizzazione"
                        value={result.finalAttributes.fin + (result.goldenTot?.fin?.delta ?? 0)}
                        bonusDelta={result.goldenTot?.fin?.delta}
                        bonusTooltip={
                          result.goldenTot?.fin
                            ? `Hai vinto la Scarpa d'Oro della stagione ${result.goldenTot.fin.sourceSeasonId}. Bonus +${result.goldenTot.fin.delta} alla Finalizzazione, valido per questa stagione.`
                            : undefined
                        }
                      />
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

                  {/* 🌟 SPECIALITÀ + PREMI - TRA ATTRIBUTI E STELLE */}
                  {(() => {
                    const specialties = usePlayerSpecialties(
                      result.finalAttributes,
                      null // Giocatori normali non hanno attributi portiere
                    );
                    const awardCount = (result.goldenTot?.playerCardTOT ? 1 : 0) + (result.goldenTot?.fin ? 1 : 0);
                    const totalCount = specialties.length + awardCount;
                    if (totalCount === 0) return null;

                    const size: 'xs' | 'sm' | 'md' = totalCount <= 2 ? 'md' : totalCount <= 4 ? 'sm' : 'xs';

                    return (
                      <div className="pt-4 border-t border-border/30">
                        <div className="text-xs text-muted-foreground mb-2">Specialità</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Premi stagionali — flex-shrink-0: non cedono spazio agli altri */}
                          {result.goldenTot?.playerCardTOT && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 font-semibold rounded-xl border bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30 transition-colors select-none">
                                  <span>🏆</span><span>Pallone d’Oro</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" side="top">
                                <p className="font-semibold text-yellow-400 mb-1">🏆 Pallone d’Oro {result.goldenTot.playerCardTOT.sourceSeasonId}</p>
                                <p className="text-sm text-muted-foreground">Miglior giocatore della stagione. Bonus <span className="font-bold text-yellow-400">+{result.goldenTot.playerCardTOT.delta} TOT</span> attivo per questa stagione.</p>
                              </PopoverContent>
                            </Popover>
                          )}
                          {result.goldenTot?.fin && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 font-semibold rounded-xl border bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30 transition-colors select-none">
                                  <span>👟</span><span>Scarpa d’Oro</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" side="top">
                                <p className="font-semibold text-orange-400 mb-1">👟 Scarpa d’Oro {result.goldenTot.fin.sourceSeasonId}</p>
                                <p className="text-sm text-muted-foreground">Capocannoniere della stagione. Bonus <span className="font-bold text-orange-400">+{result.goldenTot.fin.delta} Finalizzazione</span> attivo per questa stagione.</p>
                              </PopoverContent>
                            </Popover>
                          )}
                          {/* Specialità — flex standard, cedono spazio se necessario */}
                          {specialties.map((specialty) => (
                            <SpecialtyBadge key={specialty.id} specialty={specialty} size={size} />
                          ))}
                        </div>
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
    </div>
  );
}