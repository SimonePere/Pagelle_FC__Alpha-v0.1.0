/**
 * 🗳️ VOTE CARD - Componente Card Isolato per Votazioni
 * 
 * Basato sul design perfetto di MatchCard da MatchGrid.tsx
 * Riutilizzabile, flessibile e pronto per future features
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import {
  Calendar,
  Users,
  Vote as VotingIcon,
  CheckCircle2,
  Clock,
  Target,
  Gift,
  Send,
  Footprints,
  Hand,
  UserPlus,
  ThumbsUp,
  Sparkles,
  ArrowUpRight,
  Circle,
  Zap,
  Star,
  Trophy,
  Flame
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// 🎯 Props Interface per massima flessibilità
interface VoteCardProps {
  // 📊 Dati base della partita (identici a MatchCard)
  match: {
    id: string;
    date: string;
    status: 'completed' | 'active' | 'draft' | 'cancelled';
    playersCount?: number;      // 🏟️ Tipo di campo (5, 8, 11)
    teamMemberIds?: string[];
    teamMembers?: { id: string; name: string; }[];  // 🆕 Per mapping nomi
  };

  // 🗳️ Props specifiche per votazioni  
  voting?: {
    isVotable?: boolean;        // Se la card è votabile
    hasVoted?: boolean;         // Se l'utente ha già votato
    votingDeadline?: string;    // Scadenza votazione
    votingProgress?: number;    // % di voti ricevuti (0-100)
  };

  // ⚽ Match voting data (real API data)
  calculation?: {
    playerResults: Record<string, {
      averageRating: number;
      goals: number;
      assists: number;
      voteCount: number;
      badges?: string[];
    }>;
    totalVoters: number;
    sessionId: string;
    isOfficial: boolean;
  } | null;

  submissions?: Array<{
    voter: { id: string; name: string; };
    submissionInfo: { submittedAt: string; timeSpent?: number; };
    playerVotes: Array<{
      player: { id: string; name: string; };
      rating: number;
      goals: number;
      assists: number;
      comment?: string;
    }>;
  }>;

  isVotingLoading?: boolean;
  votingError?: string | null;

  // 🎨 Personalizzazione UI
  index?: number;              // Per animazioni staggered
  showVoteButton?: boolean;    // Mostra pulsante dedicato (CONSIGLIATO!)

  // 🎯 Eventi
  onClick?: (match: any) => void;        // Click su tutta la card
  onVoteClick?: (match: any) => void;    // Click specifico su "Vota"

  // 🎭 Future features (commentate)
  // showConfetti?: boolean;     // 🎊 Animazioni di successo
  // customBadges?: Badge[];     // 🏷️ Badge personalizzati
  // showProgress?: boolean;     // 📊 Progress bar votazioni
}

export const MatchDetailsCard: React.FC<VoteCardProps> = ({
  match,
  voting = {},
  calculation = null,
  submissions = [],
  isVotingLoading = false,
  votingError = null,
  index = 0,
  showVoteButton = true,    // 🎯 MODALITÀ PREFERITA: Pulsante dedicato di default!
  onClick,
  onVoteClick
}) => {

  // 🐛 DEBUG LOG - Match object completo
  // const [showIndividualRatings, setShowIndividualRatings] = useState(false);
  // const [showEditDialog, setShowEditDialog] = useState(false);





  // 🛡️ Controllo di sicurezza per l'oggetto match (identico a MatchCard)
  if (!match) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card p-4">
        <CardContent>
          <p className="text-muted-foreground">Dati partita non disponibili</p>
        </CardContent>
      </Card>
    );
  }

  // 📅 Formatta la data completa con controlli di sicurezza (identico a MatchCard)
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

  // 👥 Helper per mappare playerIds ai nomi (from match.teamMembers)
  const getPlayerName = (playerId: string) => {
    const member = match.teamMembers?.find(m => m.id === playerId);
    return member?.name || playerId; // Fallback al playerId se nome non trovato
  };

  // 🎨 Colori stati (identico a MatchCard)
  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'completed':
  //       return 'bg-green-500 text-green-50';
  //     case 'active':
  //       return 'bg-blue-500 text-blue-50';
  //     case 'draft':
  //       return 'bg-orange-500 text-orange-50';
  //     default:
  //       return 'bg-muted text-muted-foreground';
  //   }
  // };

  // 📝 Labels stati (identico a MatchCard)
  // const getStatusLabel = (status: string) => {
  //   switch (status) {
  //     case 'completed': return 'Completata';
  //     case 'active': return 'In Corso';
  //     case 'draft': return 'Creata';
  //     default: return status;
  //   }
  // };

  // 🗳️ Badge per stato votazione
  // const getVotingBadge = () => {
  //   if (!voting.isVotable) return null;
  //   
  //   if (voting.hasVoted) {
  //     return (
  //       <Badge className="bg-green-500 text-green-50">
  //         <CheckCircle2 className="w-3 h-3 mr-1" />
  //         Votato
  //       </Badge>
  //     );
  //   }
  //   
  //   return (
  //     <Badge className="bg-orange-500 text-orange-50">
  //       Pendente
  //     </Badge>
  //   );
  // };

  // 🎯 Handler per click (ottimizzato per modalità pulsante dedicato)
  const handleCardClick = () => {
    if (!showVoteButton && onVoteClick && voting.isVotable && !voting.hasVoted) {
      // Modalità legacy: click card = voto (se showVoteButton=false)
      onVoteClick(match);
    } else if (onClick) {
      // Modalità preferita: click card = info/navigazione
      onClick(match);
    }
  };

  const handleVoteButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita bubble su card click
    if (onVoteClick) {
      onVoteClick(match);
    }
  };


  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-400';
    if (rating >= 6.5) return 'text-primary';
    if (rating >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };


  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group"
      >
        <Card
          className=" bg-card/80 backdrop-blur-sm border-border shadow-card transition-all duration-300 relative"
          onClick={handleCardClick}
        >


          <CardHeader className=" ">
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
                {/* <div className="flex flex-col gap-2">
                <Badge className={getStatusColor(match.status)}>
                  {getStatusLabel(match.status)}
                </Badge>
                {getVotingBadge()}
              </div> */}
                {/* <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {match.teamMemberIds?.length || 0} giocatori
              </div> */}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 🗳️ Sezione Votazione (se votabile) */}
            {voting.isVotable && (
              <div className="space-y-3">


                {/* Giocatori Partecipanti */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    Giocatori Partecipanti
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    {match.teamMemberIds?.slice(0, 4).map((playerId, index) => {
                      // Nome completo del giocatore
                      const playerName = getPlayerName(playerId);

                      return (
                        <span
                          key={playerId}
                          className="px-3 py-2 bg-secondary/40 rounded-lg text-xs text-foreground border border-border/30 text-center"
                        >
                          {playerName}
                        </span>
                      );
                    })}
                    {(match.teamMemberIds?.length || 0) > 10 && (
                      <span className="px-3 py-2 bg-muted/40 rounded-lg text-xs text-muted-foreground border border-border/30 text-center">
                        +{(match.teamMemberIds?.length || 0) - 10}
                      </span>
                    )}
                  </div>
                </div>





              </div>
            )}


          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index * 0.05) + 0.1 }}
      >
        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 font-display text-2xl">

                Medie Finali
              </CardTitle>

            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* 🔄 Loading state */}
            {isVotingLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="animate-pulse">
                  <div className="h-24 bg-secondary/40 rounded-xl"></div>
                </div>
              </div>
            ) : votingError ? (
              /* ❌ Error state */
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  Errore nel caricamento delle medie: {votingError}
                </div>
              </div>
            ) : calculation?.playerResults && Object.keys(calculation.playerResults).length > 0 ? (
              /* ✅ Real data */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(calculation.playerResults).map(([playerId, result], idx) => (
                  <motion.div
                    key={playerId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 bg-secondary/40 rounded-xl border border-border/50 hover:bg-secondary/60 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display text-xl font-bold text-foreground">
                        {getPlayerName(playerId)}
                      </h3>

                      <span className={`text-3xl font-display font-bold ${getRatingColor(result.averageRating)}`}>
                        {result.averageRating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        ⚽ {result.goals}
                      </span>
                      <span className="flex items-center gap-1">
                        🎯 {result.assists}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* 📭 Empty state */
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  Nessun voto disponibile ancora
                </div>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Le medie finali appariranno dopo le votazioni
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index * 0.05) + 0.2 }}
      >
        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-3 font-display text-2xl">
              {/* <ArrowUpRight className="w-6 h-6 text-accent" /> */}
              Voti Individuali
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">

            <Accordion type="single" collapsible className="w-full space-y-2">

              {/* 🔄 Loading state */}
              {isVotingLoading ? (
                <div className="space-y-2">
                  <div className="animate-pulse">
                    <div className="h-12 bg-secondary/40 rounded-lg"></div>
                  </div>
                </div>
              ) : submissions.length > 0 ? (
                /* ✅ Real data - Dynamic AccordionItems */
                submissions.map((submission) => (
                  <AccordionItem
                    key={submission.voter.id}
                    value={submission.voter.id}
                    className="border border-border/50 rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-display text-lg font-bold text-foreground">
                          {submission.voter.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(submission.submissionInfo.submittedAt).toLocaleString('it-IT')}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      {/* Grid Voti Dati dal Votante */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {submission.playerVotes.map((vote) => (
                          <div
                            key={vote.player.id}
                            className="p-4 border bg-secondary/30 rounded-lg border-border/30"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-foreground">
                                {vote.player.name}
                              </span>

                              <span className={`text-3xl font-display font-bold ${getRatingColor(vote.rating)}`}>
                                {vote.rating.toFixed(1)}
                              </span>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>⚽ {vote.goals}</span>
                              <span>🎯 {vote.assists}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))
              ) : (
                /* 📭 Empty state */
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    Nessun voto individuale ancora
                  </div>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    I voti individuali appariranno dopo le votazioni
                  </p>
                </div>
              )}

            </Accordion>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default MatchDetailsCard;